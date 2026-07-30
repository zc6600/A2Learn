import json
import unittest
from types import SimpleNamespace

from agent.llm import _extract_json_array, _invoke_and_parse


class ExtractJsonArrayTests(unittest.TestCase):
    def test_parses_array_wrapped_in_plain_fence(self) -> None:
        text = '```json\n[{"version": "v0.9", "createSurface": {"surfaceId": "main"}}]\n```'
        result = _extract_json_array(text)
        self.assertEqual(result, [{"version": "v0.9", "createSurface": {"surfaceId": "main"}}])

    def test_survives_embedded_code_fence_inside_string_value(self) -> None:
        # Regression test: a component's content string containing its own
        # ```code``` block used to make the (then non-greedy) fence regex
        # stop at that inner fence instead of the real closing one, silently
        # truncating the JSON mid-string. See agent/llm.py:_extract_json_array.
        messages = [
            {"version": "v0.9", "createSurface": {"surfaceId": "main"}},
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {
                            "id": "c1",
                            "component": "DetailedExplanation",
                            "content": "example:\n```python\nprint('hi')\n```\ndone",
                        }
                    ],
                },
            },
        ]
        text = "```json\n" + json.dumps(messages, ensure_ascii=False) + "\n```"
        result = _extract_json_array(text)
        self.assertEqual(result, messages)


class InvokeAndParseTests(unittest.TestCase):
    def test_returns_result_on_first_success(self) -> None:
        llm = SimpleNamespace(invoke=lambda messages: SimpleNamespace(content='{"ok": true}'))
        result = _invoke_and_parse(llm, [], lambda text: {"parsed": text})
        self.assertEqual(result, {"parsed": '{"ok": true}'})

    def test_retries_after_parse_failure_then_succeeds(self) -> None:
        calls = {"count": 0}

        def fake_invoke(messages):
            calls["count"] += 1
            if calls["count"] < 3:
                return SimpleNamespace(content="not json")
            return SimpleNamespace(content="valid")

        def parser(text: str) -> str:
            if text != "valid":
                raise ValueError("bad output")
            return text

        llm = SimpleNamespace(invoke=fake_invoke)
        result = _invoke_and_parse(llm, [], parser, max_attempts=3)
        self.assertEqual(result, "valid")
        self.assertEqual(calls["count"], 3)

    def test_raises_last_error_after_exhausting_attempts(self) -> None:
        llm = SimpleNamespace(invoke=lambda messages: SimpleNamespace(content="still not json"))

        def parser(text: str) -> str:
            raise ValueError("always fails")

        with self.assertRaises(ValueError):
            _invoke_and_parse(llm, [], parser, max_attempts=2)


if __name__ == "__main__":
    unittest.main()
