# Integration Guide (iframe + SDK / Custom Elements)

This repository provides two ways to integrate the viewer:

1) **iframe**: Deploy the Viewer as a static page and embed it using an iframe.
2) **SDK / Custom Elements**: Install an npm package in the host website and mount it to any DOM like a component.

Both methods support two data modes:

- **Offline**: Fetch A2UI v0.9 messages JSON (a JSON array) from `messagesUrl`.
- **Online**: Connect to the Session API (`/api/session/start` + `/api/session/{id}/action`), supporting interaction callbacks and incremental updates.

## 1. iframe Integration (Easiest)

### 1.1 Deploy Viewer Static Site

In the repository root:

```bash
npm install
npm run viewer:build
```

Build output directory: `apps/viewer/dist/`. Deploy this directory to any static site hosting (Nginx, Vercel, Netlify, CDN, etc.).

### 1.2 Offline Mode (messages URL)

iframe `src` parameters:

- `embed=1`: Hides the header, suitable for embedding.
- `mode=offline`
- `messagesUrl=<URL-encoded>`: Points to the A2UI messages JSON.

Example:

```html
<iframe
  src="https://your-viewer-host/?embed=1&mode=offline&messagesUrl=https%3A%2F%2Fexample.com%2Fsite_messages.json"
  style="width: 100%; border: 0;"
></iframe>
```

Note: If `messagesUrl` is on a different domain than the Viewer, the `messagesUrl` server must allow cross-origin requests (returning `Access-Control-Allow-Origin`).

### 1.3 Online Mode (Session API)

iframe `src` parameters:

- `embed=1`
- `mode=online`
- `apiBaseUrl=<URL-encoded>`: Your Session API root address (e.g., `https://api.example.com`).
- `resourcePath=<optional>`: The `resource_path` sent to `/api/session/start`.

Example:

```html
<iframe
  src="https://your-viewer-host/?embed=1&mode=online&apiBaseUrl=https%3A%2F%2F127.0.0.1%3A8008&resourcePath=.%2Fdocs"
  style="width: 100%; border: 0;"
></iframe>
```

Note: If the host website and the Session API are on different domains, you need to configure `A2LEARN_ALLOWED_ORIGINS` (comma-separated) on the API side, for example:

```bash
A2LEARN_ALLOWED_ORIGINS=https://your-host.com,https://your-viewer-host
```

If the online API requires authentication (header/token), it is recommended not to put it in the URL; the SDK method below is more appropriate.

### 1.4 Style Overrides (Theme CSS Variables)

The Viewer renders inside an iframe, and the host site's CSS will not affect it by default. To change themes (colors, font size, border-radius, etc.), pass CSS variables via the URL:

- `themeVars=<URL-encoded JSON>`: A JSON object where keys must start with `--` (only CSS variables are allowed).

Example:

```html
<iframe
  src="https://your-viewer-host/?embed=1&mode=offline&messagesUrl=https%3A%2F%2Fexample.com%2Fsite_messages.json&themeVars=%7B%22--a2ui-color-primary%22%3A%22%2310b981%22%2C%22--a2ui-font-size-m%22%3A%2218px%22%7D"
  style="width: 100%; border: 0;"
></iframe>
```

## 2. SDK Integration (More Flexible, Recommended for Production with Auth)

### 2.1 Installation and Building (Local use)

```bash
npm install
npm run embed:build
```

### 2.2 JS SDK: createA2LearnEmbed

```ts
import { createA2LearnEmbed } from "@a2learn/embed";

const container = document.getElementById("preview")!;

const controller = createA2LearnEmbed({
  container,
  viewerUrl: "https://your-viewer-host/",
  source: {
    mode: "online",
    apiBaseUrl: "https://api.example.com",
    resourcePath: "./docs",
    headers: {
      Authorization: "Bearer <token>",
    },
    themeVars: {
      "--a2ui-color-primary": "#10b981",
      "--a2ui-font-size-m": "18px",
    },
  },
});

// controller.destroy()
// controller.reload()
```

### 2.3 Custom Elements: <a2learn-embed>

```html
<div id="root"></div>

<script type="module">
  import "@a2learn/embed";

  const el = document.createElement("a2learn-embed");
  el.setAttribute("viewer-url", "https://your-viewer-host/");
  el.setAttribute("mode", "offline");
  el.setAttribute("messages-url", "https://example.com/site_messages.json");
  document.getElementById("root").appendChild(el);

  // For online mode with authentication:
  // el.headers = { Authorization: "Bearer <token>" }
  // el.themeVars = { "--a2ui-color-primary": "#10b981" }
  // el.setAttribute("mode", "online")
  // el.setAttribute("api-base-url", "https://api.example.com")
  // el.setAttribute("resource-path", "./docs")
  // To trigger re-mount: set any attribute (or remove and then append again)
</script>
```

## 3. Communication Between Viewer and Host (Auto Height)

The Viewer sends the following message to the parent page:

- `{ type: "a2learn:resize", height: number }`

The SDK automatically adjusts the iframe height to this value.

## 4. Data Format (Offline messages JSON)

Offline mode requires `messagesUrl` to return an **A2UI v0.9 messages JSON array**.
Minimal example:

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "main",
      "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "main",
      "components": [
        { "id": "t1", "component": "Text", "text": "Hello" }
      ]
    }
  }
]
```
