"""Private source library for NotebookLM-style, citation-aware ingestion.

The original binary is retained beside a normalized, chunked text rendition.
Native text is preferred whenever possible; scanned PDFs and images explicitly
enter ``needs_ocr`` instead of silently producing an empty source.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import sqlite3
import subprocess
import uuid
from contextlib import closing
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_CONTEXT_CHARS = 12_000
TEXT_SUFFIXES = {".txt", ".md", ".markdown", ".html", ".htm", ".json", ".yaml", ".yml", ".csv"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp"}
SUPPORTED_SUFFIXES = TEXT_SUFFIXES | IMAGE_SUFFIXES | {".pdf", ".docx", ".epub"}


class KnowledgeSourceNotFoundError(KeyError):
    pass


class KnowledgeSourceNotReadyError(ValueError):
    pass


class InvalidKnowledgeUploadError(ValueError):
    pass


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _safe_filename(name: str | None) -> str:
    candidate = Path(name or "upload").name
    if not candidate or candidate in {".", ".."}:
        return "upload"
    return re.sub(r"[^A-Za-z0-9._ -]", "_", candidate)[:180]


def _plain_text(text: str) -> str:
    """Collapse markup enough for retrieval while preserving paragraph breaks."""
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()


@dataclass(frozen=True)
class KnowledgeSource:
    source_id: str
    title: str
    filename: str
    media_type: str | None
    size_bytes: int
    checksum: str
    extraction_mode: str
    extraction_status: str
    page_count: int | None
    chunk_count: int
    error: str | None
    created_at: str

    def to_dict(self) -> dict[str, object]:
        return {
            "sourceId": self.source_id,
            "title": self.title,
            "filename": self.filename,
            "mediaType": self.media_type,
            "sizeBytes": self.size_bytes,
            "checksum": self.checksum,
            "extractionMode": self.extraction_mode,
            "extractionStatus": self.extraction_status,
            "pageCount": self.page_count,
            "chunkCount": self.chunk_count,
            "error": self.error,
            "createdAt": self.created_at,
        }


@dataclass(frozen=True)
class KnowledgeChunk:
    chunk_id: str
    source_id: str
    ordinal: int
    page_start: int | None
    page_end: int | None
    heading: str | None
    content: str

    def to_dict(self) -> dict[str, object]:
        return {
            "chunkId": self.chunk_id,
            "sourceId": self.source_id,
            "ordinal": self.ordinal,
            "pageStart": self.page_start,
            "pageEnd": self.page_end,
            "heading": self.heading,
            "content": self.content,
        }


class KnowledgeStore:
    """SQLite metadata store with local, private original-file storage.

    Object storage can replace ``storage_root`` later without changing API
    semantics because callers only use source IDs and never filesystem paths.
    """

    def __init__(self, db_path: str | Path, storage_root: str | Path) -> None:
        self.db_path = Path(db_path)
        self.storage_root = Path(storage_root)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @classmethod
    def from_env(cls) -> KnowledgeStore:
        return cls(
            os.getenv("A2LEARN_KNOWLEDGE_DB_PATH", "./data/a2learn-knowledge.sqlite3"),
            os.getenv("A2LEARN_KNOWLEDGE_STORAGE_ROOT", "./data/knowledge-files"),
        )

    def _connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with closing(self._connection()) as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS knowledge_sources (
                    source_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    media_type TEXT,
                    storage_path TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    checksum TEXT NOT NULL,
                    extraction_mode TEXT NOT NULL,
                    extraction_status TEXT NOT NULL,
                    page_count INTEGER,
                    error TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS knowledge_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL REFERENCES knowledge_sources(source_id),
                    ordinal INTEGER NOT NULL,
                    page_start INTEGER,
                    page_end INTEGER,
                    heading TEXT,
                    content TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS knowledge_chunks_source_ordinal
                    ON knowledge_chunks(source_id, ordinal);
                """
            )
            connection.commit()

    def ingest_upload(self, stream: BinaryIO, filename: str | None, media_type: str | None, title: str | None = None) -> KnowledgeSource:
        safe_name = _safe_filename(filename)
        suffix = Path(safe_name).suffix.lower()
        if suffix not in SUPPORTED_SUFFIXES:
            raise InvalidKnowledgeUploadError(
                "Unsupported file type. Upload PDF, EPUB, DOCX, text/Markdown, HTML, JSON, CSV, YAML, or an image."
            )

        source_id = f"src_{uuid.uuid4().hex[:16]}"
        destination = self.storage_root / f"{source_id}-{safe_name}"
        temporary = destination.with_suffix(destination.suffix + ".uploading")
        digest = hashlib.sha256()
        size = 0
        try:
            with temporary.open("wb") as output:
                while block := stream.read(1024 * 1024):
                    size += len(block)
                    if size > MAX_UPLOAD_BYTES:
                        raise InvalidKnowledgeUploadError("File exceeds the 50 MB upload limit.")
                    digest.update(block)
                    output.write(block)
            temporary.replace(destination)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise

        extraction_mode, status, pages, extracted_pages, error = self._extract(destination, suffix)
        chunks = self._chunk_pages(extracted_pages) if status == "ready" else []
        source = KnowledgeSource(
            source_id=source_id,
            title=(title or Path(safe_name).stem).strip()[:300] or "Untitled source",
            filename=safe_name,
            media_type=media_type,
            size_bytes=size,
            checksum=digest.hexdigest(),
            extraction_mode=extraction_mode,
            extraction_status=status,
            page_count=pages,
            chunk_count=len(chunks),
            error=error,
            created_at=_now_iso(),
        )
        self._save(source, str(destination), chunks)
        return source

    def _extract(self, path: Path, suffix: str) -> tuple[str, str, int | None, list[tuple[int | None, str]], str | None]:
        if suffix in TEXT_SUFFIXES:
            raw = path.read_text(encoding="utf-8", errors="ignore")
            text = _plain_text(raw) if suffix in {".html", ".htm"} else raw.strip()
            if not text:
                return "native_text", "failed", 1, [], "The file did not contain readable text."
            return "native_text", "ready", 1, [(1, text)], None
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader
            except ImportError:
                return "native_pdf", "needs_parser", None, [], "PDF parsing dependency is not installed."
            try:
                reader = PdfReader(str(path))
                pages = [(index, (page.extract_text() or "").strip()) for index, page in enumerate(reader.pages, start=1)]
            except Exception as exc:  # noqa: BLE001 - pypdf exposes several parse exceptions.
                return "native_pdf", "failed", None, [], f"PDF parsing failed: {exc}"
            readable = [(number, text) for number, text in pages if text]
            if sum(len(text) for _, text in readable) < 80:
                return "ocr", "needs_ocr", len(pages), [], "This PDF appears to be scanned; OCR is required."
            return "native_pdf", "ready", len(pages), readable, None
        if suffix in IMAGE_SUFFIXES:
            return self._extract_image_ocr(path)
        return "document", "needs_parser", None, [], f"{suffix[1:].upper()} extraction worker is not configured yet."

    def _extract_image_ocr(self, path: Path) -> tuple[str, str, int | None, list[tuple[int | None, str]], str | None]:
        executable = shutil.which("tesseract")
        if not executable:
            return "ocr", "needs_ocr", 1, [], "Tesseract is not installed; schedule this source on an OCR worker."
        language = os.getenv("A2LEARN_OCR_LANGUAGE", "eng")
        try:
            result = subprocess.run(
                [executable, str(path), "stdout", "-l", language],
                text=True,
                capture_output=True,
                timeout=90,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            return "ocr", "needs_ocr", 1, [], f"OCR could not run: {exc}"
        text = result.stdout.strip()
        if result.returncode != 0 or not text:
            return "ocr", "needs_ocr", 1, [], (result.stderr.strip() or "OCR returned no text.")
        return "ocr", "ready", 1, [(1, text)], None

    @staticmethod
    def _chunk_pages(pages: list[tuple[int | None, str]], target_size: int = 1_200) -> list[KnowledgeChunk]:
        chunks: list[KnowledgeChunk] = []
        ordinal = 0
        for page, raw in pages:
            paragraphs = [part.strip() for part in re.split(r"\n\s*\n|(?<=[.!?。！？])\s+", raw) if part.strip()]
            current = ""
            for paragraph in paragraphs or [raw]:
                if current and len(current) + len(paragraph) + 2 > target_size:
                    chunks.append(KnowledgeChunk(f"chk_{uuid.uuid4().hex[:16]}", "", ordinal, page, page, None, current))
                    ordinal += 1
                    current = ""
                current = f"{current}\n\n{paragraph}".strip()
            if current:
                chunks.append(KnowledgeChunk(f"chk_{uuid.uuid4().hex[:16]}", "", ordinal, page, page, None, current))
                ordinal += 1
        return chunks

    def _save(self, source: KnowledgeSource, storage_path: str, chunks: list[KnowledgeChunk]) -> None:
        with closing(self._connection()) as connection:
            connection.execute(
                """INSERT INTO knowledge_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (source.source_id, source.title, source.filename, source.media_type, storage_path, source.size_bytes,
                 source.checksum, source.extraction_mode, source.extraction_status, source.page_count, source.error, source.created_at),
            )
            connection.executemany(
                """INSERT INTO knowledge_chunks VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [(chunk.chunk_id, source.source_id, chunk.ordinal, chunk.page_start, chunk.page_end, chunk.heading, chunk.content) for chunk in chunks],
            )
            connection.commit()

    def _source_from_row(self, connection: sqlite3.Connection, row: sqlite3.Row) -> KnowledgeSource:
        count = connection.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE source_id = ?", (row["source_id"],)).fetchone()[0]
        return KnowledgeSource(
            source_id=row["source_id"], title=row["title"], filename=row["filename"], media_type=row["media_type"],
            size_bytes=row["size_bytes"], checksum=row["checksum"], extraction_mode=row["extraction_mode"],
            extraction_status=row["extraction_status"], page_count=row["page_count"], chunk_count=count,
            error=row["error"], created_at=row["created_at"],
        )

    def get(self, source_id: str) -> KnowledgeSource:
        with closing(self._connection()) as connection:
            row = connection.execute("SELECT * FROM knowledge_sources WHERE source_id = ?", (source_id,)).fetchone()
            if row is None:
                raise KnowledgeSourceNotFoundError(source_id)
            return self._source_from_row(connection, row)

    def list(self) -> list[KnowledgeSource]:
        with closing(self._connection()) as connection:
            rows = connection.execute("SELECT * FROM knowledge_sources ORDER BY created_at DESC").fetchall()
            return [self._source_from_row(connection, row) for row in rows]

    def chunks(self, source_id: str, query: str | None = None, limit: int = 20) -> list[KnowledgeChunk]:
        self.get(source_id)
        with closing(self._connection()) as connection:
            rows = connection.execute(
                "SELECT * FROM knowledge_chunks WHERE source_id = ? ORDER BY ordinal", (source_id,)
            ).fetchall()
        chunks = [KnowledgeChunk(**dict(row)) for row in rows]
        if query and query.strip():
            terms = {term.lower() for term in re.findall(r"\w+", query) if len(term) > 1}
            chunks.sort(key=lambda chunk: sum(chunk.content.lower().count(term) for term in terms), reverse=True)
        return chunks[:max(1, min(limit, 100))]

    def build_generation_context(self, source_ids: list[str], query: str | None = None, character_budget: int = MAX_CONTEXT_CHARS) -> str:
        if not source_ids:
            raise ValueError("At least one source ID is required.")
        parts: list[str] = []
        remaining = character_budget
        for source_id in dict.fromkeys(source_ids):
            source = self.get(source_id)
            if source.extraction_status != "ready":
                raise KnowledgeSourceNotReadyError(f"{source.title} is {source.extraction_status}: {source.error or 'text is unavailable'}")
            for chunk in self.chunks(source.source_id, query=query, limit=100):
                citation = f"[Source: {source.title}, page {chunk.page_start or 'n/a'}]"
                piece = f"{citation}\n{chunk.content}\n"
                if len(piece) > remaining:
                    piece = piece[:remaining]
                parts.append(piece)
                remaining -= len(piece)
                if remaining <= 0:
                    break
            if remaining <= 0:
                break
        if not parts:
            raise KnowledgeSourceNotReadyError("No extracted text is available for the selected sources.")
        return "\n".join(parts)
