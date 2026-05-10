# A2UI Integration Knowledge Records

## Goal

Document key knowledge points, code paths, and implementation suggestions for A2Learn's integration with A2UI.

## Version and Renderer Selection

- New projects are recommended to prioritize A2UI v0.9.
- Available Web renderers:
  - `@a2ui/lit` + `@a2ui/web_core`
  - `@a2ui/react` + `@a2ui/web_core`
  - `@a2ui/angular` + `@a2ui/web_core`

## Key Code Entry Points (A2UI Repository)

- Lit sample client:
  - `third_party/A2UI/samples/client/lit/shell/app.ts`
  - `third_party/A2UI/samples/client/lit/shell/client.ts`
- v0.9 Base renderer documentation:
  - `third_party/A2UI/renderers/lit/README.md`
  - `third_party/A2UI/renderers/react/README.md`
- Client integration guide:
  - `third_party/A2UI/docs/guides/client-setup.md`
- MCP integration guide:
  - `third_party/A2UI/docs/guides/a2ui_over_mcp.md`

## Minimal Integration Mental Model (v0.9)

1. Client creates a `MessageProcessor`, passing in the catalog (e.g., `basicCatalog`).
2. Agent returns an A2UI message stream (e.g., `createSurface`, `updateComponents`, `updateDataModel`).
3. Client calls `processMessages()`, then renders the surface using `A2uiSurface`.
4. After a user triggers a component action, the client sends the action back to the Agent.

## Relationship between Agent and A2UI

- Current implementation uses Agent to directly produce A2UI messages:
  - LangGraph reads resources and triggers LLM to generate message arrays.
  - Python performs strict validation on A2UI v0.9 messages and exports them.
  - `apps/viewer` uses `@a2ui/lit` to render the messages.

## A2Learn Current Implementation Points

- Generator (OpenRouter + LangGraph): `agent/main.py`, `agent/engine.py`
- Message storage: `outputs/<task_id>/site_messages.json`
- A2UI frontend renderer: `apps/viewer/src/main.ts`

## MCP Direction (Future)

If following the MCP path:

- Server returns `application/json+a2ui` Embedded Resource via `tools/call`.
- Client detects MIME and hands it over to the A2UI renderer.
- action/error are called back to the server via MCP tools.

## Security Considerations

- All Agent-produced UI data is treated as untrusted input.
- Data validation, rendering isolation, link whitelisting, and CSP security measures are required.
- Do not expose sensitive credentials to the frontend in production environments.
