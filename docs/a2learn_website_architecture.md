# A2Learn Website Composition and Scene Orchestration Guide (v1.0)

This document focuses on how to assemble A2Learn's base components (Components) into complete webpages (Webpages/Websites) that possess **teaching logic, scene immersion, and interactivity**.

In the A2UI philosophy, components are "LEGO bricks," and this guide provides the "blueprints." We guide the Agent on how to deliver component combinations for different teaching scenarios by defining several classic "Layout Patterns."

---

## 1. Classic Layout Patterns and Component Arrangements

### 1.1 Linear Interactive Waterfall
This is the most common basic teaching mode, simulating the process of "a teacher writing on a blackboard step-by-step and asking questions."
- **Layout Characteristics**: A top-down single-column layout (`Column`).
- **Component Arrangement Formula**:
  1. `ConceptCard` (Presents the core concept)
  2. `AnalogyCard` (Provides a vivid analogy to lower the barrier to understanding)
  3. `CodeSnippet` / `DocumentFigure` (Shows hardcore code or diagram evidence)
  4. `QuizCard` / `ClozeTest` (Follows up with an immediate quiz to form a closed loop)
  5. `DeepDivePrompt` (Provides 2-3 directions for further exploration)
- **Applicable Scenarios**: Basic concept science, code syntax explanation, historical events in linear order.

### 1.2 Split-Pane Lab Mode
This mode feels highly practical, with theoretical guidance on the left and practical operation on the right, making it ideal for hardcore skill training.
- **Layout Characteristics**: Left-right 1:1 or 4:6 split-pane layout.
- **Component Arrangement Formula**:
  - **Left Pane (Theory)**: `LearningPath` (Shows current progress) + `ConceptCard` (Explains the theory for the current task).
  - **Right Pane (Practice)**: `InteractiveSandbox` (Full-stack code sandbox) or `SmartAnnotationBoard` (Draft board for essays/code).
- **Interaction Flow**: After completing the practice in the right pane and clicking submit, the Agent on the left provides feedback and lights up the next step in the `LearningPath`.

### 1.3 Immersive Theater
Discards traditional preaching in favor of role-playing and dialogue to enact knowledge points, significantly reducing reading fatigue.
- **Layout Characteristics**: A main layout centered around a dialogue flow.
- **Component Arrangement Formula**:
  1. `KnowledgeTree` / `Timeline` (Sets the background or timeline at the top)
  2. `ScenarioDialogue` (Core: A group-chat style multi-person debate or practical troubleshooting exercise)
  3. `DeepDivePrompt` (Lets users choose a "side" or "join the discussion" at the end)
- **Applicable Scenarios**: Technical trade-off discussions, historical multi-party maneuvering, practical post-mortems of complex troubleshooting.

### 1.4 Non-linear Exploration Showcase
Suitable for "dictionary-style" or "encyclopedia-style" learning, where there is no mandatory order and users are encouraged to click around based on interest.
- **Layout Characteristics**: Grid layout (`Grid` / `Row`), with information spread out flat.
- **Component Arrangement Formula**:
  1. `SectionNavigator` (Entry points to several core modules at the top)
  2. `KnowledgeTree` (Breadcrumb navigation as an intermediate state)
  3. Multiple `ConceptCard` (Displayed flat)
- **Interaction Flow**: Every user click (`onConceptClick`) "expands in place" a new card on the page rather than jumping to a new one.

---

## 2. Website Scene Examples (Website Mapping)

To help the Agent "copy the homework," we have prepared several complete, multi-component page-level JSON examples in the `examples/Website/` directory.

### 2.1 JS Async Introduction (JS Async)
🔗 [Example Link](../packages/a2learn-catalog/examples/Website/js-async.json)
- **Adopted Layout**: **Linear Interactive Waterfall**.
- **Orchestration Logic**:
  1. Start with `Text` to highlight the pain point of "Callback Hell."
  2. Follow with `AnalogyCard` comparing a Promise to "getting a queue ticket at a restaurant."
  3. Use `CodeSnippet` to show the elegant Promise syntax.
  4. Follow immediately with a `ClozeTest` for `async` and `await` keywords.
  5. Close with a `DeepDivePrompt`.

### 2.2 React Component Design Lab (Agent React)
🔗 [Example Link](../packages/a2learn-catalog/examples/Website/agent-react.json)
- **Adopted Layout**: A variant of the **Split-Pane Lab Mode** (combined vertical sandbox).
- **Orchestration Logic**:
  1. Top `LearningPath` indicates this is step 3 of "React Componentization Practice."
  2. Middle `ConceptCard` explains "Lifting State Up."
  3. A large `InteractiveSandbox` in the core area with the language set to JavaScript allows users to run React component code directly.

### 2.3 Conversational Learning Experience (Conversational)
🔗 [Example Link](../packages/a2learn-catalog/examples/Website/conversational.json)
- **Adopted Layout**: **Immersive Theater**.
- **Orchestration Logic**:
  1. Uses `ScenarioDialogue` to simulate a group chat about "Frontend Performance Optimization."
  2. An interviewer, a novice, and an architect "act out a play," explaining Virtual DOM, reflows, and repaints within the chat.

