# Developer Guide: A2UI Spec & Catalog Integration

A2Learn relies on the **A2UI v0.9 specification** to render interactive educational showcases. This document explains the integration details between A2Learn and A2UI.

---

## 1. Version and Renderers

A2Learn targets the **v0.9** spec, utilizing `@a2ui/lit` and `@a2ui/web_core` to render custom elements.

### Available Renderers in A2UI:
- `@a2ui/lit` (Main renderer used in our Viewer).
- `@a2ui/react`
- `@a2ui/angular`

All renderers share the same core engine defined in `@a2ui/web_core`.

---

## 2. Key Code Entry Points in A2UI

If you need to debug or explore the internal A2UI engine, check the following directories inside `third_party/A2UI/`:
- **Lit client examples**:
  - `third_party/A2UI/samples/client/lit/shell/app.ts`
  - `third_party/A2UI/samples/client/lit/shell/client.ts`
- **v0.9 Base renderer documentation**:
  - `third_party/A2UI/renderers/lit/README.md`
  - `third_party/A2UI/renderers/react/README.md`
- **Client setup guide**:
  - `third_party/A2UI/docs/guides/client-setup.md`
- **MCP integration guide**:
  - `third_party/A2UI/docs/guides/a2ui_over_mcp.md`

---

## 3. Integration Mental Model

The standard lifecycle loop of an A2UI integration consists of four main phases:

1. **Initialization**:
   The client application initializes a `MessageProcessor` and passes the component catalog (`a2learnCatalog`).
2. **Receiving Message Stream**:
   The Agent generates and returns a list of A2UI messages (e.g. `createSurface`, `updateComponents`, `updateDataModel`).
3. **Processing and Rendering**:
   The client application processes the messages by calling `processMessages()` and maps the surfaces onto the screen using the `<a2ui-surface>` rendering element.
4. **Interaction Callbacks**:
   When the user triggers actions inside the component elements, the event controller captures the action payload and dispatches it back to the Agent for state updating.

---

## 4. Security Considerations

All component templates and generated data from the AI Agent are treated as **untrusted input** on the client side:
- **Sanitization**: Before rendering HTML definitions or analogies, run content strings through our custom sanitize processor:
  - [sanitize.ts](file:///Users/frank/github_project/A2Learn/packages/a2learn-catalog/components/sanitize.ts)
- **Isolation**: When rendering HTML dynamically, restrict layout scripts using appropriate Content Security Policies (CSP).
- **Credentials**: Never pass sensitive backend keys or credentials directly to the client side.
