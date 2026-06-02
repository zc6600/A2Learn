# User Guide: Features & Core Concepts

A2Learn positions itself not as a traditional learning platform, but as an **Interactive Knowledge Showcase** website. This guide explains the core features, component catalog, and design/layout patterns that A2Learn uses to format educational content.

---

## 1. Product Positioning

A2Learn serves as a "museum guide" or curator for complex technical topics. Instead of reading dry, non-interactive documents, users explore knowledge via:
- **Interactive Exhibits**: Components like quizzes, flip cards, and sandboxes that promote hands-on learning.
- **Micro-interactivity**: Dynamic feedback loops that expand details when user selections are made (e.g. clicking steps on a learning path).
- **Curated Flow**: Structure designed to present theory first, analogies to build intuition next, and interactive code/quizzes to reinforce understanding.

---

## 2. Core Interactive Components

A2Learn maps knowledge points onto several core visual fixtures:

### 2.1 Macro Navigation
- **`LearningPath`**: Renders a progression timeline representing the learning steps of a course. In online mode, selecting a step sends a request to the agent to dynamically present the corresponding section.
- **`KnowledgeTree`**: Renders a hierarchical mind-map or tree of topics, helping the learner visualize parent-child node relationships.
- **`SectionNavigator`**: A grid layout displaying cards for different course modules, enabling non-linear navigation between pages.

### 2.2 Micro & Theory Displays
- **`ConceptCard`**: Renders a standard definition card featuring titles, tags, precise HTML-formatted definitions, and code/text examples.
- **`MentalModel`**: Renders a high-level representation of a complex structural topic containing:
  - An emoji icon and description.
  - A real-world **Analogy** (e.g. comparing the event loop to a restaurant queue).
  - A text/ASCII **Diagram**.
  - A list of **Pillars** (core parts of the model).
- **`DetailedExplanation`**: Renders a deep-dive article supporting full rich markdown (lists, quotes, bold styling).
- **`PaperAbstract`**: Renders academic paper metadata (title, authors, venue, year), abstract text, and an AI-generated TL;DR key takeaways callout block.
- **`LiteratureReference`**: Renders a clean academic citation card showing literature title, authors, source link, and a relevant highlight quote from the text.
- **`InteractiveFormula`**: Displays LaTeX mathematical formulas inside high-contrast boxes with interactive hover explanations for variables/symbols and collapsible derivation accordion steps.
- **`ScenarioDialogue`**: Simulates a dialogue flow (like a chat screen) between multiple characters to demonstrate debates or troubleshooting steps.
- **`ResourceList`**: Placed at the bottom of the page, listing external references, articles, or video links.

### 2.3 Interactive props
- **`QuizCard`**: Presents a list of multiple-choice questions with immediate grading and detailed explanations.
- **`ClozeTest`**: Presents fill-in-the-blank text challenges for active recall practice.
- **`InteractiveSandbox`**: A live code sandbox displaying instructions on the left and a runnable code snippet editor/terminal on the right.
  > [!NOTE]
  > To optimize learning pacing, `InteractiveSandbox` and programming-specific components are restricted by LLM guardrails to only generate for computer science and coding topics.

---

## 3. Page Layout Patterns

To prevent information overload, A2Learn arranges components into four standard layout patterns:

### 3.1 Linear Interactive Waterfall
A single-column vertical layout that paces information step-by-step.
- **Components**: `ConceptCard` $\rightarrow$ `AnalogyCard` $\rightarrow$ `DocumentFigure/Code` $\rightarrow$ `QuizCard` $\rightarrow$ `DeepDivePrompt`.
- **Use Case**: Quick introductions to basic concepts.

### 3.2 Split-Pane Lab Mode
A split screen presenting theory on the left and practice on the right.
- **Components**: Left pane uses `LearningPath` + `ConceptCard`. Right pane uses `InteractiveSandbox` or `SmartAnnotationBoard`.
- **Use Case**: Programming bootcamps, regex practices.

### 3.3 Immersive Theater
A layout centering on characters debating a topic.
- **Components**: `KnowledgeTree` (at top) $\rightarrow$ `ScenarioDialogue` $\rightarrow$ `DeepDivePrompt` (at bottom).
- **Use Case**: Advanced architectural trade-off discussions.

### 3.4 Non-linear Exploration Showcase
A grid layout for reference manuals or dictionaries.
- **Components**: `SectionNavigator` $\rightarrow$ `KnowledgeTree` $\rightarrow$ multiple `ConceptCard`s.
- **Use Case**: Reference documentation, catalog landing pages.
