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

"""Parser module to convert structured content JSON into A2UI v0.9 messages."""

from typing import Any
from .config import DEFAULT_CATALOG_ID


def parse_json_to_a2ui(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Converts structured course content JSON into standard A2UI messages list."""
    surface_id = "main"
    catalog_id = DEFAULT_CATALOG_ID

    components = []
    children = []

    # 1. Header (siteTitle)
    if data.get("siteTitle"):
        components.append({
            "id": "header",
            "component": "Text",
            "variant": "h1",
            "text": data["siteTitle"]
        })
        children.append("header")

    # 2. Intro Text (description)
    if data.get("description"):
        components.append({
            "id": "intro-text",
            "component": "Text",
            "text": data["description"]
        })
        children.append("intro-text")

    # 2.5 Paper Abstract (paperAbstract)
    pa = data.get("paperAbstract")
    if isinstance(pa, dict) and pa.get("title"):
        components.append({
            "id": "paper-abstract",
            "component": "PaperAbstract",
            "title": pa.get("title"),
            "authors": pa.get("authors", []),
            "venue": pa.get("venue"),
            "year": pa.get("year"),
            "abstract": pa.get("abstract", ""),
            "tldr": pa.get("tldr", ""),
            "pdfUrl": pa.get("pdfUrl"),
            "sourceUrl": pa.get("sourceUrl")
        })
        children.append("paper-abstract")

    # 2.6 Literature Reference (literatureReference)
    lr = data.get("literatureReference")
    if isinstance(lr, dict) and lr.get("title"):
        components.append({
            "id": "literature-reference",
            "component": "LiteratureReference",
            "citation": lr.get("citation", "[1]"),
            "title": lr.get("title"),
            "authors": lr.get("authors", []),
            "url": lr.get("url"),
            "highlightQuote": lr.get("highlightQuote"),
            "onReferenceClick": { "name": "explain_reference", "context": {} }
        })
        children.append("literature-reference")

    # 3. Learning Path (learningPath)
    lp = data.get("learningPath")
    if isinstance(lp, dict) and lp.get("steps"):
        components.append({
            "id": "learning-path",
            "component": "LearningPath",
            "title": lp.get("title", "Learning Path"),
            "activeStepId": lp["steps"][0].get("id", "1") if lp["steps"] else "1",
            "steps": lp["steps"],
            "onStepSelect": { "name": "learning_path_select", "context": {} }
        })
        children.append("learning-path")

    # 4. Concept Card (conceptCard)
    cc = data.get("conceptCard")
    if isinstance(cc, dict) and cc.get("title"):
        components.append({
            "id": "concept",
            "component": "ConceptCard",
            "title": cc.get("title"),
            "tags": cc.get("tags", []),
            "definition": cc.get("definition", ""),
            "example": cc.get("example", ""),
            "relatedConcepts": cc.get("relatedConcepts", [])
        })
        children.append("concept")

    # 5. Mental Model (mentalModel)
    mm = data.get("mentalModel")
    if isinstance(mm, dict) and mm.get("title"):
        components.append({
            "id": "mental-model",
            "component": "MentalModel",
            "title": mm.get("title"),
            "description": mm.get("description", ""),
            "icon": mm.get("icon", "🧠"),
            "analogy": mm.get("analogy", ""),
            "diagram": mm.get("diagram", ""),
            "pillars": mm.get("pillars", [])
        })
        children.append("mental-model")

    # 5.5 Interactive Formula (interactiveFormula)
    formula_data = data.get("interactiveFormula")
    if isinstance(formula_data, dict) and formula_data.get("latex"):
        components.append({
            "id": "attention-formula",
            "component": "InteractiveFormula",
            "latex": formula_data.get("latex"),
            "description": formula_data.get("description"),
            "variables": formula_data.get("variables", {}),
            "derivationSteps": formula_data.get("derivationSteps", [])
        })
        children.append("attention-formula")

    # 6. Interactive Sandbox (interactiveSandbox)
    sb = data.get("interactiveSandbox")
    if isinstance(sb, dict) and sb.get("title"):
        components.append({
            "id": "sandbox",
            "component": "InteractiveSandbox",
            "title": sb.get("title"),
            "description": sb.get("description", ""),
            "language": sb.get("language", "javascript"),
            "code": sb.get("code", ""),
            "status": "success",
            "output": sb.get("output", ""),
            "onRunCode": { "name": "run_sandbox_code", "context": {} },
            "onStatusChange": { "name": "sandbox_status_change", "context": {} }
        })
        children.append("sandbox")

    # 7. Quiz Card (quizCard)
    qc = data.get("quizCard")
    if isinstance(qc, dict) and qc.get("questions"):
        components.append({
            "id": "quiz",
            "component": "QuizCard",
            "title": qc.get("title", "Concept Check"),
            "questions": qc["questions"]
        })
        children.append("quiz")

    # 8. Detailed Explanation (detailedExplanation)
    de = data.get("detailedExplanation")
    if isinstance(de, dict) and de.get("title"):
        components.append({
            "id": "detailed-explanation",
            "component": "DetailedExplanation",
            "title": de.get("title"),
            "icon": de.get("icon", "📖"),
            "estimatedReadTime": de.get("estimatedReadTime", "3 分钟阅读"),
            "content": de.get("content", "")
        })
        children.append("detailed-explanation")

    # 9. Resource List (resourceList)
    rl = data.get("resourceList")
    if isinstance(rl, dict) and rl.get("resources"):
        components.append({
            "id": "resources",
            "component": "ResourceList",
            "title": rl.get("title", "Reference Resources"),
            "resources": rl["resources"]
        })
        children.append("resources")

    # Insert root Column at the beginning of components
    components.insert(0, {
        "id": "root",
        "component": "Column",
        "children": children
    })

    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": surface_id,
                "catalogId": catalog_id
            }
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": surface_id,
                "components": components
            }
        }
    ]
