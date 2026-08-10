from apps.api.mcp_server import compile_course_json, get_course_generation_spec


def test_generation_spec_describes_supported_contract():
    spec = get_course_generation_spec()

    assert spec["a2ui_version"] == "v0.9"
    assert "ConceptCard" in spec["supported_components"]
    assert spec["course_json_schema"]["properties"]["conceptCard"]["required"] == ["title"]


def test_compile_course_json_returns_valid_a2ui_messages():
    result = compile_course_json(
        {
            "siteTitle": "Hash Maps",
            "description": "A compact introduction.",
            "conceptCard": {
                "title": "Key-value lookup",
                "definition": "A hash map stores values by key.",
            },
        }
    )

    assert result["ok"] is True
    assert result["a2ui_version"] == "v0.9"
    assert result["surface_id"] == "main"
    assert result["component_count"] == 4
    assert result["messages"][0]["createSurface"]["surfaceId"] == "main"


def test_compile_course_json_reports_component_restrictions():
    result = compile_course_json(
        {"siteTitle": "Restricted"},
        enabled_components=["ConceptCard"],
    )

    assert result["ok"] is True

    rejected = compile_course_json(
        {
            "siteTitle": "Restricted",
            "conceptCard": {"title": "Not enabled"},
        },
        enabled_components=["QuizCard"],
    )

    # The parser omits disabled components; the result remains valid and the
    # calling Agent can use the enabled component list to adjust its JSON.
    assert rejected["ok"] is True
    assert rejected["component_count"] == 2
