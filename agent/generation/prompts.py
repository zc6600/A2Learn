"""System prompt templates and prompt builders for course generation."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

from ..core.config import DEFAULT_CATALOG_ID
from .profile import load_reference_examples


def language_instruction(target_language: str) -> str:
    if target_language == "en":
        return "Use English for every learner-facing string."
    return "Use Simplified Chinese for every learner-facing string."


def load_a2ui_examples_text(
    target_language: str,
    example_ids: tuple[str, ...] | None = None,
) -> str:
    if example_ids is not None:
        return load_reference_examples(example_ids, target_language)

    repo_root = Path(__file__).resolve().parent.parent.parent
    examples_dir = repo_root / "packages" / "a2learn-catalog" / "examples" / "Website"
    if target_language == "en":
        examples_dir = repo_root / "apps" / "viewer" / "public" / "examples" / "en"
    if not examples_dir.exists():
        return ""
    examples = []
    for file_path in sorted(examples_dir.glob("*.json")):
        try:
            raw_array = json.loads(file_path.read_text(encoding="utf-8"))
            wrapped = json.dumps({"a2ui_messages": raw_array}, ensure_ascii=False)
            examples.append(f"Example ({file_path.name}):\n{wrapped}")
        except Exception:
            continue
    if not examples:
        return ""
    return "\n\nHere are some examples of valid A2UI message arrays:\n" + "\n\n".join(examples)


def curriculum_system_prompt(target_language: str = "zh") -> str:
    return textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST output a curriculum plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - {language_instruction(target_language)}
        - Be concise and structured.
        - Include: title, summary, learningObjectives (array), modules (array).
        - Each module: id, title, goals (array), keyConcepts (array), activities (array of strings).
        """
    ).strip()


