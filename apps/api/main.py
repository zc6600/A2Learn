from __future__ import annotations

import json
import os
import re
import threading
import uuid
from collections.abc import Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, model_validator
from starlette.concurrency import run_in_threadpool

from agent.core.validate import validate_a2ui_messages
from agent.document.page_document import PageDocument
from agent.document.page_operations import PageOperationError
from agent.editor.agent import (
    build_page_editor_agent,
    build_page_question_agent,
)
from agent.editor.stream import stream_page_editor_agent
from agent.generation.action_response import build_action_response
from agent.generation.engine import run_agent
from agent.generation.llm import build_llm, build_page_editor_llm, plan_book_course
from agent.generation.media.image_generation import GeneratedImageStore
from agent.generation.media.narration import (
    audio_dir,
    rewrite_page_narration,
    synthesize,
)
from agent.generation.profile import normalize_generation_profile
from apps.api.agent_thread_store import (
    AgentThreadConflictError,
    AgentThreadNotFoundError,
    AgentThreadRecord,
    SqliteAgentThreadStore,
)
from apps.api.example_projects import (
    ExampleLanguage,
    load_example_documents,
    parse_messages_to_page_documents,
)
from apps.api.knowledge_store import (
    InvalidKnowledgeUploadError,
    KnowledgeSourceNotFoundError,
    KnowledgeSourceNotReadyError,
    KnowledgeStore,
)
from apps.api.course_store import CourseLessonNotFoundError, CourseNotFoundError, CourseStore
from apps.api.mcp_server import configure_mcp_publisher, mcp, mcp_http_app
from apps.api.page_document_store import (
    DocumentAlreadyExistsError,
    DocumentNotFoundError,
    RevisionConflictError,
    RevisionNotFoundError,
    build_page_document_store,
)
from apps.api.page_editor_checkpointer import (
    DEFAULT_CHECKPOINT_PATH,
    build_page_editor_checkpointer,
)
from apps.api.project_store import (
    ProjectAlreadyExistsError,
    ProjectNotFoundError,
    ProjectSource,
    build_project_store,
)
from apps.api.session_store import SessionState, SessionStore, build_session_store


class SessionStartRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources (file or directory)")
    resource_text: str | None = Field(default=None, description="Direct text input to use as teaching resource")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")
    generation_profile: dict[str, Any] | None = Field(default=None, alias="generationProfile")
    source_ids: list[str] = Field(default_factory=list, alias="sourceIds", max_length=10)
    resource_query: str | None = Field(default=None, alias="resourceQuery", max_length=1_000)


class SessionStartResponse(BaseModel):
    session_id: str
    mode: str = "online"
    # "pending" immediately after /start returns — the LLM pipeline keeps
    # running in a background thread (see SessionStore._run_generation) and
    # the caller must poll /api/session/{id}/status until this is "ready" or
    # "error". Kept synchronous+non-empty would routinely blow past
    # Cloudflare's ~100s edge timeout for a single request.
    status: str = "pending"
    messages: list[dict[str, Any]] = Field(default_factory=list)


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    messages: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None


class SessionActionRequest(BaseModel):
    action: dict[str, Any]


class SessionActionResponse(BaseModel):
    session_id: str
    messages: list[dict[str, Any]]
    action_count: int


class StatelessInitRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources")
    resource_text: str | None = Field(default=None, description="Direct text input")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")
    generation_profile: dict[str, Any] | None = Field(default=None, alias="generationProfile")
    source_ids: list[str] = Field(default_factory=list, alias="sourceIds", max_length=10)
    resource_query: str | None = Field(default=None, alias="resourceQuery", max_length=1_000)

class StatelessInitResponse(BaseModel):
    messages: list[dict[str, Any]]


class KnowledgeSourceResponse(BaseModel):
    source: dict[str, Any]


class KnowledgeSourceListResponse(BaseModel):
    sources: list[dict[str, Any]]


class KnowledgeChunkListResponse(BaseModel):
    chunks: list[dict[str, Any]]


class BookCoursePlanRequest(BaseModel):
    source_ids: list[str] = Field(alias="sourceIds", min_length=1, max_length=10)
    lesson_count: int = Field(alias="lessonCount", ge=1, le=100)
    language: Literal["zh", "en"] = "zh"


class BookCoursePlanResponse(BaseModel):
    course: dict[str, Any]


class BookCoursePlanningJobResponse(BaseModel):
    job: dict[str, Any]


class CourseLessonGenerationResponse(BaseModel):
    lesson: dict[str, Any]
    session_id: str = Field(alias="sessionId")


class ManualCourseLessonRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    page_start: int = Field(alias="pageStart", ge=1)
    page_end: int = Field(alias="pageEnd", ge=1)

    @model_validator(mode="after")
    def valid_range(self) -> "ManualCourseLessonRequest":
        if self.page_end < self.page_start:
            raise ValueError("pageEnd must be greater than or equal to pageStart.")
        if self.page_end - self.page_start >= 100:
            raise ValueError("A lesson may span at most 100 PDF pages.")
        return self


class ManualBookCourseRequest(BaseModel):
    source_id: str = Field(alias="sourceId", min_length=1)
    title: str = Field(min_length=1, max_length=300)
    language: Literal["zh", "en"] = "zh"
    lessons: list[ManualCourseLessonRequest] = Field(min_length=1, max_length=100)


class BatchLessonRequest(BaseModel):
    lesson_ids: list[str] = Field(alias="lessonIds", min_length=1, max_length=100)
    allow_over_limit: bool = Field(default=False, alias="allowOverLimit")


class BatchLessonResponse(BaseModel):
    lesson_count: int = Field(alias="lessonCount")
    estimated_input_tokens: int = Field(alias="estimatedInputTokens")
    safe_limit_tokens: int = Field(alias="safeLimitTokens")
    exceeds_safe_limit: bool = Field(alias="exceedsSafeLimit")
    lessons: list[dict[str, Any]]

