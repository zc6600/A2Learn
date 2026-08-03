import unittest

from agent.page_document import PageDocument
from agent.page_operations import PageOperationError, apply_page_operations


def page() -> PageDocument:
    return PageDocument.from_dict(
        {
            "documentId": "lesson-1",
            "revision": 1,
            "surfaceId": "lesson-1",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
    )


class PageOperationsTests(unittest.TestCase):
    def test_set_props_preserves_component_identity(self) -> None:
        edited = apply_page_operations(page(), [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}])

        title = next(component for component in edited.components if component.id == "title")
        self.assertEqual(title.component, "Text")
        self.assertEqual(title.props["text"], "Edited")
        self.assertEqual(edited.revision, 1)

    def test_replace_props_removes_properties_omitted_by_a_human_edit(self) -> None:
        document = PageDocument.from_dict(
            {
                **page().to_dict(),
                "components": [
                    {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                    {"id": "title", "component": "Text", "props": {"text": "Initial", "variant": "h1"}},
                ],
            }
        )

        edited = apply_page_operations(
            document,
            [{"op": "replace_props", "component_id": "title", "props": {"text": "Edited"}}],
        )

        title = next(component for component in edited.components if component.id == "title")
        self.assertEqual(title.props, {"text": "Edited"})

    def test_insert_component_updates_parent_and_component_order(self) -> None:
        edited = apply_page_operations(
            page(),
            [
                {
                    "op": "insert_component",
                    "parent_id": "root",
                    "component": {"id": "quiz-1", "component": "QuizCard", "props": {"question": "Why?"}},
                }
            ],
        )

        root = next(component for component in edited.components if component.id == "root")
        self.assertEqual(root.props["children"], ["title", "quiz-1"])
        self.assertEqual(edited.components[-1].id, "quiz-1")

    def test_remove_leaf_component_updates_parent(self) -> None:
        edited = apply_page_operations(page(), [{"op": "remove_component", "component_id": "title"}])

        self.assertEqual([component.id for component in edited.components], ["root"])
        self.assertEqual(edited.components[0].props["children"], [])

    def test_rejects_root_and_subtree_removal(self) -> None:
        with self.assertRaisesRegex(PageOperationError, "root"):
            apply_page_operations(page(), [{"op": "remove_component", "component_id": "root"}])
        document = PageDocument.from_dict(
            {
                **page().to_dict(),
                "components": [
                    {"id": "root", "component": "Column", "props": {"children": ["section"]}},
                    {"id": "section", "component": "Column", "props": {"children": ["title"]}},
                    {"id": "title", "component": "Text", "props": {"text": "Initial"}},
                ],
            }
        )
        with self.assertRaisesRegex(PageOperationError, "leaf"):
            apply_page_operations(document, [{"op": "remove_component", "component_id": "section"}])


if __name__ == "__main__":
    unittest.main()
