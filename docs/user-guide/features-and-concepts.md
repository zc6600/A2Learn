# User Guide: Features & Core Concepts

A2Learn positions itself not as a traditional learning platform, but as an **Interactive Knowledge Showcase** website. This guide explains the 5-Step Problem-Driven Teaching Framework, the component catalog, and the design patterns that A2Learn uses to format educational content.

---

## 1. 5-Step Problem-Driven Teaching Framework

All A2Learn-generated content (both LLM-generated and hand-crafted examples) follows a structured pedagogical flow designed to maximize learning depth and engagement.

### The Framework at a Glance

| Step | Component(s) | Pedagogical Role |
|---|---|---|
| **Step 1: Pain Point Hook** | `AnalogyCard` + `ScenarioDialogue` | Establish *why* this matters with a real engineering or research pain point. Use **peer researcher dialogue** — two experts exploring a problem together — rather than a teacher-student explanation style. |
| **Step 2: Mental Model** | `MentalModel` + `ConceptCard` | Build intuition via real-world analogies, ASCII architecture diagrams, and structural pillars (the "3 pillars of X" pattern). |
| **Step 3: Deep Implementation** | `DetailedExplanation` / `InteractiveFormula` | Go deep with **clean, runnable code** — always prefer direct library calls (`hash()`, `Promise.all`) or minimal pseudocode over fake simulations. |
| **Step 4: Self-Assessment** | `QuizCard` / `ClozeTest` / `DragAndDropMatch` | Reinforce with interactive problems that have insightful explanations, not just correct/wrong answers. |
| **Step 5: Dual-Layer Summary** | `AnalogyCard` (summary variant) | Part 1: a plain-English one-paragraph recap. Part 2: a `📌 术语总结` glossary block with `<dfn title="...">` hover annotations on all key terms. |

> [!IMPORTANT]
> **Dialogue Style**: All `ScenarioDialogue` conversations should simulate **peer researchers** (e.g., two engineers, a PhD student and their advisor) *discovering* the problem together — not a teacher explaining to a student. The dialogue should surface trade-offs and failed attempts, not just the "right" answer.

> [!NOTE]
> **Code Style**: Step 3 implementations must use the "direct library call + minimal pseudocode" style. Avoid simulating things that can't actually run (e.g., fake JS sandboxes that pretend to execute Python). Always show what real production code looks like, then explain the conceptual mechanics.

---

## 2. Core Interactive Components

### 2.1 Narrative & Framing

- **`AnalogyCard`**: The Swiss Army knife of A2Learn. Used in two modes:
  - **Pain-point mode** (Step 1): Presents the real-world problem context and core bottleneck that motivates the topic.
  - **Summary mode** (Step 5): Wraps up with a plain-language recap + `📌 术语总结` glossary block containing `<dfn>` hover annotations for all key terms.
  
- **`ScenarioDialogue`**: Simulates a chat-style conversation between two or more characters (researchers, engineers, domain experts) exploring a technical topic. Characters have names, emoji avatars, and left/right alignment. Key terms can be inline-wrapped with `<dfn title="...">term</dfn>` for hover tooltips.
  
- **`PaperAbstract`**: Renders academic paper metadata (title, authors, venue, year), the full abstract, and an AI-generated TL;DR key takeaways block. Used for the `paper-attention.json` (Transformer attention) example.

### 2.2 Conceptual Displays

- **`MentalModel`**: High-level representation of a complex structural topic. Contains:
  - An emoji icon and description paragraph.
  - A `diagramTitle` + `diagram` (ASCII flow diagram).
  - A `pillarsTitle` + `pillars` array (core sub-components, each with title, description, and icon).
  - An `analogyTitle` + `analogy` (the real-world comparison, supports HTML).

- **`ConceptCard`**: Standard definition card with title, `tags` array, HTML-formatted `definition`, a `example` code block, and `relatedConcepts` links.

- **`DetailedExplanation`**: Deep-dive article supporting full rich Markdown (lists, inline HTML, code blocks with syntax highlighting, blockquotes). Used for "Step 3" implementation deep-dives. Has an `estimatedReadTime` label.