class StatelessActionRequest(BaseModel):
    action: dict[str, Any]
    components: dict[str, dict[str, Any]] = Field(default_factory=dict, description="Current components state")
    surface_ids: list[str] = Field(default_factory=list, description="Current surface IDs")
    action_count: int = Field(default=0, description="Current action count")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")

class StatelessActionResponse(BaseModel):
    messages: list[dict[str, Any]]


class PageDocumentWriteRequest(BaseModel):
    document: dict[str, Any]
    actor: Literal["human", "ai"]
    summary: str | None = Field(default=None, max_length=500)
    base_revision: int | None = Field(default=None, alias="baseRevision")


class PageDocumentResponse(BaseModel):
    document: dict[str, Any]
    sync: dict[str, Any] | None = None


class PageDocumentHistoryResponse(BaseModel):
    changes: list[dict[str, Any]]


class PageOperationsRequest(BaseModel):
    actor: Literal["human", "ai"]
    base_revision: int = Field(alias="baseRevision", ge=1)
    operations: list[dict[str, Any]] = Field(min_length=1, max_length=100)
    summary: str | None = Field(default=None, max_length=500)


class PageDocumentRestoreRequest(BaseModel):
    actor: Literal["human", "ai"]
    summary: str | None = Field(default=None, max_length=500)


class PageEditorAgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)
    thread_id: str | None = Field(default=None, alias="threadId", max_length=200)


class ProjectEditorAgentRequest(PageEditorAgentRequest):
    surface_id: str | None = Field(default=None, alias="surfaceId", max_length=200)
    component_id: str | None = Field(default=None, alias="componentId", max_length=200)
    agent_mode: Literal["ask", "edit"] = Field(default="edit", alias="agentMode")
    approval_mode: Literal["direct", "review"] = Field(default="direct", alias="approvalMode")


class ProjectEditorAgentResumeRequest(BaseModel):
    thread_id: str = Field(alias="threadId", min_length=1, max_length=300)
    surface_id: str | None = Field(default=None, alias="surfaceId", max_length=200)
    agent_mode: Literal["ask", "edit"] = Field(default="edit", alias="agentMode")
    approval_mode: Literal["direct", "review"] = Field(default="direct", alias="approvalMode")
    decision: Literal["approve", "reject", "respond"] = "respond"
    response: str | None = Field(default=None, max_length=2_000)

    @model_validator(mode="after")
    def require_response_for_a_question(self) -> ProjectEditorAgentResumeRequest:
        if self.decision == "respond" and not (self.response and self.response.strip()):
            raise ValueError("response is required when decision is respond.")
        return self


class ProjectCreateRequest(BaseModel):
    project_id: str = Field(alias="projectId", min_length=1, max_length=200)
    source: ProjectSource = "generated"
    owner_id: str | None = Field(default=None, alias="ownerId", max_length=200)
    actor: Literal["human", "ai"]
    documents: list[dict[str, Any]] = Field(min_length=1, max_length=20)


class ProjectFromSessionRequest(BaseModel):
    session_id: str = Field(alias="sessionId", min_length=1, max_length=200)
    project_id: str | None = Field(default=None, alias="projectId", max_length=200)
    owner_id: str | None = Field(default=None, alias="ownerId", max_length=200)
    actor: Literal["human", "ai"] = "ai"


class ProjectResponse(BaseModel):
    project: dict[str, Any]
    documents: list[dict[str, Any]]


class ProjectHistoryResponse(BaseModel):
    changes: list[dict[str, Any]]


class ProjectRestoreRequest(PageDocumentRestoreRequest):
    document_id: str = Field(alias="documentId", min_length=1, max_length=300)
    revision: int = Field(ge=1)


class ProjectComponentPropsRequest(BaseModel):
    surface_id: str | None = Field(default=None, alias="surfaceId", max_length=200)
    props: dict[str, Any]
    replace_props: bool = Field(default=False, alias="replaceProps")
    summary: str | None = Field(default=None, max_length=500)


class ExampleProjectRequest(BaseModel):
    language: ExampleLanguage = "zh"
    example_id: str | None = Field(default=None, alias="exampleId", min_length=1, max_length=200)
    owner_id: str | None = Field(default=None, alias="ownerId", max_length=200)
    actor: Literal["human", "ai"] = "human"


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    async with mcp.session_manager.run():
        yield


app = FastAPI(title="A2Learn Session API", version="0.1.0", lifespan=_lifespan)
session_db_path = os.getenv("A2LEARN_SESSION_DB_PATH") or os.getenv("A2LEARN_PAGE_DOCUMENT_DB_PATH")
store = build_session_store(session_db_path)
# Set A2LEARN_PAGE_DOCUMENT_DB_PATH to use SQLite persistence.  Tests and the
# zero-config POC intentionally keep the lightweight in-memory repository.
page_document_store = build_page_document_store(os.getenv("A2LEARN_PAGE_DOCUMENT_DB_PATH"))
project_store = build_project_store(page_document_store, os.getenv("A2LEARN_PAGE_DOCUMENT_DB_PATH"))
configure_mcp_publisher(
    project_store,
    os.getenv("A2LEARN_VIEWER_PUBLIC_URL", "https://a2learn.zc6600.wiki"),
)
knowledge_store = KnowledgeStore.from_env()
course_store = CourseStore.from_env()
generated_image_store = GeneratedImageStore.from_env()
# Example narration is a static asset, separate from generated per-request
# audio. In production this points at the persistent Kamal volume; locally it
# falls back to the ignored files in the viewer source tree.
example_audio_dir = Path(
    os.getenv("A2LEARN_EXAMPLE_AUDIO_DIR", "apps/viewer/public/examples/audio")
).expanduser()
# Human-in-the-loop pauses must survive a process restart. If the PageDocument
# database is configured, keep checkpoints beside the documents; deployments
# may override this independently with A2LEARN_AGENT_CHECKPOINT_DB_PATH.
page_editor_checkpoint_path = (
    os.getenv("A2LEARN_AGENT_CHECKPOINT_DB_PATH")
    or os.getenv("A2LEARN_PAGE_DOCUMENT_DB_PATH")
    or DEFAULT_CHECKPOINT_PATH
)
page_editor_checkpointer = build_page_editor_checkpointer(page_editor_checkpoint_path)
agent_thread_store = SqliteAgentThreadStore(page_editor_checkpoint_path)


