import base64
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from agent.generation.media.image_generation import GeneratedImageStore, enrich_a2ui_messages_with_images


class _Response:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"data": [{"b64_json": base64.b64encode(b"png-bytes").decode("ascii")}]} 


class ImageGenerationTests(unittest.TestCase):
    def test_store_uses_openrouter_and_reuses_a_cached_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = GeneratedImageStore(Path(directory))
            with patch("agent.generation.media.image_generation.requests.post", return_value=_Response()) as post:
                first = store.generate("misty river at night", "test-key")
                second = store.generate("misty river at night", "test-key")
        self.assertEqual(first, second)
        self.assertTrue(first and first.startswith("/api/generated-images/"))
        post.assert_called_once()
        self.assertEqual(post.call_args.kwargs["json"]["model"], "bytedance-seed/seedream-4.5")

    def test_enrichment_honors_the_global_limit_and_ignores_overflow(self) -> None:
        messages = [{
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "main",
                "components": [{
                    "id": "moments",
                    "component": "SocialMoments",
                    "posts": [
                        {"id": "one", "imagePrompt": {"literalString": "moon above a river"}},
                        {"id": "two", "imagePrompt": {"literalString": "boat in the mist"}},
                    ],
                }],
            },
        }]
        with tempfile.TemporaryDirectory() as directory:
            store = GeneratedImageStore(Path(directory))
            with patch.object(GeneratedImageStore, "generate", return_value="/api/generated-images/a") as generate:
                enrich_a2ui_messages_with_images(messages, image_limit=1, api_key="test-key", store=store)
        posts = messages[0]["updateComponents"]["components"][0]["posts"]
        self.assertIn("imageUrls", posts[0])
        self.assertNotIn("imageUrls", posts[1])
        generate.assert_called_once_with("moon above a river", "test-key")


if __name__ == "__main__":
    unittest.main()
