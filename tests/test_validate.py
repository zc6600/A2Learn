import unittest

from agent.validate import validate_a2ui_messages


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


if __name__ == "__main__":
    unittest.main()