def _cors_allowed_origins() -> list[str]:
    raw = os.getenv("A2LEARN_ALLOWED_ORIGINS", "*")
    raw = raw.strip()
    if not raw:
        return ["*"]
    if raw == "*":
        return ["*"]
    parts = [p.strip() for p in raw.split(",")]
    origins = [p for p in parts if p]
    return origins or ["*"]


_allowed_origins = _cors_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials="*" not in _allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_resource_path(req_path: str | None) -> str:
    raw_root = os.getenv("A2LEARN_RESOURCE_ROOT", "./docs")
    root = Path(raw_root).expanduser().resolve()

    default_path = os.getenv("A2LEARN_DEFAULT_RESOURCE_PATH")
    if not default_path:
        default_path = str(root)

    chosen = req_path.strip() if req_path and req_path.strip() else default_path
    candidate = Path(chosen).expanduser()
    if candidate.is_absolute():
        candidate = candidate.resolve()
    else:
        candidate_cwd = (Path.cwd() / candidate).resolve()
        if candidate_cwd.exists():
            candidate = candidate_cwd
        else:
            candidate = (root / candidate).resolve()

    try:
        common = os.path.commonpath([str(candidate), str(root)])
    except ValueError:
        common = ""
    if common != str(root):
        raise HTTPException(status_code=400, detail="RESOURCE_PATH_OUT_OF_SCOPE")
    if not candidate.exists():
        raise HTTPException(status_code=400, detail=f"Resource path not found: {candidate}")
    return str(candidate)


def _resolve_generation_resource(
    resource_path: str | None,
    resource_text: str | None,
    source_ids: list[str],
    resource_query: str | None,
) -> tuple[str | None, str | None]:
    """Resolve one trusted source route without exposing local file paths."""
    if source_ids:
        if resource_path:
            raise HTTPException(status_code=422, detail="Use either sourceIds or resource_path, not both.")
        try:
            return None, knowledge_store.build_generation_context(source_ids, query=resource_query)
        except KnowledgeSourceNotFoundError as exc:
            raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc
        except KnowledgeSourceNotReadyError as exc:
            raise HTTPException(status_code=409, detail=f"KNOWLEDGE_SOURCE_NOT_READY: {exc}") from exc
    if resource_text:
        return None, resource_text
    if not resource_path and not os.getenv("A2LEARN_DEFAULT_RESOURCE_PATH"):
        raise HTTPException(status_code=400, detail="Either resource_path, resource_text, or sourceIds must be provided")
    return _resolve_resource_path(resource_path), None


def _require_session(session_id: str) -> SessionState:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
    return session


def _sync_plan_response(plan: Any) -> dict[str, Any]:
    return {"mode": plan.mode.value, "reason": plan.reason, "messages": plan.messages}


