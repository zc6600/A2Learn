# User Guide: Integration & Embedding

A2Learn showcases can be integrated into third-party web portals or CMS pages using an **iframe**, our **JS SDK**, or as **Web Components (Custom Elements)**. We also provide **Stateless API** endpoints for enterprise applications that manage session states independently.

---

## 1. iframe Integration

Deploy the Viewer static folder (`apps/viewer/dist`) to your web server (e.g. Nginx, Vercel, Netlify, CDN). Once deployed, embed the viewer using an iframe.

### 1.1 Offline Mode (Static)
Load pre-generated A2UI messages directly from a static URL:
- `embed=1`: Hides the viewer header.
- `mode=offline`: Renders static messages.
- `messagesUrl`: URL-encoded location of the generated JSON file.

```html
<iframe
  src="https://your-viewer-host/?embed=1&mode=offline&messagesUrl=https%3A%2F%2Fexample.com%2Fsite_messages.json"
  style="width: 100%; border: 0; min-height: 600px;"
></iframe>
```

### 1.2 Online Mode (Interactive)
Connect directly to a running FastAPI Session API backend:
- `mode=online`
- `apiBaseUrl`: URL-encoded API endpoint of the backend.
- `resourcePath`: Optional path parameter indicating the default resource file to parse.

```html
<iframe
  src="https://your-viewer-host/?embed=1&mode=online&apiBaseUrl=https%3A%2F%2Fapi.your-domain.com&resourcePath=.%2Fdocs"
  style="width: 100%; border: 0; min-height: 600px;"
></iframe>
```

---

## 2. JS SDK Integration

For advanced customization (e.g., custom authentication headers, dynamic theme overrides), we recommend building and using the `@a2learn/embed` SDK package.

### 2.1 Build the SDK
Run this command from the repository root:
```bash
npm run embed:build
```

### 2.2 Usage
```javascript
import { createA2LearnEmbed } from "@a2learn/embed";

const container = document.getElementById("learning-container");

const controller = createA2LearnEmbed({
  container,
  viewerUrl: "https://your-viewer-host/",
  source: {
    mode: "online",
    apiBaseUrl: "https://api.your-domain.com",
    resourcePath: "./docs",
    headers: {
      Authorization: "Bearer <JWT_TOKEN>",
    },
    themeVars: {
      "--a2ui-color-primary": "#10b981",  // Customize showcase brand color
      "--a2ui-font-size-m": "16px",
    },
  },
});

// Control commands
// controller.reload();
// controller.destroy();
```

---

## 3. Web Components (Custom Elements)

You can also use custom elements directly in HTML markup:

```html
<div id="wrapper"></div>

<script type="module">
  import "@a2learn/embed";

  const el = document.createElement("a2learn-embed");
  el.setAttribute("viewer-url", "https://your-viewer-host/");
  el.setAttribute("mode", "offline");
  el.setAttribute("messages-url", "https://example.com/site_messages.json");
  document.getElementById("wrapper").appendChild(el);
</script>
```

---

## 4. Stateless API Integration

If your enterprise backend manages user sessions, database entries, and states, you can call the A2Learn FastAPI backend as a pure stateless service.

### 4.1 Init Generation (`/api/stateless/init`)
Generates the initial A2UI message list from a path or text prompt.
- **Request**:
  ```json
  {
    "resource_path": "./docs/some_file.md",
    "resource_text": null
  }
  ```
- **Response**:
  Returns the complete initial A2UI message JSON array. No session is created in the API server memory.

### 4.2 Stateless Action (`/api/stateless/action`)
Evaluates user interaction callbacks (e.g. step selection, code run) and returns incremental update messages.
- **Request**:
  ```json
  {
    "action": {
      "name": "learning_path_select",
      "sourceComponentId": "learning-path",
      "surfaceId": "main",
      "context": {
        "stepId": "2"
      }
    },
    "components": {
      "learning-path": {
        "id": "learning-path",
        "component": "LearningPath",
        "steps": [ ... ]
      }
    },
    "surface_ids": ["main"],
    "action_count": 1
  }
  ```
- **Response**:
  Returns only the incremental update messages (e.g. `updateComponents`) representing the new state, allowing your host site to update its local state.
