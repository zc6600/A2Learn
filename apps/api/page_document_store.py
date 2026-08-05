"""PageDocument repositories for the human/AI editing POC.

``PageDocument`` is the source of truth.  The in-memory store keeps unit tests
small; the SQLite store persists the current document and an immutable complete
snapshot for every revision.  Both implementations deliberately expose the
same write contract, so human APIs and Agent tools stay storage-agnostic.
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Callable, Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from types import TracebackType
from typing import Any, Protocol, TypeVar

from agent.core.validate import validate_a2ui_messages
from agent.document.page_document import A2uiCompiler, PageDocument, SyncPlan
from agent.document.page_operations import apply_page_operations

_TransactionResult = TypeVar("_TransactionResult")


class DocumentAlreadyExistsError(ValueError):
    pass


class DocumentNotFoundError(KeyError):
    pass


class RevisionConflictError(ValueError):
    def __init__(self, current_revision: int) -> None:
        super().__init__(f"Document revision conflict; current revision is {current_revision}.")
        self.current_revision = current_revision


class RevisionNotFoundError(KeyError):
    pass


@dataclass(frozen=True)
class ChangeRecord:
    document_id: str
    revision: int
    actor: str
    summary: str | None
    created_at: str
    operations: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "documentId": self.document_id,
            "revision": self.revision,
            "actor": self.actor,
            "summary": self.summary,
            "createdAt": self.created_at,
        }
        if self.operations is not None:
            result["operations"] = deepcopy(self.operations)
        return result


class PageDocumentRepository(Protocol):
    """Storage boundary shared by the API and LangChain runtime context."""

    def create(self, document: PageDocument, *, actor: str, summary: str | None = None) -> tuple[PageDocument, SyncPlan]: ...

    def get(self, document_id: str) -> PageDocument: ...

    def get_revision(self, document_id: str, revision: int) -> PageDocument: ...

    def update(
        self,
        document_id: str,
        candidate: PageDocument,
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]: ...

    def snapshot(self, document_id: str) -> SyncPlan: ...

    def apply_operations(
        self,
        document_id: str,
        operations: Sequence[Mapping[str, Any]],
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]: ...

    def history(self, document_id: str) -> list[ChangeRecord]: ...

    def restore(
        self,
        document_id: str,
        revision: int,
        *,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]: ...


class PageDocumentStore:
    def __init__(self, compiler: A2uiCompiler | None = None) -> None:
        self._lock = Lock()
        self._compiler = compiler or A2uiCompiler()
        self._documents: dict[str, PageDocument] = {}
        self._history: dict[str, list[ChangeRecord]] = {}
        self._revisions: dict[str, dict[int, PageDocument]] = {}

    def create(self, document: PageDocument, *, actor: str, summary: str | None = None) -> tuple[PageDocument, SyncPlan]:
        if document.revision != 1:
            raise ValueError("A newly created PageDocument must start at revision 1.")
        with self._lock:
            if document.document_id in self._documents:
                raise DocumentAlreadyExistsError(document.document_id)
            plan = self._compiler.compile(None, document)
            self._validate(plan)
            self._documents[document.document_id] = document
            self._revisions[document.document_id] = {document.revision: document}
            self._record(document, actor, summary)
            return document, plan

    def create_many(
        self,
        documents: Sequence[PageDocument],
        *,
        actor: str,
        summary: str | None = None,
    ) -> list[SyncPlan]:
        """Atomically create an in-memory document batch for one project."""
        batch = list(documents)
        if not batch:
            raise ValueError("At least one PageDocument is required.")
        document_ids = [document.document_id for document in batch]
        if len(document_ids) != len(set(document_ids)):
            raise DocumentAlreadyExistsError("A batch cannot contain duplicate document IDs.")
        with self._lock:
            for document in batch:
                if document.revision != 1:
                    raise ValueError("A newly created PageDocument must start at revision 1.")
                if document.document_id in self._documents:
                    raise DocumentAlreadyExistsError(document.document_id)
            plans = [self._compiler.compile(None, document) for document in batch]
            for plan in plans:
                self._validate(plan)
            for document in batch:
                self._documents[document.document_id] = document
                self._revisions[document.document_id] = {document.revision: document}
                self._record(document, actor, summary)
            return plans

    def get(self, document_id: str) -> PageDocument:
        with self._lock:
            document = self._documents.get(document_id)
            if document is None:
                raise DocumentNotFoundError(document_id)
            return document

    def get_revision(self, document_id: str, revision: int) -> PageDocument:
        with self._lock:
            if document_id not in self._documents:
                raise DocumentNotFoundError(document_id)
            document = self._revisions[document_id].get(revision)
            if document is None:
                raise RevisionNotFoundError(f"Revision {revision} not found for {document_id}.")
            return document

    def update(
        self,
        document_id: str,
        candidate: PageDocument,
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        with self._lock:
            previous = self._documents.get(document_id)
            if previous is None:
                raise DocumentNotFoundError(document_id)
            if base_revision != previous.revision:
                raise RevisionConflictError(previous.revision)
            if candidate.document_id != document_id:
                raise ValueError("The path document ID and document.documentId must match.")
            if candidate.revision != base_revision:
                raise ValueError("document.revision must equal baseRevision; the server assigns the next revision.")

            current = replace(candidate, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            self._documents[document_id] = current
            self._revisions[document_id][current.revision] = current
            self._record(current, actor, summary)
            return current, plan

    def snapshot(self, document_id: str) -> SyncPlan:
        """Return a complete A2UI stream for a newly connected renderer."""
        document = self.get(document_id)
        plan = self._compiler.snapshot(document)
        self._validate(plan)
        return plan

    def apply_operations(
        self,
        document_id: str,
        operations: Sequence[Mapping[str, Any]],
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        """Apply constrained edits and atomically emit their A2UI projection."""
        with self._lock:
            previous = self._documents.get(document_id)
            if previous is None:
                raise DocumentNotFoundError(document_id)
            if base_revision != previous.revision:
                raise RevisionConflictError(previous.revision)

            candidate = apply_page_operations(previous, operations)
            current = replace(candidate, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            self._documents[document_id] = current
            self._revisions[document_id][current.revision] = current
            self._record(current, actor, summary, operations)
            return current, plan

    def history(self, document_id: str) -> list[ChangeRecord]:
        with self._lock:
            if document_id not in self._documents:
                raise DocumentNotFoundError(document_id)
            return list(self._history.get(document_id, []))

    def restore(
        self,
        document_id: str,
        revision: int,
        *,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        """Make an earlier snapshot the next revision of a document."""
        with self._lock:
            previous = self._documents.get(document_id)
            if previous is None:
                raise DocumentNotFoundError(document_id)
            target = self._revisions[document_id].get(revision)
            if target is None:
                raise RevisionNotFoundError(f"Revision {revision} not found for {document_id}.")
            current = replace(target, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            self._documents[document_id] = current
            self._revisions[document_id][current.revision] = current
            self._record(current, actor, summary or f"Restore revision {revision}")
            return current, plan

    def _record(
        self,
        document: PageDocument,
        actor: str,
        summary: str | None,
        operations: Sequence[Mapping[str, Any]] | None = None,
    ) -> None:
        self._history.setdefault(document.document_id, []).append(
            ChangeRecord(
                document_id=document.document_id,
                revision=document.revision,
                actor=actor,
                summary=summary,
                created_at=datetime.now(UTC).isoformat(),
                operations=_copy_operations(operations),
            )
        )

    @staticmethod
    def _validate(plan: SyncPlan) -> None:
        if not plan.messages:
            # A write can be content-identical (for example, a human accepts
            # an AI draft without changing it). It still earns a revision and
            # audit record, but there is nothing to send to an A2UI client.
            return
        # Data-only incremental patches are valid A2UI but do not contain an
        # updateComponents message, so neither bootstrap requirement applies.
        validate_a2ui_messages(
            plan.messages,
            require_create_surface=False,
            require_update_components=False,
        )


def _copy_operations(operations: Sequence[Mapping[str, Any]] | None) -> list[dict[str, Any]] | None:
    if operations is None:
        return None
    return [deepcopy(dict(operation)) for operation in operations]


class SqlitePageDocumentStore:
    """Durable PageDocument repository backed by one SQLite database.

    ``page_documents`` holds the latest full source document.  Each successful
    write also appends a complete document snapshot to
    ``page_document_revisions``.  This is intentionally snapshot-based rather
    than event-only: a future rollback or reconnect never has to replay a
    potentially long operations stream.
    """

    def __init__(self, database_path: str | Path, compiler: A2uiCompiler | None = None) -> None:
        self._database_path = str(database_path)
        if self._database_path != ":memory:":
            Path(self._database_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._compiler = compiler or A2uiCompiler()
        self._connection = sqlite3.connect(self._database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._initialize_schema()

    def close(self) -> None:
        with self._lock:
            self._connection.close()

    def run_extension_transaction(
        self, operation: Callable[[sqlite3.Connection], _TransactionResult]
    ) -> _TransactionResult:
        """Run a workspace-level write with this store's connection and lock.

        Project metadata shares the same SQLite file as PageDocuments. Keeping
        the transaction here lets a higher-level ProjectStore atomically create
        both its project mapping and the source documents it owns.
        """
        with self._write_transaction():
            return operation(self._connection)

    def run_extension_read(
        self, operation: Callable[[sqlite3.Connection], _TransactionResult]
    ) -> _TransactionResult:
        """Read extension tables under the same connection lock."""
        with self._lock:
            return operation(self._connection)

    def create_in_transaction(
        self,
        document: PageDocument,
        *,
        actor: str,
        summary: str | None = None,
    ) -> SyncPlan:
        """Insert one new document inside ``run_extension_transaction``.

        This deliberately does not commit. It is only for an owning aggregate
        (currently ProjectStore) that needs its document and metadata writes to
        succeed or roll back together.
        """
        if document.revision != 1:
            raise ValueError("A newly created PageDocument must start at revision 1.")
        plan = self._compiler.compile(None, document)
        self._validate(plan)
        existing = self._connection.execute(
            "SELECT 1 FROM page_documents WHERE document_id = ?", (document.document_id,)
        ).fetchone()
        if existing is not None:
            raise DocumentAlreadyExistsError(document.document_id)
        created_at = _now()
        self._write_current(document, created_at)
        self._write_revision(document, actor=actor, summary=summary, operations=None, created_at=created_at)
        return plan

    def create(self, document: PageDocument, *, actor: str, summary: str | None = None) -> tuple[PageDocument, SyncPlan]:
        plan = self.run_extension_transaction(
            lambda _connection: self.create_in_transaction(document, actor=actor, summary=summary)
        )
        return document, plan

    def get(self, document_id: str) -> PageDocument:
        with self._lock:
            row = self._connection.execute(
                "SELECT document_json FROM page_documents WHERE document_id = ?", (document_id,)
            ).fetchone()
        if row is None:
            raise DocumentNotFoundError(document_id)
        return _document_from_json(row["document_json"])

    def get_revision(self, document_id: str, revision: int) -> PageDocument:
        with self._lock:
            document_exists = self._connection.execute(
                "SELECT 1 FROM page_documents WHERE document_id = ?", (document_id,)
            ).fetchone()
            if document_exists is None:
                raise DocumentNotFoundError(document_id)
            row = self._connection.execute(
                "SELECT document_json FROM page_document_revisions WHERE document_id = ? AND revision = ?",
                (document_id, revision),
            ).fetchone()
        if row is None:
            raise RevisionNotFoundError(f"Revision {revision} not found for {document_id}.")
        return _document_from_json(row["document_json"])

    def update(
        self,
        document_id: str,
        candidate: PageDocument,
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        with self._write_transaction():
            previous = self._current_document(document_id)
            self._validate_base_revision(previous, base_revision)
            if candidate.document_id != document_id:
                raise ValueError("The path document ID and document.documentId must match.")
            if candidate.revision != base_revision:
                raise ValueError("document.revision must equal baseRevision; the server assigns the next revision.")

            current = replace(candidate, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            created_at = _now()
            self._write_current(current, created_at, expected_revision=previous.revision)
            self._write_revision(current, actor=actor, summary=summary, operations=None, created_at=created_at)
        return current, plan

    def snapshot(self, document_id: str) -> SyncPlan:
        document = self.get(document_id)
        plan = self._compiler.snapshot(document)
        self._validate(plan)
        return plan

    def apply_operations(
        self,
        document_id: str,
        operations: Sequence[Mapping[str, Any]],
        *,
        base_revision: int,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        with self._write_transaction():
            previous = self._current_document(document_id)
            self._validate_base_revision(previous, base_revision)
            candidate = apply_page_operations(previous, operations)
            current = replace(candidate, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            created_at = _now()
            self._write_current(current, created_at, expected_revision=previous.revision)
            self._write_revision(
                current,
                actor=actor,
                summary=summary,
                operations=_copy_operations(operations),
                created_at=created_at,
            )
        return current, plan

    def history(self, document_id: str) -> list[ChangeRecord]:
        with self._lock:
            document_exists = self._connection.execute(
                "SELECT 1 FROM page_documents WHERE document_id = ?", (document_id,)
            ).fetchone()
            if document_exists is None:
                raise DocumentNotFoundError(document_id)
            rows = self._connection.execute(
                """
                SELECT revision, actor, summary, created_at, operations_json
                FROM page_document_revisions
                WHERE document_id = ?
                ORDER BY revision ASC
                """,
                (document_id,),
            ).fetchall()
        return [
            ChangeRecord(
                document_id=document_id,
                revision=row["revision"],
                actor=row["actor"],
                summary=row["summary"],
                created_at=row["created_at"],
                operations=json.loads(row["operations_json"]) if row["operations_json"] is not None else None,
            )
            for row in rows
        ]

    def restore(
        self,
        document_id: str,
        revision: int,
        *,
        actor: str,
        summary: str | None = None,
    ) -> tuple[PageDocument, SyncPlan]:
        with self._write_transaction():
            previous = self._current_document(document_id)
            row = self._connection.execute(
                "SELECT document_json FROM page_document_revisions WHERE document_id = ? AND revision = ?",
                (document_id, revision),
            ).fetchone()
            if row is None:
                raise RevisionNotFoundError(f"Revision {revision} not found for {document_id}.")
            target = _document_from_json(row["document_json"])
            current = replace(target, revision=previous.revision + 1)
            plan = self._compiler.compile(previous, current)
            self._validate(plan)
            created_at = _now()
            self._write_current(current, created_at, expected_revision=previous.revision)
            self._write_revision(
                current,
                actor=actor,
                summary=summary or f"Restore revision {revision}",
                operations=None,
                created_at=created_at,
            )
        return current, plan

    def _initialize_schema(self) -> None:
        with self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS page_documents (
                    document_id TEXT PRIMARY KEY,
                    revision INTEGER NOT NULL,
                    document_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS page_document_revisions (
                    document_id TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    actor TEXT NOT NULL,
                    summary TEXT,
                    operations_json TEXT,
                    document_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (document_id, revision),
                    FOREIGN KEY (document_id) REFERENCES page_documents(document_id)
                );
                """
            )

    def _current_document(self, document_id: str) -> PageDocument:
        row = self._connection.execute(
            "SELECT document_json FROM page_documents WHERE document_id = ?", (document_id,)
        ).fetchone()
        if row is None:
            raise DocumentNotFoundError(document_id)
        return _document_from_json(row["document_json"])

    @staticmethod
    def _validate_base_revision(previous: PageDocument, base_revision: int) -> None:
        if base_revision != previous.revision:
            raise RevisionConflictError(previous.revision)

    def _write_current(self, document: PageDocument, updated_at: str, expected_revision: int | None = None) -> None:
        encoded_document = _document_to_json(document)
        if expected_revision is None:
            self._connection.execute(
                "INSERT INTO page_documents (document_id, revision, document_json, updated_at) VALUES (?, ?, ?, ?)",
                (document.document_id, document.revision, encoded_document, updated_at),
            )
            return
        cursor = self._connection.execute(
            """
            UPDATE page_documents
            SET revision = ?, document_json = ?, updated_at = ?
            WHERE document_id = ? AND revision = ?
            """,
            (document.revision, encoded_document, updated_at, document.document_id, expected_revision),
        )
        if cursor.rowcount != 1:
            raise RevisionConflictError(expected_revision)

    def _write_revision(
        self,
        document: PageDocument,
        *,
        actor: str,
        summary: str | None,
        operations: list[dict[str, Any]] | None,
        created_at: str,
    ) -> None:
        encoded_operations = json.dumps(operations, ensure_ascii=False, separators=(",", ":")) if operations else None
        self._connection.execute(
            """
            INSERT INTO page_document_revisions
            (document_id, revision, actor, summary, operations_json, document_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document.document_id,
                document.revision,
                actor,
                summary,
                encoded_operations,
                _document_to_json(document),
                created_at,
            ),
        )

    def _write_transaction(self):
        return _SqliteWriteTransaction(self._connection, self._lock)

    @staticmethod
    def _validate(plan: SyncPlan) -> None:
        PageDocumentStore._validate(plan)


class _SqliteWriteTransaction:
    def __init__(self, connection: sqlite3.Connection, lock: Lock) -> None:
        self._connection = connection
        self._lock = lock

    def __enter__(self) -> None:
        self._lock.acquire()
        try:
            self._connection.execute("BEGIN IMMEDIATE")
        except BaseException:
            self._lock.release()
            raise

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool:
        try:
            if exc_type is None:
                self._connection.commit()
            else:
                self._connection.rollback()
        finally:
            self._lock.release()
        return False


def _document_to_json(document: PageDocument) -> str:
    return json.dumps(document.to_dict(), ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def _document_from_json(value: str) -> PageDocument:
    return PageDocument.from_dict(json.loads(value))


def _now() -> str:
    return datetime.now(UTC).isoformat()


def build_page_document_store(database_path: str | None = None) -> PageDocumentRepository:
    """Build the durable SQLite store when configured, otherwise use memory.

    Leaving the variable unset preserves the lightweight local/test POC.  A
    deployment enables persistence with ``A2LEARN_PAGE_DOCUMENT_DB_PATH``.
    """

    if database_path and database_path.strip():
        return SqlitePageDocumentStore(database_path.strip())
    return PageDocumentStore()
