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

### Static narration audio

The bundled narration MP3s are intentionally not part of the Git repository. They
are large binary assets and are better served from object storage or a CDN. Upload
the files from `apps/viewer/public/examples/audio/` using these exact names:

```text
hash-table.zh.mp3
hash-table.en.mp3
```

Then point the frontend build at the public directory or CDN URL:

```bash
VITE_A2LEARN_AUDIO_BASE_URL="https://cdn.example.com/a2learn-audio" npm run viewer:build
```

The URL should contain the directory only; the viewer appends the language-specific
filename. Azure Blob Storage, Cloudflare R2, Amazon S3, and an ordinary CDN all work.
For local development, leave the variable unset and keep the MP3s in the ignored
`apps/viewer/public/examples/audio/` directory.

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

### Path B.1 — MCP compiler endpoint

The same FastAPI container also exposes an MCP Streamable HTTP endpoint at
`/mcp`. It does not call an LLM: the connected Agent requests the course JSON
contract, generates JSON itself, and then calls `compile_course_json` to turn
that JSON into validated A2UI messages.

For a public deployment, configure the host name used in the submitted URL:

```text
A2LEARN_MCP_ALLOWED_HOSTS=your-api-host.example.com
```

If a browser-based MCP client will connect, also set its trusted origin(s):

```text
A2LEARN_MCP_ALLOWED_ORIGINS=https://your-client.example.com
```

The competition submission value should be the full endpoint, for example:
`https://your-api-host.example.com/mcp`. Do not submit `/healthz` or one of the
`/api/...` REST routes; those are not MCP endpoints.

To verify locally after installing dependencies, connect an MCP Inspector to
`http://127.0.0.1:8008/mcp` and confirm that `tools/list` shows
`get_course_generation_spec` and `compile_course_json`. Then call
`compile_course_json` with a small object containing `siteTitle` and
`conceptCard`.

---

## Path C — Kamal + Aliyun ECS + Cloudflare Tunnel

If you'd rather deploy the backend to your own server with zero-downtime rolling deploys and rollback instead of manual `docker run`, use [Kamal](https://kamal-deploy.org). Config lives in this repo:

- `config/deploy.yml` — Aliyun ECS (`114.212.247.110`), ACR registry
- `.kamal/secrets` — reads `KAMAL_REGISTRY_PASSWORD` from your local `.env` (never commit the raw value)

**Before deploying:**

1. `gem install kamal` locally (this is a Python project, so there's no `bin/kamal` bundler binstub — use the plain `kamal` CLI).
2. Add `KAMAL_REGISTRY_PASSWORD=<your ACR access token>` to your local `.env`.
3. Edit `config/deploy.yml`: replace the `proxy.host` placeholder with your real API domain, and set `A2LEARN_ALLOWED_ORIGINS` to your real homepage domain(s).

**Deploy:**

```bash
kamal setup    # first time only
kamal deploy   # every deploy after that
```

**Public access via Cloudflare Tunnel:** since `proxy.ssl: false` in the config, Cloudflare — not kamal-proxy — terminates TLS. Install `cloudflared` on the ECS box and point its tunnel ingress at the Docker bridge gateway, not `localhost` (`cloudflared` runs outside Docker's network namespace):

```yaml
ingress:
  - hostname: api.a2learn.zc6600.wiki
    service: http://172.17.0.1:80   # kamal-proxy listens on :80 inside Docker
  - service: http_status:404
```

This backend has no database and holds no OpenRouter key server-side (BYOK), so there are no `accessories:` or secret env vars beyond the registry password — don't copy Rails/Postgres boilerplate from other Kamal projects into these files.

---

## Notes

- There's no built-in rate limiting or abuse protection on the API. Since every request uses the visitor's own key, you're not on the hook for OpenRouter costs, but a scripted flood of requests still costs you server compute/bandwidth. If that's a concern, put the backend behind a reverse proxy with basic rate limiting (e.g. Caddy/Nginx/Cloudflare).
- The example JSON files live in `apps/viewer/public/examples/` (Chinese) and `apps/viewer/public/examples/en/` (English); add a new pair of files there (and to `EXAMPLE_META` in `apps/viewer/src/main.ts`) to extend the static gallery — see `contribution.md` for the full authoring guide. Keep component/surface `id`s identical between the two language versions so deep links (`#/surface-...`) keep working after a language switch.
