# A2Learn Reference: Integration Modes & Component Updates

This reference details the two integration scenarios for A2Learn showcases and explains how components are updated dynamically through a single, growing A2UI message log.

---

## 1. Integration Scenarios

A2Learn supports two deployment models to suit different hosting and architectural requirements:

### Case 1: Direct Generation (Standalone Preview)
In this scenario, A2Learn acts as a self-contained content generator and previewer.
- **Offline Generation**: The tool reads static Markdown or prompt inputs and outputs a single `site_messages.json` file. The standalone React/Vite viewer is launched directly to serve this static file.
- **Online Agent Loop**: A local FastAPI server serves as the agent backend. Clicking buttons in the standalone viewer triggers API roundtrips that compute new learning paths or syllabus steps on the fly.
- **Use Case**: Rapid prototyping, local review of academic papers, and lightweight standalone educational sites.

### Case 2: Project Integration (Embedded Canvas)
In this scenario, A2Learn is embedded inside a host platform (e.g. an LMS like Moodle, a documentation portal, or an enterprise portal).
- **iframe Embeds**: The frontend viewer is deployed onto a static server or CDN. Host pages embed it inside an `<iframe>` passing custom query parameters:
  - `embed=1` to hide branding/headers.
  - `mode=online` or `mode=offline`.
  - `apiBaseUrl` or `messagesUrl` pointing to the backend API or JSON payload.
- **JS SDK (`@a2learn/embed`)**: Allows custom styling overrides, custom authentication tokens (`Authorization` header mapping), and canvas lifecycle triggers.
- **Web Components**: Host platforms can import `@a2learn/embed` and directly render `<a2learn-embed>` tags inside their HTML markup.
- **Stateless API integration**: If the host system wants to manage user sessions and state database tables on its own, it can interact with A2Learn's stateless REST endpoints:
  - `/api/stateless/init` to obtain the initial component spec list.
  - `/api/stateless/action` to send user inputs (e.g., clicking a button) alongside the current component layout, returning only the updated increment.

---

## 2. Component Update Mechanism (Event Log Model)

A2Learn does **not** maintain separate state files for initial setup and updates. Instead, it models pages and states as a **single, sequential event log**.

### 2.1 The Message Array Structure
A session or static page is represented by a single array of JSON message objects. Updates are simply appended to the end of this array:

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "site-main",
      "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "site-main",
      "components": [
        {
          "id": "my-sandbox",
          "component": "InteractiveSandbox",
          "code": "print('hello world')",
          "status": "idle"
        }
      ]
    }
  },
  
  // -- User executes the sandbox code. The backend appends this incremental update: --
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "site-main",
      "components": [
        {
          "id": "my-sandbox",
          "component": "InteractiveSandbox",
          "status": "running"
        }
      ]
    }
  }
]
```

### 2.2 Processing Updates in Frontend and Backend
- **Backend Deep-Merge**: In online mode, the session store keeps the message log. When a user action is processed, the backend deep-merges the new properties (`{**existing, **new_increment}`) into its server-side dictionary of active components and returns only the incremental `updateComponents` block to the client.
- **Frontend Reactive Merging**: The client-side `MessageProcessor` processes the stream sequentially. For each `updateComponents` block, it matches components by `id` and merges the new fields into the active component models. The underlying Lit/React UI is reactive; it detects these partial prop modifications and dynamically updates only the affected DOM nodes without resetting unselected page components or user input states.
