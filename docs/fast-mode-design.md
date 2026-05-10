# Agent Pipeline Design Document (OpenRouter + LangGraph)

## Goal

Achieve the following in the shortest path:

- Input: Teaching resources (file or directory).
- AI: One-pass understanding and generation.
- Rendering: Use A2UI framework to render and produce an accessible teaching website URL.

## Workflow

1. Resource Reading: Scan files/directories, extract text content.
2. Curriculum Planning: LLM generates course title, audience, and chapter structure.
3. Site Content Generation: LLM generates explanations, key points, exercises, and quizzes for each chapter.
4. A2UI Message Conversion: Convert structured results into A2UI v0.9 messages.
5. A2UI Rendering: Render pages via `@a2ui/lit` + `@a2ui/web_core`.
6. Local Publishing: Vite starts the viewer and returns the URL.

## LangGraph State Chart (Linear Graph)

- `init_output` -> `load_resource` -> `plan_curriculum` -> `build_site` -> `generate_messages` -> `export_messages`

State Fields:

- `resource_path`: Input path.
- `resource_text`: Parsed resource text.
- `curriculum`: Structured curriculum planning data.
- `site_plan`: Structured site plan data.
- `a2ui_messages`: A2UI message array.
- `output_dir`: Output directory.

## OpenRouter Configuration

- Environment Variables:
  - `OPENROUTER_API_KEY` (Required for real LLM generation).
  - `OPENROUTER_MODEL` (Optional, defaults to a general-purpose model).
- Configured via `langchain_openai.ChatOpenAI`:
  - `base_url=https://openrouter.ai/api/v1`
  - `api_key=$OPENROUTER_API_KEY`

## Failure and Fallback Strategy

- If no API Key is provided or a call fails, throw an error and abort execution.
- Limit reading volume to avoid excessively long prompts from large resources.

## Output Structure (Current Implementation)

- `outputs/<task_id>/curriculum.json`
- `outputs/<task_id>/site.json`
- `outputs/<task_id>/site_messages.json`
- `apps/viewer/public/generated/site_messages.json`
- Preview URL: `http://127.0.0.1:<port>`

## Future Evolution

- Replace the HTML generation layer with the A2UI v0.9 rendering layer.
- Add an interface for incremental chat modifications (edit chapters, replace exercises, update difficulty).
- Add Deep Mode (autonomous iteration without preset goals).