def _parse_page_document(raw: dict[str, Any]) -> PageDocument:
    try:
        return PageDocument.from_dict(raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


def _extract_api_key(
    authorization: str | None = None,
    x_openrouter_api_key: str | None = None,
    x_api_key: str | None = None,
) -> str | None:
    if x_openrouter_api_key and x_openrouter_api_key.strip():
        return x_openrouter_api_key.strip()
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
    if authorization and authorization.strip():
        raw = authorization.strip()
        if raw.lower().startswith("bearer "):
            return raw[7:].strip()
        return raw
    return None


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "A2Learn Session API"}


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/generated-images/{image_id}.png")
def get_generated_image(image_id: str) -> FileResponse:
    """Serve a cached automatic illustration without exposing its provider key."""
    if not re.fullmatch(r"[a-f0-9]{64}", image_id):
        raise HTTPException(status_code=404, detail="GENERATED_IMAGE_NOT_FOUND")
    image_path = generated_image_store.path_for(image_id)
    if not image_path.is_file():
        raise HTTPException(status_code=404, detail="GENERATED_IMAGE_NOT_FOUND")
    return FileResponse(
        image_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.get("/api/audio/{audio_id}.mp3")
def get_audio(audio_id: str) -> FileResponse:
    if not re.fullmatch(r"[a-f0-9]{64}", audio_id):
        raise HTTPException(status_code=404, detail="AUDIO_NOT_FOUND")
    path = audio_dir() / f"{audio_id}.mp3"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="AUDIO_NOT_FOUND")
    return FileResponse(path, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=31536000, immutable"})


EXAMPLE_AUDIO_FILES: dict[str, dict[str, str]] = {
    "hash-table": {
        "zh": "hash-table.zh.mp3",
        "en": "hash-table.en.mp3",
    },
}


@app.get("/api/example-audio/{example_id}.{language}.mp3")
def get_example_audio(example_id: str, language: Literal["zh", "en"]) -> FileResponse:
    """Serve a whitelisted bundled example narration from persistent storage."""
    filename = EXAMPLE_AUDIO_FILES.get(example_id, {}).get(language)
    if not filename:
        raise HTTPException(status_code=404, detail="EXAMPLE_AUDIO_NOT_FOUND")
    path = (example_audio_dir / filename).resolve()
    if not path.is_file() or path.parent != example_audio_dir.resolve():
        raise HTTPException(status_code=404, detail="EXAMPLE_AUDIO_NOT_FOUND")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.get("/examples/audio/{filename}")
def get_example_audio_by_filename(filename: str) -> FileResponse:
    """Serve a bundled example narration directly by filename."""
    if not re.fullmatch(r"^[a-zA-Z0-9_-]+\.(zh|en)\.mp3$", filename):
        raise HTTPException(status_code=404, detail="EXAMPLE_AUDIO_NOT_FOUND")
    path = (example_audio_dir / filename).resolve()
    if not path.is_file() or path.parent != example_audio_dir.resolve():
        raise HTTPException(status_code=404, detail="EXAMPLE_AUDIO_NOT_FOUND")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.post("/api/page-documents/{document_id}/narration")
async def generate_narration(
    document_id: str,
    language: Literal["zh", "en"] = "zh",
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    try:
        document = page_document_store.get(document_id)
        api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
        llm = build_page_editor_llm(api_key)
        script = await run_in_threadpool(rewrite_page_narration, document.to_dict(), llm=llm, language=language)
        audio_id, _ = await run_in_threadpool(synthesize, script, language=language, api_key=api_key)
        return {"script": script, "audioUrl": f"/api/audio/{audio_id}.mp3"}
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"NARRATION_FAILED: {_sanitize_error_message(exc)}") from exc
def _get_or_ensure_project(project_id: str) -> tuple[ProjectRecord, list[PageDocument]]:
    try:
        return project_store.get(project_id)
    except ProjectNotFoundError:
        pass

    # Try to auto-import if it's an example project or course lesson
    lang: Literal["zh", "en"] = "zh"
    example_id = project_id
    if project_id.startswith("example-zh-"):
        example_id = project_id[len("example-zh-") :]
        lang = "zh"
    elif project_id.startswith("example-en-"):
        example_id = project_id[len("example-en-") :]
        lang = "en"

    try:
        documents = load_example_documents(
            example_id,
            lang,
            document_project_id=project_id,
        )
        project = project_store.create(
            project_id,
            documents,
            source="example",
            owner_id=None,
            actor="human",
        )
        return project, documents
    except (FileNotFoundError, ValueError, KeyError):
        raise ProjectNotFoundError(f"Project not found: {project_id}")


@app.post("/api/projects/{project_id}/narration")
async def generate_project_narration(
    project_id: str,
    language: Literal["zh", "en"] = "zh",
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    try:
        _, documents = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc
    try:
        api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
        llm = build_page_editor_llm(api_key)
        combined_document = {
            "documentId": project_id,
            "revision": max((document.revision for document in documents), default=1),
            "surfaceId": "project",
            "components": [
                component
                for document in documents
                for component in document.to_dict().get("components", [])
            ],
        }
        script = await run_in_threadpool(rewrite_page_narration, combined_document, llm=llm, language=language)
        audio_id, _ = await run_in_threadpool(synthesize, script, language=language, api_key=api_key)
        return {"script": script, "audioUrl": f"/api/audio/{audio_id}.mp3"}
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"NARRATION_FAILED: {_sanitize_error_message(exc)}") from exc


@app.post("/api/knowledge/sources", response_model=KnowledgeSourceResponse, status_code=201)
def upload_knowledge_source(
    file: UploadFile = File(...),  # noqa: B008 - FastAPI declares multipart input this way.
    title: str | None = Form(default=None, max_length=300),
) -> KnowledgeSourceResponse:
    """Store an original source and synchronously create its first text rendition.

    Uploads that need an OCR/parser worker are retained and returned with an
    explicit status. They are never presented to generation as empty text.
    """
    try:
        source = knowledge_store.ingest_upload(file.file, file.filename, file.content_type, title)
        return KnowledgeSourceResponse(source=source.to_dict())
    except InvalidKnowledgeUploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        file.file.close()


@app.get("/api/knowledge/sources", response_model=KnowledgeSourceListResponse)
def list_knowledge_sources() -> KnowledgeSourceListResponse:
    return KnowledgeSourceListResponse(sources=[source.to_dict() for source in knowledge_store.list()])


@app.get("/api/knowledge/sources/{source_id}", response_model=KnowledgeSourceResponse)
def get_knowledge_source(source_id: str) -> KnowledgeSourceResponse:
    try:
        return KnowledgeSourceResponse(source=knowledge_store.get(source_id).to_dict())
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc


@app.get("/api/knowledge/sources/{source_id}/chunks", response_model=KnowledgeChunkListResponse)
def get_knowledge_source_chunks(source_id: str, query: str | None = None, limit: int = 20) -> KnowledgeChunkListResponse:
    try:
        return KnowledgeChunkListResponse(chunks=[chunk.to_dict() for chunk in knowledge_store.chunks(source_id, query, limit)])
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc


@app.get("/api/knowledge/sources/{source_id}/original")
def get_knowledge_source_original(source_id: str) -> FileResponse:
    """Serve a retained PDF inline for the reader-defined course editor."""
    try:
        source = knowledge_store.get(source_id)
        path = knowledge_store.original_file(source_id)
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc
    if path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=422, detail="KNOWLEDGE_SOURCE_NOT_A_PDF")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=source.filename,
        content_disposition_type="inline",
    )


@app.post("/api/book-courses/manual", response_model=BookCoursePlanResponse, status_code=201)
def create_manual_book_course(payload: ManualBookCourseRequest) -> BookCoursePlanResponse:
    """Persist reader-selected PDF ranges without asking an LLM to infer structure."""
    try:
        source = knowledge_store.get(payload.source_id)
        if source.extraction_status != "ready":
            raise KnowledgeSourceNotReadyError(source.error or "Source text is unavailable.")
        if source.page_count is not None and any(item.page_end > source.page_count for item in payload.lessons):
            raise ValueError(f"The source contains only {source.page_count} PDF pages.")
        course = course_store.create(
            source_ids=[payload.source_id], title=payload.title, summary="Reader-defined PDF ranges.",
            target_language=payload.language,
            lessons=[
                {"title": item.title, "objectives": [], "keyConcepts": [],
                 "sourcePages": list(range(item.page_start, item.page_end + 1))}
                for item in payload.lessons
            ],
        )
        return BookCoursePlanResponse(course=course.to_dict())
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc
    except KnowledgeSourceNotReadyError as exc:
        raise HTTPException(status_code=409, detail=f"KNOWLEDGE_SOURCE_NOT_READY: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_MANUAL_BOOK_COURSE: {exc}") from exc


