"""In-memory PageDocument store for the human/AI editing POC.

The store deliberately has one write path regardless of actor.  A durable
implementation can replace this module with a database/event store without
changing the A2UI compiler contract.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from threading import Lock
from typing import Any

from agent.page_document import A2uiCompiler, PageDocument, SyncPlan
from agent.page_operations import apply_page_operations
from agent.validate import validate_a2ui_messages


class DocumentAlreadyExistsError(ValueError):
    pass


class DocumentNotFoundError(KeyError):
    pass


class RevisionConflictError(ValueError):
    def __init__(self, current_revision: int) -> None:
        super().__init__(f"Document revision conflict; current revision is {current_revision}.")
        self.current_revision = current_revision


@dataclass(frozen=True)
class ChangeRecord:
    document_id: str
    revision: int
    actor: str
    summary: str | None
    created_at: str

    def to_dict(self) -> dict[str, str | int | None]:
        return {
            "documentId": self.document_id,
            "revision": self.revision,
            "actor": self.actor,
            "summary": self.summary,
            "createdAt": self.created_at,
        }


class PageDocumentStore:
    def __init__(self, compiler: A2uiCompiler | None = None) -> None:
        self._lock = Lock()
        self._compiler = compiler or A2uiCompiler()
        self._documents: dict[str, PageDocument] = {}
        self._history: dict[str, list[ChangeRecord]] = {}

    def create(self, document: PageDocument, *, actor: str, summary: str | None = None) -> tuple[PageDocument, SyncPlan]:
        if document.revision != 1:
            raise ValueError("A newly created PageDocument must start at revision 1.")
        with self._lock:
            if document.document_id in self._documents:
                raise DocumentAlreadyExistsError(document.document_id)
            plan = self._compiler.compile(None, document)
            self._validate(plan)
            self._documents[document.document_id] = document
            self._record(document, actor, summary)
            return document, plan

    def get(self, document_id: str) -> PageDocument:
        with self._lock:
            document = self._documents.get(document_id)
            if document is None:
                raise DocumentNotFoundError(document_id)
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
            self._record(current, actor, summary)
            return current, plan

    def history(self, document_id: str) -> list[ChangeRecord]:
        with self._lock:
            if document_id not in self._documents:
                raise DocumentNotFoundError(document_id)
            return list(self._history.get(document_id, []))

    def _record(self, document: PageDocument, actor: str, summary: str | None) -> None:
        self._history.setdefault(document.document_id, []).append(
            ChangeRecord(
                document_id=document.document_id,
                revision=document.revision,
                actor=actor,
                summary=summary,
                created_at=datetime.now(UTC).isoformat(),
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
