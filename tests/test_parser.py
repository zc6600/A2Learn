# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Unit tests for the A2UI parser module."""

from agent.core.validate import validate_a2ui_messages
from agent.generation.parser import parse_json_to_a2ui


def test_parse_json_to_a2ui_all_fields():
    data = {
        "siteTitle": "Test Course",
        "description": "Test Description",
        "paperAbstract": {
            "title": "Paper Title",
            "authors": ["Author A"],
            "venue": "Conf",
            "year": 2017,
            "abstract": "Abstract",
            "tldr": "TL;DR",
            "pdfUrl": "https://pdf",
            "sourceUrl": "https://src"
        },
        "literatureReference": {
            "citation": "[1]",
            "title": "Ref Paper",
            "authors": ["Author 1"],
            "url": "https://ref",
            "highlightQuote": "Quote"
        },
        "learningPath": {
            "title": "Path Title",
            "steps": [{"id": "1", "title": "Step 1"}]
        },
        "conceptCard": {
            "title": "Concept Title",
            "tags": ["tag1"],
            "definition": "Definition",
            "example": "Example",
            "relatedConcepts": ["related"]
        },
        "mentalModel": {
            "title": "Model Title",
            "description": "Model Description",
            "icon": "🧠",
            "analogy": "Analogy text",
            "diagram": "Diagram ascii",
            "pillars": [{"title": "Pillar 1", "description": "Pillar Description", "icon": "💡"}]
        },
        "interactiveFormula": {
            "latex": "y = x",
            "description": "Desc",
            "variables": {"x": "var x"},
            "derivationSteps": [{"step": "Step 1", "latex": "y=x", "explanation": "exp"}]
        },
        "interactiveSandbox": {
            "title": "Sandbox Title",
            "description": "Sandbox Description",
            "language": "javascript",
            "code": "console.log('hello');",
            "output": "hello"
        },
        "quizCard": {
            "title": "Quiz Title",
            "questions": [
                {
                    "id": "q1",
                    "question": "Q1?",
                    "options": ["A", "B"],
                    "correctIndex": 0,
                    "explanation": "Exp"
                }
            ]
        },
        "detailedExplanation": {
            "title": "Detailed Title",
            "icon": "📖",
            "estimatedReadTime": "2 mins",
            "content": "Detailed content"
        },
        "resourceList": {
            "title": "Resources Title",
            "resources": [{"title": "Res 1", "url": "http://example.com", "description": "Desc", "type": "doc"}]
        }
    }

    messages = parse_json_to_a2ui(data)
    assert isinstance(messages, list)
    assert len(messages) == 2

    # Validate utilizing standard validation logic
    validate_a2ui_messages(messages)

    update_msg = next(m for m in messages if "updateComponents" in m)
    components = update_msg["updateComponents"]["components"]

    # Root should contain children in order
    root = next(c for c in components if c["id"] == "root")
    assert root["component"] == "Column"
    assert root["children"] == [
        "header",
        "intro-text",
        "paper-abstract",
        "literature-reference",
        "learning-path",
        "concept",
        "mental-model",
        "attention-formula",
        "sandbox",
        "quiz",
        "detailed-explanation",
        "resources"
    ]

    # Verify each component is created
    header = next(c for c in components if c["id"] == "header")
    assert header["component"] == "Text"
    assert header["text"] == "Test Course"

    intro = next(c for c in components if c["id"] == "intro-text")
    assert intro["component"] == "Text"
    assert intro["text"] == "Test Description"

    pa = next(c for c in components if c["id"] == "paper-abstract")
    assert pa["component"] == "PaperAbstract"
    assert pa["title"] == "Paper Title"
    assert pa["authors"] == ["Author A"]
    assert pa["venue"] == "Conf"
    assert pa["year"] == 2017

    lr = next(c for c in components if c["id"] == "literature-reference")
    assert lr["component"] == "LiteratureReference"
    assert lr["title"] == "Ref Paper"
    assert lr["citation"] == "[1]"

    lp = next(c for c in components if c["id"] == "learning-path")
    assert lp["component"] == "LearningPath"
    assert lp["title"] == "Path Title"

    concept = next(c for c in components if c["id"] == "concept")
    assert concept["component"] == "ConceptCard"
    assert concept["title"] == "Concept Title"

    model = next(c for c in components if c["id"] == "mental-model")
    assert model["component"] == "MentalModel"
    assert model["title"] == "Model Title"

    formula = next(c for c in components if c["id"] == "attention-formula")
    assert formula["component"] == "InteractiveFormula"
    assert formula["latex"] == "y = x"

    sandbox = next(c for c in components if c["id"] == "sandbox")
    assert sandbox["component"] == "InteractiveSandbox"
    assert sandbox["title"] == "Sandbox Title"

    quiz = next(c for c in components if c["id"] == "quiz")
    assert quiz["component"] == "QuizCard"
    assert quiz["title"] == "Quiz Title"

    detailed = next(c for c in components if c["id"] == "detailed-explanation")
    assert detailed["component"] == "DetailedExplanation"
    assert detailed["title"] == "Detailed Title"

    resources = next(c for c in components if c["id"] == "resources")
    assert resources["component"] == "ResourceList"
    assert resources["title"] == "Resources Title"



def test_parse_json_to_a2ui_empty_fields():
    data = {
        "siteTitle": "Minimal Course"
    }

    messages = parse_json_to_a2ui(data)
    validate_a2ui_messages(messages)

    update_msg = next(m for m in messages if "updateComponents" in m)
    components = update_msg["updateComponents"]["components"]

    root = next(c for c in components if c["id"] == "root")
    assert root["children"] == ["header"]
    assert len(components) == 2  # root + header
