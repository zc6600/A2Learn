import unittest

from agent.page_document import PageDocument, SyncMode
from apps.api.page_document_store import PageDocumentStore, RevisionConflictError


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


if __name__ == "__main__":
    unittest.main()