def site_plan_system_prompt(
    target_language: str = "zh",
    enabled_components: tuple[str, ...] | None = None,
) -> str:
    component_choices = ", ".join(enabled_components) if enabled_components is not None else (
        "LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt, "
        "ScenarioDialogue, SocialMoments, Timeline, ClozeTest, InteractiveSandbox, ResourceList, "
        "PaperAbstract, LiteratureReference, InteractiveFormula"
    )
    return textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST output a site plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - {language_instruction(target_language)}
        - Include: siteTitle, surfaces (array).
        - Each surface: surfaceId, title, description, moduleId (optional), recommendedComponents (array).
        - recommendedComponents must be chosen only from: {component_choices}.
        - HARD CAP: at most 4 surfaces total, even for a broad/complex topic.
          The next generation step writes rich, detailed content for every
          surface in a single response with a finite token budget — more
          surfaces here directly risks that response getting cut off before
          finishing valid JSON. Prefer merging closely related sub-topics into
          one surface over adding a 5th+ surface.
        - recommendedComponents per surface: at most 6, for the same reason.
        """
    ).strip()


def a2ui_system_prompt(
    target_language: str,
    scope_instruction: str,
    enabled_components: tuple[str, ...] | None = None,
    example_ids: tuple[str, ...] | None = None,
    visual_intent: str = "",
    image_generation_limit: int = 2,
) -> str:
    lang_instruction = (
        "TARGET LANGUAGE: CHINESE (简体中文). All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in clear, engaging, professional Chinese."
        if target_language == "zh" else
        "TARGET LANGUAGE: ENGLISH. All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in fluent, clear, engaging, professional English."
    )

    component_constraint = (
        "- COMPONENT ALLOWLIST: You may use only these custom learning components: "
        + (", ".join(enabled_components) or "none")
        + ". Column and Text remain available for structural layout. Do not use any other custom learning component."
        if enabled_components is not None
        else "- Components MUST be practical for interactive learning and should prefer: LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt, ScenarioDialogue, SocialMoments, Timeline, ClozeTest, InteractiveSandbox, ResourceList, PaperAbstract, LiteratureReference, InteractiveFormula."
    )
    visual_instruction = (
        f"- VISUAL AND CONTENT INTENT: {visual_intent}\n"
        "  Reflect this intent through hierarchy, content density, and component choice. Do not output CSS."
        if visual_intent
        else ""
    )
    image_budget_instruction = (
        "- AUTOMATIC IMAGE BUDGET: Do not request generated images. Omit imagePrompt and imageUrl entirely."
        if image_generation_limit == 0
        else f"- AUTOMATIC IMAGE BUDGET: The image service may create at most {image_generation_limit} images for this entire generation. Across all ScenarioDialogue messages and SocialMoments posts, include at most {image_generation_limit} concise `imagePrompt` values, only for essential scenes. Never invent imageUrl values: imagePrompt is not a URL. If the service reaches its limit or fails, it will silently omit the image."
    )

    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST directly output A2UI v0.9 messages.
        {scope_instruction}

        {lang_instruction}

        Hard requirements:
        - TOKEN BUDGET (读完再写，非常重要): this response has a finite token
          budget. A response that runs out of budget mid-JSON is invalid and
          the ENTIRE generation fails — a shorter but complete, valid response
          is always better than a longer one that gets cut off. Be concise and
          information-dense rather than exhaustive:
          - Per component, use roughly 250-650 characters for a meaningful
            explanation when the topic requires it. Prefer 2-4 connected
            sentences over a one-line definition, while still avoiding
            repetition and unnecessary filler.
          - ScenarioDialogue: at most 4-5 message turns total.
          - DragAndDropMatch: use only for genuine one-to-one relationships.
            It accepts optional title, instruction, leftLabel, rightLabel,
            successMessage, incorrectMessage, and matchExplanations; keep its
            leftItems/rightItems/correctMatches contract intact.
          - For poetry or classical text, ScenarioDialogue may use variant "wechat-group" for a multi-reader discussion, or "correspondence" for a restrained two-person exchange across distance. Keep every message grounded in the original; a correspondence must be clearly framed as an interpretive reimagining, not a quotation. SocialMoments may present 2-4 chronological posts with comments; imageUrls must only use real, supplied public URLs and must be omitted when none are available. Never invent image URLs.
          - DetailedExplanation: cover the 2-3 most important points, not an
            exhaustive list.
          - Do not repeat the same explanation, example, or term definition
            across multiple components — say it once, well.
        - Your response is parsed as raw JSON (no markdown fence needed or
          wanted). A component's text/content string may contain literal
          backtick characters (e.g. to show code) — that's fine, they're just
          characters inside a JSON string; just make sure the string itself is
          properly JSON-escaped (e.g. real newlines inside it written as \\n).
        - Every message MUST include: "version": "v0.9".
        - Must include createSurface and updateComponents.
        - createSurface.catalogId MUST be "{DEFAULT_CATALOG_ID}".
        {component_constraint}
        {visual_instruction}
        {image_budget_instruction}
        - SOCIAL NARRATIVE COMPONENT PROTOCOL:
          ScenarioDialogue accepts `variant` ("dialogue", "wechat-group", or
          "correspondence"),
          optional `groupName` and `groupNotice`, a `characters` object whose
          entries have `name`, `avatar`, and `alignment`, plus `messages` with
          `characterId`, `content`, optional `imagePrompt`, optional `imageUrl`, and optional `delayMs`.
          SocialMoments accepts a `posts` array. Each post needs `id`, `author`,
          and `content`; it may have `avatar`, `imagePrompt`, `imageUrls` (at most four),
          `location`, `time`, `likes`, and `comments` ({{author, role, content}}).
          Comments can bring historical contemporaries, later dynasty admirers, or
          readers together with descriptive `role` tags (e.g. "唐代挚友", "宋代知音", "诗家点评").
          Use these only when they help learners enter a concrete scene or hear
          distinct interpretations; social UI is never a substitute for close
          reading of the source text.
        - INLINE TERM NOTES: For a difficult word, allusion, or technical term
          inside DetailedExplanation, use exactly `<dfn title="short, plain
          explanation">term</dfn>`. Use this sparingly: annotate only terms
          that genuinely block comprehension, never ordinary words or every
          sentence.
        - 5-STEP PROBLEM-DRIVEN MODULE METHODOLOGY:
          Every module MUST strictly follow these 5 sequential steps internally:
          1. Introduce the background and practical pain point.
          2. Build a first-principles model and explain why the naive approach fails.
          3. Explain the key conceptual shift.
          4. Show how the idea is implemented in practice.
          5. Summarize the module with an intuitive takeaway and connected terminology.
        - PURE CONTENT TITLES:
          Write clean, direct subject-matter titles for all components and headers.
        - CONCRETE REAL EXAMPLES (用具体数据步步演推代替抽象公式):
          When explaining data structures or algorithms, NEVER use abstract formulas like "shifting half the array O(N)".
          ALWAYS provide a concrete step-by-step numeric trace:
          1. State the exact initial data (e.g., `[10, 20, 30, 50, 60]`).
          2. State the target operation (e.g., "Insert 25").
          3. Trace each memory move step-by-step (e.g., "60 -> index 5, 50 -> index 4, 30 -> index 3").
          4. Conclude with real-world impact (e.g., "Inserting 1 element forced 3 RAM moves; 1,000,000 items forces 500,000 RAM moves!").
        - EXPLANATION DEPTH AND TERM ORDER: Explain one important idea at a
          time. When a technical term appears for the first time, immediately
          explain it in plain language and, when appropriate, wrap that term
          with a semantic HTML definition tag. Do not define one unfamiliar
          term with two or three other unexplained terms. If a new term is
          necessary, introduce it with its role, a concrete example, and why
          the learner needs it before using it as a building block.
        - GLOSSARY & TERM ANNOTATION: Weave key terms into a connected
          paragraph rather than stacking a list of definitions. Each paragraph
          should connect the mechanism, an example, and the practical effect.
        - CLEAN CONCEPT CARD EXAMPLES: Never wrap ConceptCard example strings in HTML tags like <pre><code>...</code></pre>. Use clean plain text lines with arrow flow steps.
        - EXPLANATORY CODE COMMENTS: Whenever you generate a code block,
          InteractiveSandbox snippet, or code-like example, add substantial
          inline comments to every non-trivial step. Each comment should tell
          the learner what the line does, why it is needed, and, when useful,
          show the concrete input, intermediate value, or expected output.
          Do not merely repeat the API or function name; explain the mechanism
          in plain language so a learner can follow the code without guessing
          what an unfamiliar term means.
        - MARKDOWN EXAMPLES: For ConceptCard `example` fields that mix prose
          and code, use real Markdown: keep each list item on its own line,
          leave a blank line before code, and wrap every code sample in a
          fenced block such as ```conf or ```python. Never concatenate prose,
          configuration directives, and code onto one line.
        - Output format example:
          {{"a2ui_messages": [
            {{"version":"v0.9","createSurface":{{"surfaceId":"main","catalogId":"{DEFAULT_CATALOG_ID}"}}}},
            {{"version":"v0.9","updateComponents":{{"surfaceId":"main","components":[...]}}}}
          ]}}
        """
    ).strip()

    examples_text = load_a2ui_examples_text(target_language, example_ids)
    if examples_text:
        system_prompt += "\n" + examples_text
    return system_prompt


_a2ui_system_prompt = a2ui_system_prompt


def repair_system_prompt() -> str:
    return textwrap.dedent(
        """
        You are an A2Learn agent that fixes an invalid A2UI v0.9 message
        array. You will be given the array and the exact validation error it
        failed with. Return ONLY a corrected JSON object of the form
        {"a2ui_messages": [...]} containing the FULL array (every message,
        not just the changed ones) with ONLY the problem described by the
        error fixed. Do not rewrite, shorten, or otherwise change any
        content that the error doesn't mention.
        """
    ).strip()
