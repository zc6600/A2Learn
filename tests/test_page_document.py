import unittest

from agent.document.page_document import A2uiCompiler, PageDocument, SyncMode


def page(revision: int, *, title: str = "Initial", include_card: bool = True, data=None) -> PageDocument:
    components = [
        {"id": "root", "component": "Column", "props": {"children": ["title"] + (["card"] if include_card else [])}},
        {"id": "title", "component": "Text", "props": {"text": title}},
    ]
    if include_card:
        components.append({"id": "card", "component": "ConceptCard", "props": {"title": "A component"}})
    return PageDocument.from_dict(
        {
            "documentId": "lesson-1",
            "revision": revision,
            "surfaceId": "lesson-1",
            "components": components,
            "data": data or {"progress": {"completed": False}},
        }
    )


class PageDocumentCompilerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.compiler = A2uiCompiler()

    def test_initial_document_compiles_to_a2ui_snapshot(self) -> None:
        plan = self.compiler.compile(None, page(1))

        self.assertEqual(plan.mode, SyncMode.SNAPSHOT)
        self.assertEqual([next(iter(message.keys() - {"version"})) for message in plan.messages], [
            "createSurface",
            "updateComponents",
            "updateDataModel",
        ])
        self.assertEqual(plan.messages[1]["updateComponents"]["components"][0]["id"], "root")

    def test_single_component_change_is_incremental(self) -> None:
        plan = self.compiler.compile(page(1), page(2, title="Edited by a human"))

        self.assertEqual(plan.mode, SyncMode.INCREMENTAL)
        self.assertEqual(len(plan.messages), 1)
        changed = plan.messages[0]["updateComponents"]["components"]
        self.assertEqual(changed, [{"id": "title", "component": "Text", "text": "Edited by a human"}])

    def test_data_change_uses_json_pointer_patch(self) -> None:
        plan = self.compiler.compile(
            page(1),
            page(2, data={"progress": {"completed": True}}),
        )

        self.assertEqual(plan.mode, SyncMode.INCREMENTAL)
        self.assertEqual(plan.messages, [
            {
                "version": "v0.9",
                "updateDataModel": {
                    "surfaceId": "lesson-1",
                    "path": "/progress/completed",
                    "value": True,
                },
            }
        ])

    def test_component_removal_replaces_surface(self) -> None:
        plan = self.compiler.compile(page(1), page(2, include_card=False))

        self.assertEqual(plan.mode, SyncMode.REPLACE_SURFACE)
        self.assertEqual(next(iter(plan.messages[0].keys() - {"version"})), "deleteSurface")
        self.assertEqual(next(iter(plan.messages[1].keys() - {"version"})), "createSurface")

    def test_rejects_document_without_stable_root(self) -> None:
        with self.assertRaisesRegex(ValueError, "root"):
            PageDocument.from_dict(
                {
                    "documentId": "lesson-1",
                    "revision": 1,
                    "surfaceId": "lesson-1",
                    "components": [{"id": "title", "component": "Text", "props": {"text": "Hello"}}],
                }
            )


if __name__ == "__main__":
    unittest.main()
