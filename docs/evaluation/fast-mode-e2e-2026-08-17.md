# Fast Mode E2E Evaluation — 2026-08-17

This evaluation used the local OpenRouter credential without recording it,
with model `deepseek/deepseek-v4-flash`, Fast mode, Simplified Chinese, and
the allowlist `ConceptCard`, `DetailedExplanation`, `ScenarioDialogue`, and
`QuizCard`. The shared source requested a beginner lesson about broadcast
message ordering: sender-local FIFO, no global order, causal order, a
three-person group-chat example, and a short check for understanding.

The scoring rubric is [fast-mode-rubric.md](fast-mode-rubric.md). Raw A2UI
artifacts remain local and are intentionally not committed.

## Results

| Run | Prompt revision | Time | Hard gates | Score | Decision |
| --- | --- | ---: | --- | ---: | --- |
| 1 | Original Fast prompt | 28.1 s | Pass | 94 | Publishable sample |
| 2 | Coverage/tree/contract self-check | 12.8 s | Fail | — | Quiz said a later message from the same sender could appear anywhere, contradicting FIFO. |
| 3 | Add all-rules and unique-answer self-check | 56.3 s | Fail | — | Quiz contained a second option that also preserved the stated causal constraint. |
| 4 | Explicitly compare every answer option | 19.2 s | Pass | 96 | Publishable sample |

## Final sample score: 96/100

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Source fidelity and technical correctness | 24/25 | Distinguishes sender-local FIFO, lack of global ordering, and causal order without inventing a global guarantee. |
| Teaching arc and clarity | 20/20 | Begins with the learner-facing failure mode, names each rule plainly, and closes with a compact takeaway. |
| Concrete worked example | 14/15 | Uses Alice, Bob, and a teacher in a concrete chat and explains why a reply must follow its cause. |
| Check for understanding | 14/15 | The question has one intended, source-grounded answer and its explanation follows the stated causal constraint. |
| Component fit and renderability | 15/15 | One root `Column` references five complete children: two concept cards, explanation, dialogue, and quiz. |
| Concision and instruction adherence | 9/10 | One self-contained beginner lesson in Chinese; dense but not a multi-page course plan. |

The final artifact passed `validate_a2ui_messages`, used exactly one
`fast-lesson` surface, resolved every root child id, used only the selected
components, and satisfied the `ScenarioDialogue` object-keyed character and
message-content contract.

## Optimization adopted

Fast mode now asks the model to perform a silent pre-output check for:

1. Coverage of every requested teaching requirement;
2. Resolving root child ids and respecting selected component contracts;
3. Consistency between all taught rules, worked examples, and assessments;
4. Exactly one correct answer after comparing every listed option.

This remains one model call: it is an instruction inside that call, not a
repair pass or an additional judging model. A single successful sample is not
a statistical quality guarantee; repeat the rubric on varied subjects before
changing the default model or declaring a broad quality improvement.
