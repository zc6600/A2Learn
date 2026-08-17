import unittest

from agent.core.validate import validate_a2ui_messages


class ValidateMessagesTests(unittest.TestCase):
    def test_accepts_incremental_update_when_create_surface_not_required(self) -> None:
        incremental = [
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {
                            "id": "learning-path-1",
                            "component": "LearningPath",
                            "activeStepId": "step2",
                        }
                    ],
                },
            }
        ]
        validate_a2ui_messages(incremental, require_create_surface=False)

    def test_accepts_mental_model(self) -> None:
        messages = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {
                            "id": "root",
                            "component": "Column",
                            "children": ["model1"],
                        },
                        {
                            "id": "model1",
                            "component": "MentalModel",
                            "title": "MVC Pattern",
                            "description": "Model-View-Controller architecture",
                            "pillars": [
                                {"title": "Model", "description": "Data and logic"}
                            ]
                        }
                    ]
                }
            }
        ]
        validate_a2ui_messages(messages)

    def test_accepts_detailed_explanation(self) -> None:
        messages = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {
                            "id": "root",
                            "component": "Column",
                            "children": ["exp1"],
                        },
                        {
                            "id": "exp1",
                            "component": "DetailedExplanation",
                            "title": "Closures Depth",
                            "content": "Deep explanation of scope",
                        }
                    ]
                }
            }
        ]
        validate_a2ui_messages(messages)



    def test_rejects_missing_update_components_by_default(self) -> None:
        only_create = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            }
        ]
        with self.assertRaises(ValueError):
            validate_a2ui_messages(only_create)

    def test_rejects_non_string_component_identity_without_type_error(self) -> None:
        messages = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [{"id": "root", "component": {"name": "Column"}}],
                },
            },
        ]
        with self.assertRaisesRegex(ValueError, "non-empty string 'component'"):
            validate_a2ui_messages(messages, permitted_custom_components=("ConceptCard",))

    def test_rejects_unexpanded_component_props_wrapper(self) -> None:
        messages = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {"id": "root", "component": "Column", "children": ["card"]},
                        {"id": "card", "component": "ConceptCard", "props": {"title": "Wrapped"}},
                    ],
                },
            },
        ]

        with self.assertRaisesRegex(ValueError, "'props' wrapper"):
            validate_a2ui_messages(messages)

    def test_accepts_a_bounded_local_generative_lab(self) -> None:
        messages = [
            {"version": "v0.9", "createSurface": {"surfaceId": "main", "catalogId": "https://a2learn.ai/spec/v1/catalog.json"}},
            {"version": "v0.9", "updateComponents": {"surfaceId": "main", "components": [
                {"id": "root", "component": "Column", "children": ["lab"]},
                {"id": "lab", "component": "GenerativeLab", "title": "Pendulum", "html": "<canvas id='lab'></canvas>", "javascript": "const angle = 0.2; a2learn.setHeight(360);"},
            ]}},
        ]
        validate_a2ui_messages(messages, permitted_custom_components=("GenerativeLab",))

    def test_accepts_generative_lab_with_browser_network_api(self) -> None:
        messages = [
            {"version": "v0.9", "createSurface": {"surfaceId": "main", "catalogId": "https://a2learn.ai/spec/v1/catalog.json"}},
            {"version": "v0.9", "updateComponents": {"surfaceId": "main", "components": [
                {"id": "root", "component": "Column", "children": ["lab"]},
                {"id": "lab", "component": "GenerativeLab", "title": "Data explorer", "html": "<div></div>", "javascript": "fetch('https://example.com/data.json')"},
            ]}},
        ]
        validate_a2ui_messages(messages, permitted_custom_components=("GenerativeLab",))


if __name__ == "__main__":
    unittest.main()
