import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agent.generation.llm import (
    _extract_json_array,
    _extract_json_object,
    _invoke_and_parse,
    generate_fast_a2ui_messages,
    generate_a2ui_messages_per_surface,
    repair_a2ui_messages,
)


class ExtractJsonObjectTests(unittest.TestCase):
    def test_parses_plain_object(self) -> None:
        result = _extract_json_object('```json\n{"title": "x"}\n```')
        self.assertEqual(result, {"title": "x"})

    def test_raises_friendly_error_instead_of_raw_json_decode_error(self) -> None:
        # Regression test: the brace-slicing fallback's json.loads() used to
        # be unguarded, so a truncated response (model hit max_tokens
        # mid-object) surfaced as a bare "Expecting value: line N column M"
        # instead of the same friendly ValueError raised elsewhere in this
        # function. See agent/llm.py:_extract_json_object.
        truncated = '```json\n{"title": "x", "modules": [{"id": "m1"}\n```'
        with self.assertRaises(ValueError) as ctx:
            _extract_json_object(truncated)
        self.assertNotIn("Expecting value", str(ctx.exception))
        self.assertIn("did not return a valid JSON object", str(ctx.exception))


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

    def test_survives_incidental_backtick_pair_in_unfenced_json_mode_response(self) -> None:
        # Regression test: with JSON mode on (see build_llm), the response is
        # normally raw JSON with no wrapping ```fence``` at all. If a
        # component's content string happens to contain its own ``` code
        # sample (two backtick-triples, forming what looks like a fence
        # pair), fence-stripping used to run *before* trying to parse the
        # response as-is, so it mistook that incidental pair for the "real"
        # outer fence and sliced out just the tiny span between them —
        # corrupting an otherwise perfectly valid, much larger response. See
        # agent/llm.py:_extract_json_array (this exact shape was reproduced
        # against a real model response during testing).
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
                            "content": "示例：\n```python\nprint('hi')\n```\n完",
                        }
                    ],
                },
            },
            {"version": "v0.9", "createSurface": {"surfaceId": "second"}},
        ]
        # No outer ```json fence — this is what a JSON-mode response looks like.
        text = json.dumps({"a2ui_messages": messages}, ensure_ascii=False)
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

    def test_reports_truncation_clearly_when_finish_reason_is_length(self) -> None:
        # Regression test: a response cut off by max_tokens used to surface
        # as whatever bare exception the parser's json.loads happened to
        # raise (e.g. "Expecting value: line 1427 column 1") instead of an
        # actionable message pointing at the real cause.
        llm = SimpleNamespace(
            invoke=lambda messages: SimpleNamespace(
                content="{truncated",
                response_metadata={"finish_reason": "length"},
            )
        )

        def parser(text: str) -> str:
            raise ValueError("Expecting value: line 1427 column 1 (char 7843)")

        with self.assertRaises(ValueError) as ctx:
            _invoke_and_parse(llm, [], parser, max_attempts=1)
        self.assertIn("truncated", str(ctx.exception))

    def test_retries_when_invoke_itself_raises(self) -> None:
        # Regression test: with JSON mode on, a response cut off at the
        # token limit can make llm.invoke() raise directly (e.g. "Could not
        # parse response content as the length limit was reached") instead
        # of returning an object with truncated .content. That used to be
        # outside the try/except entirely, so it skipped every retry and
        # failed on the very first attempt. See agent/llm.py:_invoke_and_parse.
        calls = {"count": 0}

        def fake_invoke(messages):
            calls["count"] += 1
            if calls["count"] < 2:
                raise RuntimeError("Could not parse response content as the length limit was reached")
            return SimpleNamespace(content='{"ok": true}')

        llm = SimpleNamespace(invoke=fake_invoke)
        result = _invoke_and_parse(llm, [], lambda text: {"parsed": text}, max_attempts=3)
        self.assertEqual(result, {"parsed": '{"ok": true}'})
        self.assertEqual(calls["count"], 2)

    def test_reports_truncation_clearly_when_invoke_raises_length_error(self) -> None:
        def always_raises(messages):
            raise RuntimeError("Could not parse response content as the length limit was reached")

        llm = SimpleNamespace(invoke=always_raises)
        with self.assertRaises(ValueError) as ctx:
            _invoke_and_parse(llm, [], lambda text: text, max_attempts=1)
        self.assertIn("truncated", str(ctx.exception))


