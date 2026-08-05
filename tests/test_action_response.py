import unittest
from unittest.mock import patch

from agent.generation.action_response import build_action_response


class ActionResponseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.components = {
            "lp-1": {
                "id": "lp-1",
                "component": "LearningPath",
                "activeStepId": "step1",
            }
        }
        self.action = {
            "name": "onStepSelect",
            "surfaceId": "main",
            "sourceComponentId": "lp-1",
            "context": {"stepId": "step2"},
        }

    def test_fallback_is_used_when_llm_call_fails(self) -> None:
        with patch("agent.generation.action_response._build_llm_messages", side_effect=RuntimeError("llm down")):
            messages = build_action_response(
                action=self.action,
                components=self.components,
                surface_ids=["main"],
                action_count=1,
            )
        self.assertEqual(len(messages), 1)
        update = messages[0]["updateComponents"]
        comp = update["components"][0]
        self.assertEqual(comp["id"], "lp-1")
        self.assertEqual(comp["activeStepId"], "step2")

    def test_fallback_is_used_when_llm_returns_invalid_incremental_payload(self) -> None:
        with patch("agent.generation.action_response._build_llm_messages", return_value=[{"version": "v0.9"}]):
            messages = build_action_response(
                action=self.action,
                components=self.components,
                surface_ids=["main"],
                action_count=2,
            )
        self.assertEqual(len(messages), 1)
        self.assertIn("updateComponents", messages[0])


if __name__ == "__main__":
    unittest.main()
