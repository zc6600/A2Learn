# A2Learn Discussion Summary

## Project Goals

- Input: A set of teaching resources (file or directory).
- AI automatically understands the resources and builds a teaching website.
- Output: An accessible URL (local preview or deployment URL).

## Two Building Modes

### Fast Mode (One-pass Generation)

- Fully understands resources first, then generates the initial version of the website in one pass.
- Supports continuous modification by the user through chat after generation.
- Pros: Fast, provides immediate results.

### Deep Mode (Autonomous Iteration)

- Agent continuously explores and completes the filesystem.
- No preset fixed loop goals; relies on AI autonomous judgment for the next action and convergence timing.
- Humans can intervene at any time to adjust direction.

## Architectural Consensus

- Both modes share the same resource parsing, content generation, site rendering, and publishing capabilities.
- Prioritize Fast Mode to produce a minimum runnable version as soon as possible.
- Technical framework finalized as OpenRouter + LangGraph.

## A2UI Integration Direction

- A2UI will be introduced as the subsequent "Generative Interaction Layer," prioritizing v0.9.
- Fast Mode has been implemented using the A2UI framework as requested: generating A2UI v0.9 messages and rendering them with `@a2ui/lit`.
