import unittest

from agent.core.validate import validate_a2ui_messages
from agent.generation.parser import parse_json_to_a2ui
from agent.generation.profile import (
    MAX_AUTO_GENERATED_IMAGES,
    MAX_ENABLED_COMPONENTS,
    load_reference_examples,
    normalize_generation_profile,
)
from agent.generation.prompts import _a2ui_system_prompt


def _messages(component: str) -> list[dict]:
    return [
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
                    {"id": "root", "component": "Column", "children": ["content"]},
                    {"id": "content", "component": component},
                ],
            },
        },
    ]


class GenerationProfileTests(unittest.TestCase):
    def test_normalizes_selected_components_and_local_examples(self) -> None:
        profile = normalize_generation_profile(
            {
                "enabledComponents": [
                    "AnalogyCard",
                    "ClozeTest",
                    "ConceptCard",
                    "DetailedExplanation",
                    "InteractiveSandbox",
                    "LearningPath",
                    "MentalModel",
                    "QuizCard",
                    "ScenarioDialogue",
                ],
                "exampleIds": ["hash-table"],
                "visualIntent": "诗词赏析，突出原文与逐句注释",
            }
        )
        self.assertIn("ConceptCard", profile.enabled_components)
        self.assertEqual(profile.example_ids, ("hash-table",))
        self.assertIn("诗词", profile.visual_intent)

    def test_rejects_unknown_or_excessive_component_selection(self) -> None:
        with self.assertRaisesRegex(ValueError, "unsupported"):
            normalize_generation_profile(
                {"enabledComponents": ["NotAComponent"], "exampleIds": []}
            )
        with self.assertRaisesRegex(ValueError, "at most"):
            normalize_generation_profile(
                {"enabledComponents": ["ConceptCard"] * (MAX_ENABLED_COMPONENTS + 1), "exampleIds": []}
            )

    def test_all_components_can_be_disabled(self) -> None:
        profile = normalize_generation_profile({"enabledComponents": [], "exampleIds": []})
        self.assertEqual(profile.enabled_components, ())

    def test_example_requires_its_components(self) -> None:
        with self.assertRaisesRegex(ValueError, "requires its example components"):
            normalize_generation_profile(
                {"enabledComponents": ["ConceptCard"], "exampleIds": ["hash-table"]}
            )

    def test_loads_only_selected_reference_examples(self) -> None:
        examples = load_reference_examples(("hash-table",), "zh")
        self.assertIn("Reference example (hash-table)", examples)
        self.assertNotIn("paper-attention", examples)

    def test_poetry_example_combines_reading_and_narrative_path(self) -> None:
        profile = normalize_generation_profile(
            {
                "enabledComponents": ["DetailedExplanation", "DragAndDropMatch", "RelationshipMatch", "ScenarioDialogue", "Timeline"],
                "exampleIds": ["poetry-social"],
            }
        )
        self.assertEqual(profile.example_ids, ("poetry-social",))
        self.assertIn("Timeline", load_reference_examples(profile.example_ids, "zh"))

    def test_prompt_uses_the_selected_components_and_examples(self) -> None:
        prompt = _a2ui_system_prompt(
            "zh",
            "Return one page.",
            ("ConceptCard", "QuizCard"),
            ("hash-table",),
            "诗词赏析，突出原文与逐句注释",
        )
        self.assertIn("ConceptCard, QuizCard", prompt)
        self.assertIn("Reference example (hash-table)", prompt)
        self.assertIn("诗词赏析", prompt)

    def test_social_narrative_components_are_selectable_and_described(self) -> None:
        profile = normalize_generation_profile(
            {"enabledComponents": ["ScenarioDialogue", "SocialMoments"], "exampleIds": []}
        )
        self.assertEqual(profile.enabled_components, ("ScenarioDialogue", "SocialMoments"))
        prompt = _a2ui_system_prompt("zh", "Return one page.", profile.enabled_components)
        self.assertIn("wechat-group", prompt)
        self.assertIn("correspondence", prompt)
        self.assertIn("SocialMoments", prompt)

    def test_prompt_keeps_matching_component_generic(self) -> None:
        prompt = _a2ui_system_prompt("zh", "Return one page.", ("DragAndDropMatch",))
        self.assertIn("genuine one-to-one relationships", prompt)
        self.assertIn("matchExplanations", prompt)

    def test_image_generation_limit_is_bounded_and_reaches_prompt(self) -> None:
        profile = normalize_generation_profile(
            {
                "enabledComponents": ["SocialMoments"],
                "exampleIds": [],
                "imageGenerationLimit": 4,
            }
        )
        self.assertEqual(profile.image_generation_limit, 4)
        prompt = _a2ui_system_prompt("zh", "Return one page.", image_generation_limit=4)
        self.assertIn("at most 4 images", prompt)
        with self.assertRaisesRegex(ValueError, "between 0"):
            normalize_generation_profile(
                {"enabledComponents": [], "exampleIds": [], "imageGenerationLimit": MAX_AUTO_GENERATED_IMAGES + 1}
            )

    def test_validator_rejects_unselected_custom_component(self) -> None:
        validate_a2ui_messages(_messages("ConceptCard"), permitted_custom_components=("ConceptCard",))
        with self.assertRaisesRegex(ValueError, "not enabled"):
            validate_a2ui_messages(_messages("QuizCard"), permitted_custom_components=("ConceptCard",))

    def test_parser_mode_omits_unselected_components(self) -> None:
        messages = parse_json_to_a2ui(
            {
                "siteTitle": "测试课程",
                "conceptCard": {"title": "概念", "definition": "定义"},
                "quizCard": {"questions": [{"id": "q1", "question": "题目", "options": ["A"], "correctIndex": 0}]},
            },
            ("ConceptCard",),
        )
        components = messages[1]["updateComponents"]["components"]
        self.assertEqual({component["component"] for component in components}, {"Column", "Text", "ConceptCard"})


if __name__ == "__main__":
    unittest.main()