class GenerateA2uiMessagesPerSurfaceTests(unittest.TestCase):
    def test_fast_generation_makes_one_parse_attempt_without_reference_examples(self) -> None:
        captured: dict[str, object] = {}

        def fake_invoke_and_parse(llm, messages, parser, max_attempts=3):
            captured["messages"] = messages
            captured["max_attempts"] = max_attempts
            return [{"version": "v0.9", "createSurface": {"surfaceId": "fast-lesson"}}]

        with patch("agent.generation.llm._invoke_and_parse", side_effect=fake_invoke_and_parse):
            result = generate_fast_a2ui_messages(
                object(),
                "A note about FIFO broadcast.",
                enabled_components=("ConceptCard",),
            )

        self.assertEqual(result[0]["createSurface"]["surfaceId"], "fast-lesson")
        self.assertEqual(captured["max_attempts"], 1)
        system_prompt = captured["messages"][0]["content"]
        self.assertIn("FAST MODE", system_prompt)
        self.assertIn("AUTOMATIC IMAGE BUDGET: Do not request", system_prompt)

    def test_calls_llm_once_per_surface_and_concatenates(self) -> None:
        site_plan = {
            "siteTitle": "Hash Map 101",
            "surfaces": [
                {"surfaceId": "s1", "title": "Intro"},
                {"surfaceId": "s2", "title": "Details"},
            ],
        }
        calls = []

        def fake_invoke_and_parse(llm, messages, parser, max_attempts=3):
            calls.append(messages)
            # The user prompt's opening line names the target surfaceId
            # directly; the site-plan overview further down mentions every
            # surfaceId for context, so match on that specific leading phrase
            # rather than a bare substring check.
            surface_id = "s1" if 'surfaceId 为 "s1"' in messages[1]["content"] else "s2"
            return [{"version": "v0.9", "createSurface": {"surfaceId": surface_id}}]

        with patch("agent.generation.llm._invoke_and_parse", side_effect=fake_invoke_and_parse):
            result = generate_a2ui_messages_per_surface(object(), "resource text", site_plan)

        self.assertEqual(len(calls), 2)
        self.assertEqual(
            result,
            [
                {"version": "v0.9", "createSurface": {"surfaceId": "s1"}},
                {"version": "v0.9", "createSurface": {"surfaceId": "s2"}},
            ],
        )

    def test_falls_back_to_single_call_when_site_plan_has_no_surfaces(self) -> None:
        with patch("agent.generation.llm.generate_a2ui_messages", return_value=["fallback"]) as fallback:
            result = generate_a2ui_messages_per_surface(object(), "resource text", {"surfaces": []})

        fallback.assert_called_once()
        self.assertEqual(result, ["fallback"])


class RepairA2uiMessagesTests(unittest.TestCase):
    def test_sends_broken_messages_and_error_then_returns_fixed_array(self) -> None:
        broken = [{"version": "v0.9", "createSurface": {"surfaceId": "main"}}]
        fixed = [
            {
                "version": "v0.9",
                "createSurface": {
                    "surfaceId": "main",
                    "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
                },
            }
        ]
        seen_prompts = {}

        def fake_invoke(messages):
            seen_prompts["system"] = messages[0]["content"]
            seen_prompts["user"] = messages[1]["content"]
            return SimpleNamespace(content=json.dumps({"a2ui_messages": fixed}))

        llm = SimpleNamespace(invoke=fake_invoke)
        result = repair_a2ui_messages(llm, broken, "createSurface.catalogId must be '...'.")

        self.assertEqual(result, fixed)
        self.assertIn("createSurface.catalogId must be", seen_prompts["user"])
        self.assertIn(json.dumps(broken, ensure_ascii=False), seen_prompts["user"])

    def test_retries_via_invoke_and_parse_on_unparseable_repair_response(self) -> None:
        calls = {"count": 0}

        def fake_invoke(messages):
            calls["count"] += 1
            if calls["count"] < 2:
                return SimpleNamespace(content="not json")
            return SimpleNamespace(
                content=json.dumps({"a2ui_messages": [{"version": "v0.9"}]})
            )

        llm = SimpleNamespace(invoke=fake_invoke)
        result = repair_a2ui_messages(llm, [{"broken": True}], "some error", max_attempts=2)

        self.assertEqual(result, [{"version": "v0.9"}])
        self.assertEqual(calls["count"], 2)


if __name__ == "__main__":
    unittest.main()