### 2.4 Free Exploration Hall (Non-linear)
🔗 [Example Link](../packages/a2learn-catalog/examples/Website/non-linear.json)
- **Adopted Layout**: **Non-linear Exploration Showcase**.
- **Orchestration Logic**:
  1. Top horizontal `SectionNavigator` allows users to switch between "Web3," "AI," and "Frontend."
  2. Main area features `KnowledgeTree` showing a grid of sub-discipline entries.
  3. This is a typical template for a "Course Home" or "Encyclopedia Home" page.

## 3. Practical Business Case Orchestration (Business Use Cases)

Beyond basic layout patterns, A2Learn emphasizes the **end-to-end user experience flow**. The following two representative business cases demonstrate how the Agent uses the component library to lead users through "leveling up."

### 3.1 Scenario A: Academic Paper Guide (Paper2UI)
**User Intent**: "This paper on the Attention mechanism is too hard, full of math formulas and technical jargon. Please guide me through it."
**Agent Orchestration Strategy**: An "onion-peeling" approach to dimensionality reduction.

* **Step 1: Establishing a Global Identity (Icebreaking)**
  - `PaperAbstract` (Abstract Card): Shows the title and authors, and generates a plain-English TLDR ("This paper says machine translation doesn't need to look at words in order, just 'pay attention' to the key parts").
* **Step 2: Organizing Prerequisite Knowledge and Research Background (Clearing the Mines)**
  - `Timeline`: Lists previous pain points in the field (RNN too slow -> CNN loses long-distance dependencies -> Attention emerges).
  - `LiteratureReference`: Throws out cards for important prerequisite papers as they are mentioned.
* **Step 3: Deep Dive into Core Mechanisms (Storming the Fortress)**
  - `DocumentFigure`: Crops out the core Transformer architecture diagram from the paper. The Agent places hotspot circles on `Encoder` and `Decoder` positions; users hover to see explanations.
* **Step 4: Post-reading Assessment and Consolidation (Closing the Net)**
  - `QuizCard`: "In Self-Attention, where do Q, K, and V typically come from?" (Testing core concepts).
  - `DeepDivePrompt`: After the explanation, provides three divergence buttons: "👨‍💻 See PyTorch Implementation," "🤔 How is this used in ChatGPT today?".

### 3.2 Scenario B: Hardcore Skill Challenge (e.g., Learning Regular Expressions)
**User Intent**: "I want to learn regex, but I get dizzy as soon as I see those symbols."
**Agent Orchestration Strategy**: A high-intensity "Left-brain Theory + Right-brain Practice" immersive bootcamp.

* **Step 1: Lab Environment Initialization (Opening)**
  - Adopt **Split-Pane Mode**.
  - Top Left: `LearningPath` (Shows challenge progress: "Level 1: Meta-characters -> Level 2: Quantifiers...").
  - Right 60% of Screen: A customized `InteractiveSandbox` pre-filled with test text and a matching function.
* **Step 2: Theoretical Introduction and Visualization (Guidance)**
  - Left: Delivers `ConceptCard` explaining the meta-character `\d`.
  - Left: Follows with `AnalogyCard` ("Think of `\d` as a butterfly net that only catches digits 0-9").
* **Step 3: Range Practice and Intelligent Grading (The Firefight)**
  - Left: Delivers `SmartAnnotationBoard` (or a sandbox task with judging) requiring the user to write a regex to match all phone numbers in the right sandbox.
  - **Key Interaction Flow**: The user tries in the right sandbox and clicks submit when they think they're right.
  - **Agent Arbitration**: If the user's regex is `\d{11}`, the Agent doesn't just judge it correct; it also delivers a `CodeSnippet` with line highlighting to show the more rigorous version `^1[3-9]\d{9}$`.
* **Step 4: Gamified Settlement and Promotion (Rewards)**
  - After passing the current level, the `LearningPath` on the left automatically lights up the next level.
  - An elegant `Achievement` badge ("🎉 Congratulations: Digit Catcher") suddenly pops up in the center of the screen, greatly stimulating the user's dopamine.

---

## 4. Design Principles: White Space and Pacing Control

The Agent must follow these pacing control principles when assembling these pages:

1. **Avoid Information Overload**:
   - Within a single page (Surface), do not have more than 2 consecutive hardcore `ConceptCard`s.
   - Use `AnalogyCard` (storytelling) or `QuizCard` (quizzing) to intersperse, giving the brain a chance to breathe.
2. **Always Provide a Next Action**:
   - The bottom of a page **must never be a dead end**.
   - Always place a `DeepDivePrompt` or a `LearningPath` button leading to the next chapter.
3. **Clear Visual Hierarchy**:
   - Important practical work (`InteractiveSandbox`) should occupy the main width of the page.
   - Auxiliary `ResourceList` should be placed at the very bottom as optional extended reading.
