# Fast Mode Generation Rubric

Use this rubric for a real, source-grounded Fast mode run. Fast mode is
deliberately a single model request, so a response that fails a hard gate is
not silently repaired or scored as publishable.

## Hard gates

All of these must pass before assigning a quality score:

1. The response parses as A2UI v0.9 and passes `validate_a2ui_messages`.
2. It contains exactly one `createSurface` and one matching
   `updateComponents` for `fast-lesson`.
3. The component list contains one root `Column`, every child id resolves, and
   no component uses a `props` wrapper.
4. Every custom component is in the selected component allowlist and follows
   its catalog contract. For example, `ScenarioDialogue.characters` is keyed
   by character id and each message uses `characterId` plus `content`.
5. Learner-facing strings use the requested language and the result contains
   no placeholders, ungrounded citations, or invented image URLs.

## Quality score (100 points)

| Dimension | Points | What to look for |
| --- | ---: | --- |
| Source fidelity and technical correctness | 25 | Explains the supplied material accurately; makes no unsupported factual claims. |
| Teaching arc and clarity | 20 | Establishes the learner problem, introduces terms in plain language, and ends with a usable takeaway. |
| Concrete worked example | 15 | Walks through a small, checkable example rather than relying only on abstract definitions. |
| Check for understanding | 15 | Includes a short, answerable activity or question whose answer follows from the lesson. |
| Component fit and renderability | 15 | Uses 3–6 meaningful components, with no empty, duplicate, or visually inert component. |
| Concision and instruction adherence | 10 | One self-contained lesson, no course plan, no filler, and respects the stated learner level. |

## Decision rule

- **85–100:** publishable Fast mode result.
- **70–84:** usable but improve the prompt or chosen component set, then rerun.
- **Below 70, or any hard-gate failure:** do not publish; fix the generator
  contract or prompt and rerun.

Record the source prompt, selected components, model, raw A2UI messages,
per-dimension scores, and the specific evidence for every deduction. Do not
store API keys in evaluation artifacts.
