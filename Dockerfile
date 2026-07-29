# A2Learn BYOK Session API backend.
#
# This image serves only the FastAPI backend (apps/api) used by the "online"
# / BYOK generation mode. It does NOT need OPENROUTER_API_KEY baked in — every
# visitor supplies their own OpenRouter key from the browser (see
# agent/llm.py:build_llm, which prefers the per-request key over any server
# env var). The frontend (apps/viewer) is a separate static build; see
# DEPLOY.md for how the two pieces fit together.

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Only what the backend actually imports at runtime:
# - agent/            core generation pipeline
# - apps/__init__.py + apps/api/   FastAPI app
# - packages/a2learn-catalog/examples/Website  few-shot examples used in prompts
COPY agent ./agent
COPY apps/__init__.py ./apps/__init__.py
COPY apps/api ./apps/api
COPY packages/a2learn-catalog/examples/Website ./packages/a2learn-catalog/examples/Website

# Lock this down to your homepage's real origin(s) in production, e.g.
# "https://yourname.dev,https://yourname.github.io" — do not leave this as
# "*" once you have a domain, since the API otherwise accepts requests (with
# visitor-supplied keys) from any site that embeds it.
ENV A2LEARN_ALLOWED_ORIGINS=*

EXPOSE 8008
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8008"]