def _batch_preview(course_id: str, lesson_ids: list[str]) -> tuple[Any, list[Any], int]:
    course = course_store.get(course_id)
    wanted = list(dict.fromkeys(lesson_ids))
    lessons = [course_store.get_lesson(course_id, lesson_id) for lesson_id in wanted]
    if len(lessons) != len(wanted):
        raise CourseLessonNotFoundError("lesson")
    # A conservative, model-agnostic estimate for mixed Chinese/English text.
    chars = sum(knowledge_store.estimate_pages(course.source_ids[0], list(lesson.source_pages)) for lesson in lessons)
    return course, lessons, max(1, (chars + 3) // 4)


def _batch_response(lessons: list[Any], tokens: int) -> BatchLessonResponse:
    safe_limit = 24_000
    return BatchLessonResponse(
        lessonCount=len(lessons), estimatedInputTokens=tokens, safeLimitTokens=safe_limit,
        exceedsSafeLimit=tokens > safe_limit, lessons=[lesson.to_dict() for lesson in lessons],
    )


@app.post("/api/book-courses/{course_id}/lessons/batch/preview", response_model=BatchLessonResponse)
def preview_book_course_lessons(course_id: str, payload: BatchLessonRequest) -> BatchLessonResponse:
    try:
        _, lessons, tokens = _batch_preview(course_id, payload.lesson_ids)
        return _batch_response(lessons, tokens)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_NOT_FOUND") from exc
    except CourseLessonNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_LESSON_NOT_FOUND") from exc
    except (KnowledgeSourceNotFoundError, KnowledgeSourceNotReadyError) as exc:
        raise HTTPException(status_code=409, detail=f"KNOWLEDGE_SOURCE_UNAVAILABLE: {exc}") from exc


@app.post("/api/book-courses/{course_id}/lessons/batch/generate", response_model=BatchLessonResponse, status_code=202)
def generate_book_course_lessons_batch(
    course_id: str,
    payload: BatchLessonRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> BatchLessonResponse:
    try:
        course, lessons, tokens = _batch_preview(course_id, payload.lesson_ids)
        response = _batch_response(lessons, tokens)
        if response.exceeds_safe_limit and not payload.allow_over_limit:
            raise HTTPException(status_code=409, detail={"code": "BATCH_INPUT_LIMIT_EXCEEDED", **response.model_dump(by_alias=True)})
        api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
        for lesson in lessons:
            query = " ".join((lesson.title, *lesson.objectives, *lesson.key_concepts))
            context = knowledge_store.build_lesson_context(list(course.source_ids), list(lesson.source_pages), query=query)
            session = store.create(resource_text=context, api_key=api_key, target_language=course.target_language)
            course_store.set_lesson_generation(course_id, lesson.lesson_id, session.session_id)
        return response
    except HTTPException:
        raise
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_NOT_FOUND") from exc
    except CourseLessonNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_LESSON_NOT_FOUND") from exc


@app.post("/api/book-courses", response_model=BookCoursePlanResponse, status_code=201)
def create_book_course_plan(
    payload: BookCoursePlanRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> BookCoursePlanResponse:
    """Plan a whole book first; individual lessons are generated separately."""
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        context = knowledge_store.build_course_planning_context(payload.source_ids)
        plan = plan_book_course(build_llm(api_key), context, payload.lesson_count, payload.language)
        lessons = plan.get("lessons")
        if not isinstance(lessons, list) or len(lessons) != payload.lesson_count:
            raise ValueError("Planner did not return the requested number of lessons.")
        course = course_store.create(
            source_ids=payload.source_ids,
            title=str(plan.get("title") or "Untitled course"),
            summary=str(plan.get("summary") or ""),
            target_language=payload.language,
            lessons=lessons,
        )
        return BookCoursePlanResponse(course=course.to_dict())
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc
    except KnowledgeSourceNotReadyError as exc:
        raise HTTPException(status_code=409, detail=f"KNOWLEDGE_SOURCE_NOT_READY: {exc}") from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_BOOK_COURSE_PLAN: {exc}") from exc


def _run_book_course_plan(job_id: str, payload: BookCoursePlanRequest, api_key: str | None) -> None:
    try:
        context = knowledge_store.build_course_planning_context(payload.source_ids)
        plan = plan_book_course(build_llm(api_key), context, payload.lesson_count, payload.language)
        lessons = plan.get("lessons")
        if not isinstance(lessons, list) or len(lessons) != payload.lesson_count:
            raise ValueError("Planner did not return the requested number of lessons.")
        course = course_store.create(
            source_ids=payload.source_ids, title=str(plan.get("title") or "Untitled course"),
            summary=str(plan.get("summary") or ""), target_language=payload.language, lessons=lessons,
        )
        course_store.complete_planning_job(job_id, course.course_id)
    except Exception as exc:  # Retain failure for polling; do not lose it in a thread traceback.
        course_store.fail_planning_job(job_id, str(exc))


@app.post("/api/book-course-jobs", response_model=BookCoursePlanningJobResponse, status_code=202)
def queue_book_course_plan(
    payload: BookCoursePlanRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> BookCoursePlanningJobResponse:
    job = course_store.create_planning_job()
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    threading.Thread(target=_run_book_course_plan, args=(job.job_id, payload, api_key), daemon=True).start()
    return BookCoursePlanningJobResponse(job=job.to_dict())


@app.get("/api/book-course-jobs/{job_id}", response_model=BookCoursePlanningJobResponse)
def get_book_course_planning_job(job_id: str) -> BookCoursePlanningJobResponse:
    try:
        return BookCoursePlanningJobResponse(job=course_store.get_planning_job(job_id).to_dict())
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_JOB_NOT_FOUND") from exc


@app.get("/api/book-courses/{course_id}", response_model=BookCoursePlanResponse)
def get_book_course_plan(course_id: str) -> BookCoursePlanResponse:
    try:
        return BookCoursePlanResponse(course=course_store.get(course_id).to_dict())
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_NOT_FOUND") from exc


@app.post("/api/book-courses/{course_id}/lessons/{lesson_id}/generate", response_model=CourseLessonGenerationResponse)
def generate_book_course_lesson(
    course_id: str,
    lesson_id: str,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> CourseLessonGenerationResponse:
    """Queue one lesson through the existing asynchronous generator."""
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        course = course_store.get(course_id)
        lesson = course_store.get_lesson(course_id, lesson_id)
        if lesson.status == "generating" and lesson.session_id:
            return CourseLessonGenerationResponse(lesson=lesson.to_dict(), sessionId=lesson.session_id)
        query = " ".join((lesson.title, *lesson.objectives, *lesson.key_concepts))
        context = knowledge_store.build_lesson_context(
            list(course.source_ids), list(lesson.source_pages), query=query
        )
        session = store.create(resource_text=context, api_key=api_key, target_language=course.target_language)
        updated = course_store.set_lesson_generation(course_id, lesson_id, session.session_id)
        return CourseLessonGenerationResponse(lesson=updated.to_dict(), sessionId=session.session_id)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_NOT_FOUND") from exc
    except CourseLessonNotFoundError as exc:
        raise HTTPException(status_code=404, detail="BOOK_COURSE_LESSON_NOT_FOUND") from exc
    except KnowledgeSourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="KNOWLEDGE_SOURCE_NOT_FOUND") from exc
    except KnowledgeSourceNotReadyError as exc:
        raise HTTPException(status_code=409, detail=f"KNOWLEDGE_SOURCE_NOT_READY: {exc}") from exc


@app.post("/api/page-documents", response_model=PageDocumentResponse, status_code=201)
def create_page_document(payload: PageDocumentWriteRequest) -> PageDocumentResponse:
    document = _parse_page_document(payload.document)
    try:
        saved, plan = page_document_store.create(document, actor=payload.actor, summary=payload.summary)
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="PAGE_DOCUMENT_ALREADY_EXISTS") from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


@app.get("/api/page-documents/{document_id}", response_model=PageDocumentResponse)
def get_page_document(document_id: str) -> PageDocumentResponse:
    try:
        document = page_document_store.get(document_id)
        return PageDocumentResponse(document=document.to_dict())
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.post("/api/projects", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreateRequest) -> ProjectResponse:
    documents = [_parse_page_document(raw) for raw in payload.documents]
    try:
        project = project_store.create(
            payload.project_id,
            documents,
            source=payload.source,
            owner_id=payload.owner_id,
            actor=payload.actor,
        )
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except ProjectAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="PROJECT_ALREADY_EXISTS") from exc
    except DocumentAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=f"PAGE_DOCUMENT_ALREADY_EXISTS: {exc}") from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PROJECT: {exc}") from exc


@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str) -> ProjectResponse:
    try:
        project, documents = _get_or_ensure_project(project_id)
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc


