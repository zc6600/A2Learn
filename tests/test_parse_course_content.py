import json

from agent.parse_course_content import convert_course_content


def test_convert_course_content_is_local_and_writes_messages(tmp_path):
    source = tmp_path / "course_content.json"
    destination = tmp_path / "site_messages.json"
    source.write_text(
        json.dumps(
            {
                "siteTitle": "本地解析测试",
                "description": "不需要模型调用。",
                "conceptCard": {
                    "title": "概念",
                    "definition": "定义",
                    "example": "例子",
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    result = convert_course_content(source, destination)

    assert result["course_content_path"] == str(source.resolve())
    assert result["messages_path"] == str(destination.resolve())
    messages = json.loads(destination.read_text(encoding="utf-8"))
    assert messages[0]["createSurface"]["surfaceId"] == "main"
    assert messages[1]["updateComponents"]["components"][0]["component"] == "Column"


def test_convert_course_content_rejects_non_object(tmp_path):
    source = tmp_path / "course_content.json"
    source.write_text("[]", encoding="utf-8")

    try:
        convert_course_content(source)
    except ValueError as exc:
        assert "JSON object" in str(exc)
    else:
        raise AssertionError("Expected a non-object course document to fail")
