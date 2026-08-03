import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from agent.page_document import PageDocument, SyncMode
from agent.page_operations import PageOperationError
from apps.api.page_document_store import (
    PageDocumentStore,
    RevisionConflictError,
    SqlitePageDocumentStore,
)


def document(revision: int, text: str = "Initial") -> PageDocument:
    return PageDocument.from_dict(
        {
            "documentId": "shared-page",
            "revision": revision,
            "surfaceId": "shared-page",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": text}},
            ],
        }
    )


class PageDocumentStoreTests(unittest.TestCase):
    def test_human_create_then_ai_update_returns_incremental_messages(self) -> None:
        store = PageDocumentStore()
        created, initial = store.create(document(1), actor="human", summary="Create page")
        saved, update = store.update(
            "shared-page",
            document(created.revision, "Updated by AI"),
            base_revision=created.revision,
            actor="ai",
            summary="Improve title",
        )

        self.assertEqual(initial.mode, SyncMode.SNAPSHOT)
        self.assertEqual(update.mode, SyncMode.INCREMENTAL)
        self.assertEqual(saved.revision, 2)
        self.assertEqual(update.messages[0]["updateComponents"]["components"][0]["text"], "Updated by AI")
        self.assertEqual([change.actor for change in store.history("shared-page")], ["human", "ai"])

    def test_rejects_stale_write(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")
        store.update("shared-page", document(1, "First edit"), base_revision=1, actor="ai")

        with self.assertRaises(RevisionConflictError) as context:
            store.update("shared-page", document(1, "Stale edit"), base_revision=1, actor="human")

        self.assertEqual(context.exception.current_revision, 2)

    def test_snapshot_can_be_requested_for_a_reconnecting_renderer(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")

        plan = store.snapshot("shared-page")

        self.assertEqual(plan.mode, SyncMode.SNAPSHOT)
        self.assertIn("createSurface", plan.messages[0])

    def test_noop_write_is_versioned_but_emits_no_renderer_messages(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")

        saved, plan = store.update("shared-page", document(1), base_revision=1, actor="ai")

        self.assertEqual(saved.revision, 2)
        self.assertEqual(plan.mode, SyncMode.INCREMENTAL)
        self.assertEqual(plan.messages, [])

    def test_operations_advance_revision_and_emit_component_patch(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")

        saved, plan = store.apply_operations(
            "shared-page",
            [{"op": "set_props", "component_id": "title", "props": {"text": "Edited by AI"}}],
            base_revision=1,
            actor="ai",
            summary="Improve title",
        )

        self.assertEqual(saved.revision, 2)
        self.assertEqual(plan.mode, SyncMode.INCREMENTAL)
        self.assertEqual(plan.messages[0]["updateComponents"]["components"][0]["text"], "Edited by AI")

    def test_operations_are_retained_in_history(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")
        operations = [{"op": "set_props", "component_id": "title", "props": {"text": "Edited by AI"}}]

        store.apply_operations("shared-page", operations, base_revision=1, actor="ai")

        self.assertEqual(store.history("shared-page")[-1].operations, operations)
        self.assertEqual(store.get_revision("shared-page", 1).revision, 1)

    def test_restore_creates_a_new_revision_and_incremental_patch(self) -> None:
        store = PageDocumentStore()
        store.create(document(1), actor="human")
        store.apply_operations(
            "shared-page",
            [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}],
            base_revision=1,
            actor="ai",
        )

        restored, plan = store.restore("shared-page", 1, actor="human")

        self.assertEqual(restored.revision, 3)
        self.assertEqual(restored.components[1].props["text"], "Initial")
        self.assertEqual(plan.mode, SyncMode.INCREMENTAL)
        self.assertEqual(plan.messages[0]["updateComponents"]["components"][0]["text"], "Initial")


class SqlitePageDocumentStoreTests(unittest.TestCase):
    def test_reopen_preserves_current_document_and_revision_snapshots(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "page-documents.sqlite3"
            store = SqlitePageDocumentStore(database_path)
            store.create(document(1), actor="human", summary="Create page")
            operations = [{"op": "set_props", "component_id": "title", "props": {"text": "Edited by AI"}}]
            store.apply_operations("shared-page", operations, base_revision=1, actor="ai", summary="Improve title")
            store.close()

            reopened = SqlitePageDocumentStore(database_path)
            self.assertEqual(reopened.get("shared-page").revision, 2)
            self.assertEqual(reopened.get_revision("shared-page", 1).to_dict()["components"][1]["props"]["text"], "Initial")
            self.assertEqual(reopened.get_revision("shared-page", 2).to_dict()["components"][1]["props"]["text"], "Edited by AI")
            self.assertEqual(reopened.history("shared-page")[-1].operations, operations)
            reopened.close()

    def test_failed_operation_rolls_back_without_creating_a_revision(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            store = SqlitePageDocumentStore(Path(temporary_directory) / "page-documents.sqlite3")
            store.create(document(1), actor="human")

            with self.assertRaises(PageOperationError):
                store.apply_operations(
                    "shared-page",
                    [{"op": "set_props", "component_id": "missing", "props": {"text": "Nope"}}],
                    base_revision=1,
                    actor="ai",
                )

            self.assertEqual(store.get("shared-page").revision, 1)
            self.assertEqual([change.revision for change in store.history("shared-page")], [1])
            store.close()

    def test_restore_is_durable_across_reopen(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "page-documents.sqlite3"
            store = SqlitePageDocumentStore(database_path)
            store.create(document(1), actor="human")
            store.apply_operations(
                "shared-page",
                [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}],
                base_revision=1,
                actor="ai",
            )
            store.restore("shared-page", 1, actor="human")
            store.close()

            reopened = SqlitePageDocumentStore(database_path)
            self.assertEqual(reopened.get("shared-page").revision, 3)
            self.assertEqual(reopened.get("shared-page").components[1].props["text"], "Initial")
            reopened.close()


if __name__ == "__main__":
    unittest.main()
