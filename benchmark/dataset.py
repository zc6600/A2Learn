"""Benchmark dataset loader and task definition schemas."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


DATASET_DIR = Path(__file__).parent / "tasks"


@dataclass
class BenchmarkTask:
    """Represents a standardized evaluation task for Data Analyst & A2UI generation."""

    id: str
    title: str
    category: str
    description: str
    input_data: dict[str, Any]
    expected_criteria: dict[str, Any] = field(default_factory=dict)
    raw_path: str = ""

    def to_system_user_prompt(self, target_format: str = "a2ui") -> tuple[str, str]:
        """Generate standardized system and user prompts for this benchmark task."""
        input_json_str = json.dumps(self.input_data, ensure_ascii=False, indent=2)

        if target_format == "course_content":
            system_prompt = (
                "You are an expert Data Analyst and Pedagogical Course Designer. "
                "Transform the provided dataset and domain problem into a rich interactive learning experience."
            )
            user_prompt = (
                f"# Task: {self.title}\n"
                f"Description: {self.description}\n\n"
                f"## Input Data / Dataset (JSON):\n"
                f"```json\n{input_json_str}\n```\n\n"
                f"## Instructions:\n"
                f"1. Perform comprehensive data analysis and highlight key trends, anomalies, and insights.\n"
                f"2. Structure the explanation into an intuitive cognitive scaffolding.\n"
                f"3. Formulate diagnostic quiz questions targeting common conceptual misconceptions.\n"
                f"4. Include high-quality external resources with valid web URLs (e.g. documentation, papers, official specs).\n"
                f"5. Output a single JSON object conforming to A2Learn course_content structure with 'siteTitle', 'description', 'dialogue', 'mentalModel', 'quiz', 'resources', etc.\n"
            )
        else:
            system_prompt = (
                "You are an expert Educational AI and Interactive UI Engine.\n"
                "Your job is to analyze the provided dataset / problem and generate an interactive pedagogical site "
                "outputting a single JSON object with key 'a2ui_messages' containing valid A2UI v0.9 messages.\n\n"
                "### A2Learn Available Rich Component Catalog:\n"
                "- ScenarioDialogue: 痛点引入双人/群聊对话 (id, speakerA, speakerB, dialogue: [{speaker, text}])\n"
                "- MentalModel: 核心心智模型与架构图 (id, title, description, pillars: [{title, description}], diagram?: string)\n"
                "- DataTable: 结构化数据矩阵 (id, title, columns: [{key, label}], rows: [{id, cells: {key: val}}])\n"
                "- InteractiveFormula: 可交互公式与参数释义 (id, title, formula/latex: 'LaTeX string', variables: [{name, label, default, unit, description}])\n"
                "- CodeSnippet: 算法或量化计算逻辑 (id, title, language: 'python', code: string)\n"
                "- QuizCard: 形成性诊断测验 (id, question: string, options: string[], correctIndex: number, explanation: string)\n"
                "- DeepDivePrompt: 进阶思考挑战 (id, title, prompt: string, hints: string[])\n"
                "- Timeline: 时序演进/行动路线图 (id, title, events: [{time, title, description}])\n"
                "- ResourceList: 权威参考资料与可访问网址 (id, title, resources: [{title, description, url}])\n\n"
                "### Critical Generation Rules:\n"
                "1. Real Authoritative URLs: All URLs in `ResourceList` MUST be real, accessible external HTTPS URLs (e.g., https://arxiv.org/..., https://hbr.org/..., https://support.google.com/..., https://github.com/...). NEVER invent placeholder domains like example.com.\n"
                "2. Concrete Numbers & Data Grounding: Reference exact metrics, sums, and percentages from the input dataset.\n"
                "3. Problem-Driven Scaffolding: Follow a logical progression: Pain Point Dialogue -> Mental Model -> Data Table / Formula -> Diagnostic Quiz -> External Resources.\n"
                "4. Top-level Component Properties: Do NOT wrap component properties in a 'props' dictionary. All fields must be direct top-level keys.\n\n"
                "You MUST return ONLY valid JSON matching this exact envelope:\n"
                "{\n"
                '  "a2ui_messages": [\n'
                "    {\n"
                '      "version": "v0.9",\n'
                '      "createSurface": {\n'
                '        "surfaceId": "main",\n'
                '        "catalogId": "https://a2learn.ai/spec/v1/catalog.json"\n'
                "      }\n"
                "    },\n"
                "    {\n"
                '      "version": "v0.9",\n'
                '      "updateComponents": {\n'
                '        "surfaceId": "main",\n'
                '        "components": [\n'
                '          {"id": "intro", "component": "ScenarioDialogue", "speakerA": "Analyst", "speakerB": "Lead", "dialogue": [...]},\n'
                '          {"id": "model", "component": "MentalModel", "title": "...", "pillars": [...]},\n'
                '          {"id": "table", "component": "DataTable", "title": "...", "columns": [...], "rows": [...]},\n'
                '          {"id": "formula", "component": "InteractiveFormula", "title": "...", "formula": "...", "variables": [...]},\n'
                '          {"id": "quiz", "component": "QuizCard", "question": "...", "options": [...], "correctIndex": 0, "explanation": "..."},\n'
                '          {"id": "links", "component": "ResourceList", "title": "权威延伸资源", "resources": [{"title": "...", "description": "...", "url": "https://..."}]}\n'
                "        ]\n"
                "      }\n"
                "    }\n"
                "  ]\n"
                "}\n"
            )
            user_prompt = (
                f"# Task: {self.title}\n"
                f"Description: {self.description}\n\n"
                f"## Input Data / Dataset (JSON):\n"
                f"```json\n{input_json_str}\n```\n\n"
                f"## Requirements:\n"
                f"1. Perform deep data analysis and distill core insights, trade-offs, and mechanics.\n"
                f"2. Build a problem-driven learning progression with rich interactive components selected from the catalog.\n"
                f"3. Include a `ResourceList` component providing high-quality, relevant external documentation or research URLs (https://...).\n"
                f"4. Provide diagnostic `QuizCard` questions targeting conceptual misconceptions with clear explanations.\n"
                f"5. Return ONLY the JSON object with key 'a2ui_messages' without markdown wrapping or conversational commentary."
            )
        return system_prompt, user_prompt


def load_task(task_path: str | Path) -> BenchmarkTask:
    """Load a benchmark task from a JSON file."""
    path = Path(task_path)
    if not path.is_file():
        raise FileNotFoundError(f"Task file not found: {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    return BenchmarkTask(
        id=data.get("id", path.stem),
        title=data.get("title", "Untitled Task"),
        category=data.get("category", "general"),
        description=data.get("description", ""),
        input_data=data.get("input_data", {}),
        expected_criteria=data.get("expected_criteria", {}),
        raw_path=str(path.resolve()),
    )


def load_benchmark_suite(task_ids: list[str] | None = None) -> list[BenchmarkTask]:
    """Load all or filtered benchmark tasks from the dataset directory."""
    if not DATASET_DIR.exists():
        return []

    tasks: list[BenchmarkTask] = []
    for f in sorted(DATASET_DIR.glob("*.json")):
        task = load_task(f)
        if task_ids is None or task.id in task_ids:
            tasks.append(task)
    return tasks
