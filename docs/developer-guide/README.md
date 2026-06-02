# A2Learn Developer Guide

Welcome to the A2Learn Developer Guide! This documentation is designed to help developers understand the internal architecture, add custom interactive components, and handle the A2UI spec integrations.

## Documentation Index

1. **[System Architecture](file:///Users/frank/github_project/A2Learn/docs/developer-guide/architecture.md)**
   - High-level block diagram.
   - Frontend Viewer (React + Vite + Lit).
   - FastAPI Session Backend.
   - Content Generation Pipelines: LangGraph Agent Loop vs. Direct JSON Parser Mode.
   - Inline Expansion (JIT compilation of syllabus modules).

2. **[How to Add a Component](file:///Users/frank/github_project/A2Learn/docs/developer-guide/add-component.md)**
   - Schema design in Zod (`api.ts`).
   - Coding Lit Element web components.
   - Catalog index registration.
   - Adding mockup data & LLM prompting adjustments.

3. **[A2UI Spec & Catalog Integration](file:///Users/frank/github_project/A2Learn/docs/developer-guide/a2ui-integration.md)**
   - Details of `@a2ui/lit`, `@a2ui/web_core`.
   - Message Processor mechanisms.
   - Security considerations (sandbox rendering, CSP validation, HTML sanitization).
