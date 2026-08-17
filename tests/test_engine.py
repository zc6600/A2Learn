import unittest
from unittest.mock import patch

from agent.core.validate import validate_a2ui_messages
from agent.generation.engine import _normalize_a2ui_messages, _validate_or_repair, run_agent


VALID_MESSAGES = [
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
            "components": [{"id": "root", "component": "Column", "children": []}],
        },
    },
]

INVALID_MESSAGES = [
    {"version": "v0.9", "createSurface": {"surfaceId": "main"}},
]


class ValidateOrRepairTests(unittest.TestCase):
    def test_fast_mode_uses_direct_generation_without_building_langgraph(self) -> None:
        wrapped_messages = [
            VALID_MESSAGES[0],
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {"id": "root", "component": "Column", "children": ["card"]},
                        {"id": "card", "component": "ConceptCard", "props": {"title": "Broadcast"}},
                    ],
                },
            },
        ]
        with (
            patch("agent.generation.engine.build_llm", return_value=object()) as build_llm,
            patch("agent.generation.engine.generate_fast_a2ui_messages", return_value=wrapped_messages) as generate,
            patch("agent.generation.engine.build_agent_graph") as build_graph,
        ):
            result = run_agent(
                resource_text="Broadcast sends a message to every process.",
                generation_mode="fast",
            )

        build_llm.assert_called_once()
        generate.assert_called_once()
        build_graph.assert_not_called()
        card = result["a2ui_messages"][1]["updateComponents"]["components"][1]
        self.assertEqual(card["title"], "Broadcast")
        self.assertNotIn("props", card)

    def test_normalizes_nested_and_wrapped_components_before_validation(self) -> None:
        malformed = [
            VALID_MESSAGES[0],
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {
                            "component": {"name": "Column"},
                            "children": [{"component": "ConceptCard", "title": "Hash"}],
                        }
                    ],
                },
            },
        ]

        result = _normalize_a2ui_messages(malformed)
        components = result[1]["updateComponents"]["components"]
        by_id = {component["id"]: component for component in components}

        self.assertEqual(components[0], {"id": "root", "component": "Column", "children": ["generated-column-1"]})
        self.assertEqual(by_id["generated-column-1"]["component"], "Column")
        self.assertEqual(by_id["generated-column-1"]["children"], ["generated-conceptcard-2"])
        self.assertEqual(by_id["generated-conceptcard-2"]["component"], "ConceptCard")
        validate_a2ui_messages(result)

    def test_unwraps_model_props_wrapper_before_validation_and_rendering(self) -> None:
        wrapped = [
            VALID_MESSAGES[0],
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {"id": "root", "component": "Column", "children": ["path"]},
                        {
                            "id": "path",
                            "component": "LearningPath",
                            "props": {
                                "title": "A real learning path",
                                "activeStepId": "start",
                                "steps": [{"id": "start", "title": "Start here"}],
                            },
                        },
                    ],
                },
            },
        ]

        result = _normalize_a2ui_messages(wrapped)
        path = result[1]["updateComponents"]["components"][1]

        self.assertNotIn("props", path)
        self.assertEqual(path["title"], "A real learning path")
        self.assertEqual(path["steps"][0]["title"], "Start here")
        validate_a2ui_messages(result)

    def test_returns_messages_unchanged_when_already_valid(self) -> None:
        with patch("agent.generation.engine.repair_a2ui_messages") as repair:
            result = _validate_or_repair(object(), VALID_MESSAGES, max_repair_attempts=2)

        repair.assert_not_called()
        self.assertEqual(result, VALID_MESSAGES)

    def test_repairs_once_then_succeeds(self) -> None:
        with patch(
            "agent.generation.engine.repair_a2ui_messages", return_value=VALID_MESSAGES
        ) as repair:
            result = _validate_or_repair(object(), INVALID_MESSAGES, max_repair_attempts=2)

        repair.assert_called_once()
        # The exact validation error must be forwarded so the repair prompt
        # can target the specific problem instead of guessing.
        self.assertIn("catalogId", repair.call_args.args[2])
        self.assertEqual(result, VALID_MESSAGES)

    def test_normalizes_component_with_non_string_type_without_llm_repair(self) -> None:
        malformed = [
            *VALID_MESSAGES[:1],
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [{"id": "root", "component": {"name": "Column"}}],
                },
            },
        ]
        with patch("agent.generation.engine.repair_a2ui_messages") as repair:
            result = _validate_or_repair(
                object(), malformed, max_repair_attempts=2, permitted_custom_components=("ConceptCard",)
            )

        self.assertEqual(result[1]["updateComponents"]["components"], [{"id": "root", "component": "Column"}])
        repair.assert_not_called()

    def test_raises_after_exhausting_repair_attempts(self) -> None:
        with patch(
            "agent.generation.engine.repair_a2ui_messages", return_value=INVALID_MESSAGES
        ) as repair:
            with self.assertRaises(ValueError):
                _validate_or_repair(object(), INVALID_MESSAGES, max_repair_attempts=2)

        self.assertEqual(repair.call_count, 2)

    def test_zero_max_attempts_fails_immediately_without_repair_call(self) -> None:
        with patch("agent.generation.engine.repair_a2ui_messages") as repair:
            with self.assertRaises(ValueError):
                _validate_or_repair(object(), INVALID_MESSAGES, max_repair_attempts=0)

        repair.assert_not_called()


if __name__ == "__main__":
    unittest.main()