@app.post("/api/projects/{project_id}/ensure-example", response_model=ProjectResponse)
def ensure_example_project(project_id: str, payload: ExampleProjectRequest) -> ProjectResponse:
    try:
        project, documents = project_store.get(project_id)
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except ProjectNotFoundError:
        pass

    try:
        documents = load_example_documents(
            payload.example_id or project_id,
            payload.language,
            document_project_id=project_id,
        )
        project = project_store.create(
            project_id,
            documents,
            source="example",
            owner_id=payload.owner_id,
            actor=payload.actor,
        )
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="EXAMPLE_SOURCE_NOT_FOUND") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_EXAMPLE_PROJECT: {exc}") from exc


@app.post("/api/projects/from-session", response_model=ProjectResponse, status_code=201)
def create_project_from_session(payload: ProjectFromSessionRequest) -> ProjectResponse:
    session = _require_session(payload.session_id)
    if session.status != "ready" or not session.messages:
        raise HTTPException(status_code=400, detail="SESSION_NOT_READY")

    project_id = payload.project_id or f"project-{payload.session_id}"
    try:
        project, documents = project_store.get(project_id)
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except ProjectNotFoundError:
        pass

    documents = parse_messages_to_page_documents(session.messages, project_id)
    if not documents:
        raise HTTPException(status_code=422, detail="SESSION_HAS_NO_VALID_SURFACES")

    try:
        project = project_store.create(
            project_id,
            documents,
            source="generated",
            owner_id=payload.owner_id,
            actor=payload.actor,
        )
        return ProjectResponse(project=project.to_dict(), documents=[document.to_dict() for document in documents])
    except ProjectAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="PROJECT_ALREADY_EXISTS") from exc


@app.get("/api/projects/{project_id}/history", response_model=ProjectHistoryResponse)
def get_project_history(project_id: str, surface_id: str | None = None) -> ProjectHistoryResponse:
    try:
        _get_or_ensure_project(project_id)
        changes = project_store.history(project_id)
        if surface_id:
            _, documents = _get_or_ensure_project(project_id)
            document_ids = {document.document_id for document in documents if document.surface_id == surface_id}
            changes = [change for change in changes if change.get("documentId") in document_ids]
        return ProjectHistoryResponse(changes=changes)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc


@app.post("/api/projects/{project_id}/restore", response_model=PageDocumentResponse)
def restore_project_document(project_id: str, payload: ProjectRestoreRequest) -> PageDocumentResponse:
    try:
        project, _ = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc
    if payload.document_id not in project.document_ids:
        raise HTTPException(status_code=404, detail="PROJECT_DOCUMENT_NOT_FOUND")
    try:
        document, plan = page_document_store.restore(
            payload.document_id,
            payload.revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=document.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_REVISION_NOT_FOUND") from exc


@app.post("/api/projects/{project_id}/components/{component_id}", response_model=PageDocumentResponse)
def update_project_component_props(
    project_id: str,
    component_id: str,
    payload: ProjectComponentPropsRequest,
) -> PageDocumentResponse:
    try:
        _, documents = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc
    target = next((document for document in documents if document.surface_id == payload.surface_id), None)
    if target is None:
        target = documents[0] if documents else None
    if target is None:
        raise HTTPException(status_code=404, detail="PROJECT_HAS_NO_SURFACES")
    try:
        document, plan = page_document_store.apply_operations(
            target.document_id,
            [
                {
                    "op": "replace_props" if payload.replace_props else "set_props",
                    "component_id": component_id,
                    "props": payload.props,
                }
            ],
            base_revision=target.revision,
            actor="human",
            summary=payload.summary or f"Manual edit {component_id}",
        )
        return PageDocumentResponse(document=document.to_dict(), sync=_sync_plan_response(plan))
    except PageOperationError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_OPERATION: {exc}") from exc
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "PAGE_DOCUMENT_REVISION_CONFLICT", "currentRevision": exc.current_revision},
        ) from exc


