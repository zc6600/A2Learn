from apps.api.mcp_server import (
    compile_course_json,
    configure_mcp_publisher,
    get_course_generation_spec,
    publish_course,
)
from apps.api.page_document_store import build_page_document_store
from apps.api.project_store import build_project_store


def test_generation_spec_describes_supported_contract():
    spec = get_course_generation_spec()

    assert spec["a2ui_version"] == "v0.9"
    assert "ConceptCard" in spec["supported_components"]
    assert "GenerativeLab" in spec["supported_components"]
    assert spec["course_json_schema"]["properties"]["conceptCard"]["required"] == ["title"]
    assert spec["course_json_schema"]["properties"]["generativeLab"]["required"] == ["title", "html", "javascript"]
    for component in (
        "Timeline",
        "ScenarioDialogue",
        "DragAndDropMatch",
        "RelationshipMatch",
        "DeepDivePrompt",
    ):
        assert component in spec["supported_components"]

    assert spec["course_json_schema"]["properties"]["timeline"]["required"] == ["events"]
    assert spec["course_json_schema"]["properties"]["scenarioDialogue"]["required"] == [
        "characters",
        "messages",
    ]
    assert "poetry-ink" in spec["supported_themes"]


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


def test_compile_course_json_supports_generative_lab():
    result = compile_course_json(
        {
            "siteTitle": "Pendulum lab",
            "generativeLab": {
                "title": "Pendulum",
                "html": "<canvas id='pendulum'></canvas>",
                "javascript": "a2learn.setHeight(360);",
                "initialProps": {"gravity": 9.81},
            },
        },
        enabled_components=["GenerativeLab"],
    )

    assert result["ok"] is True
    update = next(message["updateComponents"] for message in result["messages"] if "updateComponents" in message)
    lab = next(component for component in update["components"] if component["component"] == "GenerativeLab")
    assert lab["initialProps"] == {"gravity": 9.81}


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


def test_compile_course_json_supports_poetry_components():
    result = compile_course_json(
        {
            "siteTitle": "《春江花月夜》",
            "description": "诗词互动阅读",
            "detailedExplanation": {"title": "原文与微注", "content": "春江潮水连海平。"},
            "timeline": {
                "variant": "journey",
                "events": [{"id": "rise", "time": "第一幕", "title": "明月共潮生"}],
            },
            "scenarioDialogue": {
                "variant": "correspondence",
                "characters": {
                    "tower": {"name": "楼上人", "alignment": "left"},
                    "boat": {"name": "江上人", "alignment": "right"},
                },
                "messages": [{"characterId": "tower", "content": "此时相望不相闻。"}],
            },
            "dragAndDropMatch": {
                "leftItems": [{"id": "rise", "content": "海上明月共潮生"}],
                "rightItems": [{"id": "scene", "content": "铺开夜景"}],
                "correctMatches": {"rise": "scene"},
            },
            "relationshipMatch": {
                "leftItems": [{"id": "moon", "content": "月"}],
                "rightItems": [{"id": "time", "content": "时间"}],
                "correctMatches": {"moon": "time"},
            },
            "deepDivePrompt": {
                "prompts": [{"id": "p1", "label": "月亮如何承载相思？"}],
            },
        }
    )

    assert result["ok"] is True
    assert result["component_count"] == 9
    update = next(message["updateComponents"] for message in result["messages"] if "updateComponents" in message)
    assert [component["component"] for component in update["components"]] == [
        "Column",
        "Text",
        "Text",
        "DetailedExplanation",
        "Timeline",
        "ScenarioDialogue",
        "DragAndDropMatch",
        "RelationshipMatch",
        "DeepDivePrompt",
    ]


def test_publish_course_persists_a_page_and_returns_viewer_url():
    page_documents = build_page_document_store()
    project_store = build_project_store(page_documents)
    configure_mcp_publisher(project_store, "https://viewer.example.test")

    result = publish_course(
        {
            "siteTitle": "春江花月夜",
            "description": "诗词互动阅读",
            "detailedExplanation": {"title": "原文与微注", "content": "春江潮水连海平。"},
        },
        theme_id="poetry-ink",
    )

    assert result["ok"] is True
    assert result["url"].startswith("https://viewer.example.test/?project=mcp-")
    assert "themeId=poetry-ink" in result["url"]
    assert result["componentCount"] == 4
    project, documents = project_store.get(result["projectId"])
    assert project.source == "generated"
    assert documents[0].surface_id == "main"
    assert documents[0].components[0].id == "root"