- **`InteractiveFormula`**: Displays mathematical formulas (LaTeX/MathML) with interactive hover explanations for variables and collapsible derivation steps. Used in `paper-attention.json` for the Scaled Dot-Product Attention formula.

- **`LiteratureReference`**: Clean academic citation card showing title, authors, source link, and a highlight quote.

### 2.3 Navigation & Structure

- **`LearningPath`**: A vertical progression timeline of learning steps. Each step has an `id`, `title`, and `targetSurfaceId` pointing to a multi-surface tab. In online mode, selecting a step fires `onStepSelect` to the backend to expand content dynamically. Used in `hash-table.json` as a multi-module navigator (4 modules across 4 surfaces).

- **`SectionNavigator`**: A grid layout of module cards for non-linear chapter navigation.

- **`KnowledgeTree`**: A hierarchical mind-map or breadcrumb-based topic tree for large topic spaces.

### 2.4 Interactive Assessment

- **`QuizCard`**: Multiple-choice question with `options` array, `correctOptionId`, and a detailed `explanation`. Provides immediate feedback on selection.

- **`ClozeTest`**: Fill-in-the-blank challenge with inline `___` blanks that the learner fills from a word bank.

- **`DragAndDropMatch`**: Drag-and-drop matching exercise for term-to-definition or concept-to-example pairing.

### 2.5 Reference

- **`ResourceList`**: External references, articles, videos, or documentation links with icon labels.

---

## 3. Example Catalog

A2Learn ships with 7 fully-realized reference examples in `skill/references/examples/`, each demonstrating the complete 5-Step Framework applied to a different domain.

| File | Topic | Key Components Used |
|---|---|---|
| `hash-table.json` | Hash Tables & Collision (4 modules) | `LearningPath`, `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `DetailedExplanation`, `QuizCard` |
| `agent-react.json` | ReAct Agent Architecture | `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `ConceptCard`, `DetailedExplanation`, `QuizCard` |
| `js-async.json` | JS Async & Event Loop | `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `ConceptCard`, `DetailedExplanation`, `QuizCard` |
| `conversational.json` | JS Closures & Lexical Scope | `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `ConceptCard`, `DetailedExplanation`, `QuizCard` |
| `non-linear.json` | CSS Grid 2D Layout | `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `ConceptCard`, `DetailedExplanation`, `QuizCard` |
| `paper-attention.json` | Transformer Attention | `PaperAbstract`, `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `InteractiveFormula`, `QuizCard` |
| `biophysics-ai.json` | AI-Driven Biophysics (AlphaFold) | `AnalogyCard`, `ScenarioDialogue`, `MentalModel`, `ConceptCard`, `DragAndDropMatch`, `ClozeTest` |

Each example file is automatically synced to three locations:
- `skill/references/examples/<name>.json` — canonical source
- `packages/a2learn-catalog/examples/Website/<name>.json` — catalog package
- `apps/viewer/public/examples/<name>.json` — served by Vite viewer

### Syncing Examples

After editing a canonical source file, run:
```bash
python scratch/sync_public_examples.py
```

---

## 4. Page Layout Patterns

### 4.1 Single-Surface Waterfall (Most Common)
A single `createSurface` + `updateComponents` JSON pair with a `Column` root containing the 5-Step component sequence. Used by `agent-react.json`, `js-async.json`, `conversational.json`, `non-linear.json`, `paper-attention.json`.

### 4.2 Multi-Surface Tabbed (For Progressive Courses)
Multiple `createSurface` blocks produce multiple tabs in the viewer. A `LearningPath` component navigates between surfaces. Used by `hash-table.json` (4 modules = 4 surfaces = 4 tabs).

When loading a multi-surface JSON, the viewer defaults to the **last** `createSurface` tab (the last surface ID is set as the URL hash on load). To navigate to the first module, click the first tab or add `#/surface-module-1` to the URL.

### 4.3 Split-Pane Lab Mode
Left pane: `LearningPath` + `ConceptCard`. Right pane: `DetailedExplanation` or code. Currently not used by examples but available for programming bootcamp-style content.
