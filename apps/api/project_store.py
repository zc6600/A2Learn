"""Project-level registry that groups one or more PageDocuments.

The legacy PageDocument API remains the low-level surface.  This registry adds
the stable identity users see (for example ``hash-table`` or ``user-project-1``)
without changing how an individual surface is versioned or compiled to A2UI.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from typing import Literal, Protocol

from agent.document.page_document import PageDocument

from .page_document_store import (
    DocumentAlreadyExistsError,
    DocumentNotFoundError,
    PageDocumentRepository,
    PageDocumentStore,
    SqlitePageDocumentStore,
)

ProjectSource = Literal["example", "generated"]


class ProjectAlreadyExistsError(ValueError):
    pass


class ProjectNotFoundError(KeyError):
    pass


class ProjectRepository(Protocol):
    def create(
        self,
        project_id: str,
        documents: Sequence[PageDocument],
        *,
        source: ProjectSource,
        owner_id: str | None,
        actor: str,
    ) -> ProjectRecord: ...

    def get(self, project_id: str) -> tuple[ProjectRecord, list[PageDocument]]: ...

    def history(self, project_id: str) -> list[dict[str, object]]: ...


@dataclass(frozen=True)
class ProjectRecord:
    project_id: str
    source: ProjectSource
    owner_id: str | None
    document_ids: tuple[str, ...]
    created_at: str

    def to_dict(self) -> dict[str, object]:
        return {
            "projectId": self.project_id,
            "source": self.source,
            "ownerId": self.owner_id,
            "documentIds": list(self.document_ids),
            "createdAt": self.created_at,
        }


class ProjectStore:
    """In-memory project registry backed by the shared PageDocument repository.

    The registry is intentionally a thin compatibility layer in this step.  A
    later SQLite migration can persist project metadata without changing the
    PageDocument revision tables or the API shape below.
    """

    def __init__(self, page_documents: PageDocumentRepository) -> None:
        self._page_documents = page_documents
        self._lock = Lock()
        self._projects: dict[str, ProjectRecord] = {}

    def create(
        self,
        project_id: str,
        documents: Sequence[PageDocument],
        *,
        source: ProjectSource,
        owner_id: str | None,
        actor: str,
    ) -> ProjectRecord:
        if not project_id.strip():
            raise ValueError("project_id is required.")
        if not documents:
            raise ValueError("A project must contain at least one PageDocument.")
        document_ids = tuple(document.document_id for document in documents)
        if len(document_ids) != len(set(document_ids)):
            raise ValueError("A project cannot contain duplicate document IDs.")

        with self._lock:
            if project_id in self._projects:
                raise ProjectAlreadyExistsError(project_id)
            for document_id in document_ids:
                try:
                    self._page_documents.get(document_id)
                except DocumentNotFoundError:
                    continue
                raise DocumentAlreadyExistsError(document_id)
            if isinstance(self._page_documents, PageDocumentStore):
                self._page_documents.create_many(
                    documents,
                    actor=actor,
                    summary=f"Create project {project_id}",
                )
            else:
                for document in documents:
                    self._page_documents.create(document, actor=actor, summary=f"Create project {project_id}")
            record = ProjectRecord(
                project_id=project_id,
                source=source,
                owner_id=owner_id,
                document_ids=document_ids,
                created_at=datetime.now(UTC).isoformat(),
            )
            self._projects[project_id] = record
            return record

    def get(self, project_id: str) -> tuple[ProjectRecord, list[PageDocument]]:
        with self._lock:
            record = self._projects.get(project_id)
            if record is None:
                raise ProjectNotFoundError(project_id)
            documents = [self._page_documents.get(document_id) for document_id in record.document_ids]
            return record, documents

    def history(self, project_id: str) -> list[dict[str, object]]:
        record, _ = self.get(project_id)
        changes: list[dict[str, object]] = []
        for document_id in record.document_ids:
            changes.extend(change.to_dict() for change in self._page_documents.history(document_id))
        return sorted(changes, key=lambda change: str(change["createdAt"]))


class SqliteProjectStore:
    """Durable project-to-document registry sharing the PageDocument database.

    PageDocument snapshots remain owned by ``SqlitePageDocumentStore``. This
    table only stores their stable project grouping, which keeps this layer
    small and avoids introducing accounts or a full project-management model.
    """

    def __init__(self, page_documents: SqlitePageDocumentStore) -> None:
        self._page_documents = page_documents
        self._initialize_schema()

    def create(
        self,
        project_id: str,
        documents: Sequence[PageDocument],
        *,
        source: ProjectSource,
        owner_id: str | None,
        actor: str,
    ) -> ProjectRecord:
        _validate_project_input(project_id, documents)
        document_ids = tuple(document.document_id for document in documents)
        def write(connection: sqlite3.Connection) -> ProjectRecord:
            # The concrete callback receives the SQLite connection from
            # SqlitePageDocumentStore. Keeping all writes there makes this
            # aggregate atomic: no PageDocument survives a failed project map.
            database = connection
            exists = database.execute(
                "SELECT 1 FROM projects WHERE project_id = ?", (project_id,)
            ).fetchone()
            if exists is not None:
                raise ProjectAlreadyExistsError(project_id)
            for document_id in document_ids:
                existing_document = database.execute(
                    "SELECT 1 FROM page_documents WHERE document_id = ?", (document_id,)
                ).fetchone()
                if existing_document is not None:
                    raise DocumentAlreadyExistsError(document_id)
            for document in documents:
                self._page_documents.create_in_transaction(
                    document, actor=actor, summary=f"Create project {project_id}"
                )
            created_at = datetime.now(UTC).isoformat()
            database.execute(
                "INSERT INTO projects (project_id, source, owner_id, created_at) VALUES (?, ?, ?, ?)",
                (project_id, source, owner_id, created_at),
            )
            database.executemany(
                "INSERT INTO project_documents (project_id, document_id, position) VALUES (?, ?, ?)",
                [(project_id, document_id, position) for position, document_id in enumerate(document_ids)],
            )
            return ProjectRecord(project_id, source, owner_id, document_ids, created_at)

        return self._page_documents.run_extension_transaction(write)

    def get(self, project_id: str) -> tuple[ProjectRecord, list[PageDocument]]:
        def read(connection: sqlite3.Connection) -> tuple[sqlite3.Row, list[sqlite3.Row]]:
            database = connection
            row = database.execute(
                "SELECT project_id, source, owner_id, created_at FROM projects WHERE project_id = ?", (project_id,)
            ).fetchone()
            if row is None:
                raise ProjectNotFoundError(project_id)
            document_rows = database.execute(
                "SELECT document_id FROM project_documents WHERE project_id = ? ORDER BY position ASC", (project_id,)
            ).fetchall()
            return row, document_rows

        row, document_rows = self._page_documents.run_extension_read(read)
        record = ProjectRecord(
            project_id=row["project_id"],
            source=row["source"],
            owner_id=row["owner_id"],
            document_ids=tuple(item["document_id"] for item in document_rows),
            created_at=row["created_at"],
        )
        return record, [self._page_documents.get(document_id) for document_id in record.document_ids]

    def history(self, project_id: str) -> list[dict[str, object]]:
        record, _ = self.get(project_id)
        changes: list[dict[str, object]] = []
        for document_id in record.document_ids:
            changes.extend(change.to_dict() for change in self._page_documents.history(document_id))
        return sorted(changes, key=lambda change: str(change["createdAt"]))

    def _initialize_schema(self) -> None:
        def initialize(connection: sqlite3.Connection) -> None:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    source TEXT NOT NULL CHECK (source IN ('example', 'generated')),
                    owner_id TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_documents (
                    project_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    PRIMARY KEY (project_id, document_id),
                    UNIQUE (project_id, position),
                    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
                );
                """
            )
        self._page_documents.run_extension_transaction(initialize)


def _validate_project_input(project_id: str, documents: Sequence[PageDocument]) -> None:
    if not project_id.strip():
        raise ValueError("project_id is required.")
    if not documents:
        raise ValueError("A project must contain at least one PageDocument.")
    document_ids = [document.document_id for document in documents]
    if len(document_ids) != len(set(document_ids)):
        raise ValueError("A project cannot contain duplicate document IDs.")


def build_project_store(
    page_documents: PageDocumentRepository, database_path: str | None = None
) -> ProjectRepository:
    if database_path and database_path.strip():
        if not isinstance(page_documents, SqlitePageDocumentStore):
            raise TypeError("A SQLite ProjectStore requires a SqlitePageDocumentStore.")
        return SqliteProjectStore(page_documents)
    return ProjectStore(page_documents)
