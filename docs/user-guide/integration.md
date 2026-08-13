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

### 4.2 Private knowledge sources (books and notes)

The knowledge-source API implements the ingestion half of a NotebookLM-style
workflow. It keeps the uploaded original file privately and separately stores
chunked text with page locations for retrieval and citations.

Upload a source as multipart form data:

```bash
curl -X POST http://localhost:8008/api/knowledge/sources \
  -F 'file=@./books/attention.pdf' \
  -F 'title=Attention Is All You Need'
```

The response includes an opaque `sourceId`, an `extractionStatus`, and its
`chunkCount`. Text PDFs and text/Markdown files are immediately `ready`.
Scanned PDFs and images can return `needs_ocr`; retain the source and process
it with an OCR worker before using it to generate a course. An image can be
OCR'd immediately when the server has `tesseract` installed. Native text is
never needlessly OCR'd, which preserves headings and text fidelity.

Use one or more ready sources for a new session or a stateless generation
request. `resourceQuery` is used to prioritize relevant chunks; returned text
includes source/page markers for the generator to retain as citations.

```json
{
  "sourceIds": ["src_01abc..."],
  "resourceQuery": "Explain scaled dot-product attention for beginners",
  "language": "zh"
}
```

For local development, metadata defaults to `./data/a2learn-knowledge.sqlite3`
and originals to `./data/knowledge-files`. Set
`A2LEARN_KNOWLEDGE_DB_PATH` and `A2LEARN_KNOWLEDGE_STORAGE_ROOT` in production;
use a private volume or object-storage adapter, never a public static folder.

### 4.3 Book-to-course planning

For a long book, create a course map before generating any individual lesson.
`POST /api/book-course-jobs` samples context across the selected sources and
starts an asynchronous request for an exact 1–100 lesson outline. Poll
`GET /api/book-course-jobs/{jobId}`; once its status is `ready`, use its
`courseId` with `GET /api/book-courses/{courseId}`. The course persists each
lesson with its objectives, concepts, and cited source pages; it does **not**
generate 100 A2UI pages in the same request.

```json
{
  "sourceIds": ["src_01abc..."],
  "lessonCount": 12,
  "language": "zh"
}
```

Generate one planned lesson when the learner opens it (or from a background
worker) with:

```text
POST /api/book-courses/{courseId}/lessons/{lessonId}/generate
```

The response contains a normal asynchronous `sessionId`. Poll
`GET /api/session/{sessionId}/status`, then optionally save its finished A2UI
messages as a PageDocument project through the existing project API. This
keeps retries and edits isolated to one lesson.

### 4.4 Stateless Action (`/api/stateless/action`)
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
