import unittest
from unittest.mock import patch

from agent.generation.engine import _validate_or_repair


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