@app.get("/api/projects/{project_id}/a2ui")
def get_project_a2ui(project_id: str) -> dict[str, Any]:
    try:
        _, documents = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc

    plans = [page_document_store.snapshot(document.document_id) for document in documents]
    return {
        "mode": "snapshot",
        "reason": "project renderer synchronization",
        "messages": [message for plan in plans for message in plan.messages],
    }


@app.post("/api/projects/{project_id}/agent")
def run_project_editor_agent(
    project_id: str,
    payload: ProjectEditorAgentRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StreamingResponse:
    try:
        _, documents = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc
    target = next((document for document in documents if document.surface_id == payload.surface_id), None)
    if target is None:
        target = documents[0] if documents else None
    if target is None:
        raise HTTPException(status_code=404, detail="PROJECT_HAS_NO_SURFACES")

    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        agent = (
            build_page_question_agent(api_key, checkpointer=page_editor_checkpointer)
            if payload.agent_mode == "ask"
            else build_page_editor_agent(
                api_key,
                checkpointer=page_editor_checkpointer,
                review_before_apply=payload.approval_mode == "review",
            )
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=f"PAGE_EDITOR_AGENT_UNAVAILABLE: {exc}") from exc

    thread_id = payload.thread_id or f"project_{project_id}_{uuid.uuid4().hex}"
    requested_thread = AgentThreadRecord(
        thread_id=thread_id,
        project_id=project_id,
        document_id=target.document_id,
        surface_id=target.surface_id,
        approval_mode=payload.approval_mode,
        agent_mode=payload.agent_mode,
    )
    try:
        stored_thread = agent_thread_store.create_or_get(requested_thread)
    except AgentThreadConflictError as exc:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_CONFLICT") from exc
    if stored_thread != requested_thread:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_CONTEXT_MISMATCH")

    def events() -> Iterator[str]:
        try:
            for event in stream_page_editor_agent(
                agent,
                payload.message,
                document_id=target.document_id,
                user_id="anonymous",
                page_document_store=page_document_store,
                thread_id=thread_id,
                selected_component_id=payload.component_id,
                api_key=api_key,
            ):
                yield _encode_sse(event.event, event.data)
        except Exception as exc:  # noqa: BLE001 - provider errors can occur after response headers are sent.
            yield _encode_sse("error", {"message": _sanitize_error_message(exc)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/projects/{project_id}/agent/resume")
def resume_project_editor_agent(
    project_id: str,
    payload: ProjectEditorAgentResumeRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StreamingResponse:
    try:
        _, documents = _get_or_ensure_project(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PROJECT_NOT_FOUND") from exc
    try:
        thread = agent_thread_store.get(payload.thread_id)
    except AgentThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail="AGENT_THREAD_NOT_FOUND") from exc
    if thread.project_id != project_id:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_CONTEXT_MISMATCH")
    if payload.surface_id and payload.surface_id != thread.surface_id:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_CONTEXT_MISMATCH")
    if payload.approval_mode != thread.approval_mode:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_POLICY_MISMATCH")
    if payload.agent_mode != thread.agent_mode:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_POLICY_MISMATCH")
    target = next((document for document in documents if document.document_id == thread.document_id), None)
    if target is None:
        raise HTTPException(status_code=409, detail="AGENT_THREAD_CONTEXT_MISMATCH")

    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        agent = (
            build_page_question_agent(api_key, checkpointer=page_editor_checkpointer)
            if thread.agent_mode == "ask"
            else build_page_editor_agent(
                api_key,
                checkpointer=page_editor_checkpointer,
                review_before_apply=thread.approval_mode == "review",
            )
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=f"PAGE_EDITOR_AGENT_UNAVAILABLE: {exc}") from exc

    def events() -> Iterator[str]:
        try:
            for event in stream_page_editor_agent(
                agent,
                None,
                document_id=target.document_id,
                user_id="anonymous",
                page_document_store=page_document_store,
                thread_id=payload.thread_id,
                human_response=payload.response,
                human_decision=payload.decision,
                api_key=api_key,
            ):
                yield _encode_sse(event.event, event.data)
        except Exception as exc:  # noqa: BLE001 - provider errors can occur after response headers are sent.
            yield _encode_sse("error", {"message": _sanitize_error_message(exc)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/page-documents/{document_id}/revisions/{revision}", response_model=PageDocumentResponse)
def get_page_document_revision(document_id: str, revision: int) -> PageDocumentResponse:
    try:
        document = page_document_store.get_revision(document_id, revision)
        return PageDocumentResponse(document=document.to_dict())
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_REVISION_NOT_FOUND") from exc


@app.post("/api/page-documents/{document_id}/revisions/{revision}/restore", response_model=PageDocumentResponse)
def restore_page_document_revision(
    document_id: str,
    revision: int,
    payload: PageDocumentRestoreRequest,
) -> PageDocumentResponse:
    try:
        document, plan = page_document_store.restore(
            document_id,
            revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=document.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_REVISION_NOT_FOUND") from exc


@app.put("/api/page-documents/{document_id}", response_model=PageDocumentResponse)
def update_page_document(document_id: str, payload: PageDocumentWriteRequest) -> PageDocumentResponse:
    if payload.base_revision is None:
        raise HTTPException(status_code=422, detail="baseRevision is required for updates.")
    document = _parse_page_document(payload.document)
    try:
        saved, plan = page_document_store.update(
            document_id,
            document,
            base_revision=payload.base_revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "PAGE_DOCUMENT_REVISION_CONFLICT", "currentRevision": exc.current_revision},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


@app.post("/api/page-documents/{document_id}/operations", response_model=PageDocumentResponse)
def apply_page_document_operations(document_id: str, payload: PageOperationsRequest) -> PageDocumentResponse:
    try:
        saved, plan = page_document_store.apply_operations(
            document_id,
            payload.operations,
            base_revision=payload.base_revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "PAGE_DOCUMENT_REVISION_CONFLICT", "currentRevision": exc.current_revision},
        ) from exc
    except PageOperationError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_OPERATION: {exc}") from exc


def _sanitize_error_message(exc: Exception) -> str:
    msg = str(exc)
    msg = re.sub(r"/(?:[a-zA-Z0-9_\.-]+/)+[a-zA-Z0-9_\.-]+", "[path]", msg)
    msg = re.sub(r"sk-[a-zA-Z0-9_-]{20,}", "[redacted_key]", msg)
    return msg


def _encode_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/page-documents/{document_id}/agent")
def run_page_document_editor_agent(
    document_id: str,
    payload: PageEditorAgentRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StreamingResponse:
    try:
        page_document_store.get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc

    thread_id = payload.thread_id or f"editor_{document_id}_{uuid.uuid4().hex}"
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        agent = build_page_editor_agent(api_key, checkpointer=page_editor_checkpointer)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=f"PAGE_EDITOR_AGENT_UNAVAILABLE: {exc}") from exc

    def events() -> Iterator[str]:
        try:
            for event in stream_page_editor_agent(
                agent,
                payload.message,
                document_id=document_id,
                # Authentication has not yet been introduced to this POC. Do
                # not accept an arbitrary user id from the caller; use a
                # neutral value until middleware derives it from verified
                # auth claims.
                user_id="anonymous",
                page_document_store=page_document_store,
                thread_id=thread_id,
                api_key=api_key,
            ):
                yield _encode_sse(event.event, event.data)
        except Exception as exc:  # noqa: BLE001 - provider errors can occur after response headers are sent.
            yield _encode_sse("error", {"message": _sanitize_error_message(exc)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/page-documents/{document_id}/a2ui")
def page_document_a2ui_snapshot(document_id: str) -> dict[str, Any]:
    try:
        return _sync_plan_response(page_document_store.snapshot(document_id))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.get("/api/page-documents/{document_id}/history", response_model=PageDocumentHistoryResponse)
def page_document_history(document_id: str) -> PageDocumentHistoryResponse:
    try:
        return PageDocumentHistoryResponse(changes=[change.to_dict() for change in page_document_store.history(document_id)])
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.post("/api/session/start", response_model=SessionStartResponse)
def start_session(
    payload: SessionStartRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> SessionStartResponse:
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    resource_path, resource_text = _resolve_generation_resource(
        payload.resource_path,
        payload.resource_text or os.getenv("A2LEARN_DEFAULT_RESOURCE_TEXT"),
        payload.source_ids,
        payload.resource_query,
    )

    try:
        normalize_generation_profile(payload.generation_profile)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
        
    try:
        session = store.create(
            resource_path=resource_path,
            resource_text=resource_text,
            api_key=api_key,
            target_language=payload.language,
            generation_profile=payload.generation_profile,
        )
        return SessionStartResponse(session_id=session.session_id, status=session.status, messages=session.messages)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SESSION_START_FAILED: {exc}") from exc


@app.get("/api/session/{session_id}/status", response_model=SessionStatusResponse)
def session_status(session_id: str) -> SessionStatusResponse:
    session = _require_session(session_id)
    return SessionStatusResponse(
        session_id=session.session_id,
        status=session.status,
        messages=session.messages if session.status == "ready" else [],
        error=session.error,
    )


@app.post("/api/session/{session_id}/action", response_model=SessionActionResponse)
def handle_action(session_id: str, payload: SessionActionRequest) -> SessionActionResponse:
    session = _require_session(session_id)
    try:
        session.action_count += 1
        messages = build_action_response(
            action=payload.action,
            components=session.components,
            component_surfaces=session.component_surfaces,
            surface_ids=session.surface_ids,
            action_count=session.action_count,
            target_language=session.target_language,
        )
        if messages:
            validate_a2ui_messages(messages, require_create_surface=False)
            store.append_messages(session, messages)
        return SessionActionResponse(
            session_id=session.session_id,
            messages=messages,
            action_count=session.action_count,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ACTION_HANDLE_FAILED: {exc}") from exc


@app.post("/api/stateless/init", response_model=StatelessInitResponse)
def stateless_init(
    payload: StatelessInitRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StatelessInitResponse:
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    resource_path, resource_text = _resolve_generation_resource(
        payload.resource_path,
        payload.resource_text or os.getenv("A2LEARN_DEFAULT_RESOURCE_TEXT"),
        payload.source_ids,
        payload.resource_query,
    )

    try:
        normalize_generation_profile(payload.generation_profile)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
        
    try:
        mode = os.getenv("A2LEARN_MODE", "agent")
        state = run_agent(
            resource_path=resource_path,
            resource_text=resource_text,
            mode=mode,
            api_key=api_key,
            target_language=payload.language,
            generation_profile=payload.generation_profile,
        )
        messages = SessionStore._extract_messages(state)
        validate_a2ui_messages(messages)
        return StatelessInitResponse(messages=messages)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"STATELESS_INIT_FAILED: {exc}") from exc


@app.post("/api/stateless/action", response_model=StatelessActionResponse)
def stateless_action(payload: StatelessActionRequest) -> StatelessActionResponse:
    try:
        messages = build_action_response(
            action=payload.action,
            components=payload.components,
            surface_ids=payload.surface_ids,
            action_count=payload.action_count + 1,
            target_language=payload.language,
        )
        if messages:
            validate_a2ui_messages(messages, require_create_surface=False)
        return StatelessActionResponse(messages=messages or [])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"STATELESS_ACTION_FAILED: {exc}") from exc


# Keep this mount after the normal application routes.  The MCP app itself
# owns the /mcp route, so mounting it at / avoids the /mcp -> /mcp/ redirect
# produced by mounting a slash-rooted sub-application at /mcp.
app.mount("/", mcp_http_app)
