# Deploying A2Learn to a Personal Homepage

A2Learn has two independent pieces you can deploy separately:

1. **Static frontend** (`apps/viewer`) — the example gallery (7 pre-generated showcases, no API key needed) plus the BYOK ("Bring Your Own Key") UI. This alone is enough to showcase the project.
2. **Backend API** (`apps/api`, FastAPI) — only needed if you want the "⚡ 实时生成 Showcase" button to actually generate *new* content live. It never needs your own OpenRouter key: every request carries the visitor's own key (see `agent/llm.py:build_llm`), so hosting it costs you compute, not API credits.

You can ship just #1 today and add #2 later — the frontend already degrades gracefully (it shows a clear "backend not configured" message instead of silently failing) when no API URL is set.

---

## Path A — Static-only (example gallery + BYOK UI, no backend)

```bash
bash setup.sh            # if you haven't already (installs deps, fetches A2UI)
npm run viewer:build      # builds apps/viewer/dist
```

Upload the contents of `apps/viewer/dist/` to any static host — your homepage's file server, GitHub Pages, Cloudflare Pages, Netlify, etc.

What visitors get:
- A "📚 案例陈列" strip of the 7 reference examples (`hash-table`, `agent-react`, `js-async`, `conversational`, `non-linear`, `paper-attention`, `biophysics-ai`), fully static, no key required.
- A 中文/English toggle for the default showcase.
- A "⚙️ API Key" / "⚡ 实时生成" flow that's visible but will show a friendly message telling them live generation isn't configured yet (until you deploy Path B).

**Subpath hosting caveat:** the built `index.html` references assets with absolute paths (`/assets/...`). This works fine on a custom domain or a GitHub Pages *user* site (`yourname.github.io`), but will 404 on a GitHub Pages *project* subpage (`yourname.github.io/A2Learn/`) unless you set Vite's `base` option to `/A2Learn/` and rebuild. If you hit that, add `base: "/A2Learn/"` to `apps/viewer/vite.config.ts` before building.

---

## Path B — Add the live BYOK backend

### 1. Build and run the backend container

```bash
docker build -t a2learn-api .
docker run -p 8008:8008 \
  -e A2LEARN_ALLOWED_ORIGINS="https://your-homepage-domain.com" \
  a2learn-api
```

Deploy this image to any host that runs containers — Render, Railway, Fly.io, a small VPS, etc. (pick whichever you already use; nothing here is platform-specific). You just need the resulting service to be reachable over HTTPS.

Important: don't set `OPENROUTER_API_KEY` on the server. Leaving it unset keeps the deployment strictly BYOK — the backend only ever uses whatever key the visitor pastes into the "⚙️ API Key" modal in their own browser (stored in their `localStorage`, sent as an `Authorization: Bearer <key>` header per request, never persisted server-side).

Always set `A2LEARN_ALLOWED_ORIGINS` to your real homepage domain(s) once you have one — the default `*` in the Dockerfile is fine for testing but means *any* website can call your API using a visitor's key.

### 2. Rebuild the frontend pointing at your backend

```bash
VITE_A2LEARN_API_URL="https://your-api-host.example.com" npm run viewer:build
```

Re-upload the new `apps/viewer/dist/` output. The "⚡ 实时生成 Showcase" button and preset chips will now call your deployed backend, using whatever key each visitor configures.

### 3. Sanity check

- `curl https://your-api-host.example.com/healthz` should return `{"status": "ok"}`.
- Open your homepage, click "⚙️ API Key", paste a real OpenRouter key, click a preset chip — it should generate a new showcase.

---

## Notes

- There's no built-in rate limiting or abuse protection on the API. Since every request uses the visitor's own key, you're not on the hook for OpenRouter costs, but a scripted flood of requests still costs you server compute/bandwidth. If that's a concern, put the backend behind a reverse proxy with basic rate limiting (e.g. Caddy/Nginx/Cloudflare).
- The example JSON files live in `apps/viewer/public/examples/` (Chinese) and `apps/viewer/public/examples/en/` (English); add a new pair of files there (and to `EXAMPLE_META` in `apps/viewer/src/main.ts`) to extend the static gallery — see `contribution.md` for the full authoring guide. Keep component/surface `id`s identical between the two language versions so deep links (`#/surface-...`) keep working after a language switch.
