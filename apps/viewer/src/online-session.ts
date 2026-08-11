import type { A2uiMessage } from "@a2ui/web_core/v0_9";
import {
  buildHeaders,
  getLang,
} from "./viewer-config";
import type {
  SessionActionResponse,
  SessionStartResponse,
  SessionStatusResponse,
  ViewerSourceOnline,
} from "./viewer-types";
import type { GenerationProfile } from "./generation-profile";

const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 15 * 60 * 1000;

export type OnlineSession = {
  sessionId: string;
  messages: A2uiMessage[];
};

// /api/session/start returns "pending" immediately while the server runs the
// planning and A2UI generation pipeline in the background.
export async function startOnlineSession(
  source: ViewerSourceOnline,
  generationProfile: GenerationProfile,
): Promise<OnlineSession> {
  const headers = buildHeaders(source.headers);
  const startPayload = {
    resource_path: source.resourcePath || undefined,
    resource_text: source.resourceText || undefined,
    sourceIds: source.sourceIds || undefined,
    resourceQuery: source.resourceQuery || undefined,
    language: source.language || getLang(),
    generationProfile,
  };
  const startResponse = await fetch(`${source.apiBaseUrl}/api/session/start`, {
    method: "POST",
    headers,
    body: JSON.stringify(startPayload),
  });
  if (!startResponse.ok) {
    throw new Error(`Online session initialization failed (${startResponse.status})`);
  }

  const startData = (await startResponse.json()) as SessionStartResponse;
  const sessionId = startData.session_id;
  if (!sessionId) {
    throw new Error("Online session response format error.");
  }

  let messages: A2uiMessage[];
  if (startData.status === "error") {
    throw new Error("Generation failed on the server.");
  } else if (startData.status === "ready" && Array.isArray(startData.messages) && startData.messages.length > 0) {
    messages = startData.messages;
  } else {
    messages = await pollSessionUntilReady(source.apiBaseUrl, headers, sessionId);
  }

  return {
    sessionId,
    messages: resolveGeneratedImageUrls(messages, source.apiBaseUrl),
  };
}

export async function sendOnlineSessionAction(
  source: ViewerSourceOnline,
  sessionId: string,
  action: unknown,
): Promise<A2uiMessage[]> {
  const response = await fetch(`${source.apiBaseUrl}/api/session/${sessionId}/action`, {
    method: "POST",
    headers: buildHeaders(source.headers),
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw new Error(`Interaction callback failed (${response.status})`);
  }
  const data = (await response.json()) as SessionActionResponse;
  return Array.isArray(data.messages) && data.messages.length > 0
    ? resolveGeneratedImageUrls(data.messages, source.apiBaseUrl)
    : [];
}

async function pollSessionUntilReady(
  apiBaseUrl: string,
  headers: Record<string, string>,
  sessionId: string,
): Promise<A2uiMessage[]> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(`${apiBaseUrl}/api/session/${sessionId}/status`, { headers });
    if (!response.ok) {
      throw new Error(`Session status check failed (${response.status})`);
    }
    const data = (await response.json()) as SessionStatusResponse;
    if (data.status === "ready") {
      return data.messages;
    }
    if (data.status === "error") {
      throw new Error(data.error || "Generation failed on the server.");
    }
  }
  throw new Error("Timed out waiting for generation to complete.");
}

/** Resolve only API-relative generated-image paths; leave ordinary text and
 * external image URLs unchanged. */
function resolveGeneratedImageUrls(messages: A2uiMessage[], apiBaseUrl: string): A2uiMessage[] {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const generatedImagePath = /^\/api\/generated-images\/[a-f0-9]{64}\.png$/;
  const visit = (value: any): any => {
    if (typeof value === "string") return generatedImagePath.test(value) ? `${base}${value}` : value;
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    for (const [key, child] of Object.entries(value)) value[key] = visit(child);
    return value;
  };
  return messages.map((message) => visit(message));
}
