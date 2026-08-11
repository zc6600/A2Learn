import {
  RENDER_THEMES,
  getRenderTheme,
  type GenerationProfile,
  type Lang,
} from "./generation-profile";
import type {
  ViewerRuntimeConfig,
  ViewerSourceOffline,
  ViewerSourceOnline,
} from "./viewer-types";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function normalizeThemeVars(input: unknown): Record<string, string> | undefined {
  if (!isPlainObject(input)) return undefined;
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith("--") && typeof value === "string") {
      entries.push([key, value]);
    }
  }
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeThemeId(input: string): string | undefined {
  return RENDER_THEMES.some((theme) => theme.id === input) ? input : undefined;
}

function applyThemeVars(vars?: Record<string, string>): void {
  if (!vars) return;
  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith("--")) {
      document.documentElement.style.setProperty(key, value);
    }
  }
}

const GENERATION_THEME_VAR_NAMES = Array.from(
  new Set(RENDER_THEMES.flatMap((theme) => Object.keys(theme.vars))),
);

export function applyGenerationTheme(
  themeId: string,
  displayMode: GenerationProfile["displayMode"] = "standard",
): void {
  for (const variable of GENERATION_THEME_VAR_NAMES) {
    document.documentElement.style.removeProperty(variable);
  }
  const theme = getRenderTheme(themeId);
  document.documentElement.dataset.a2learnTheme = theme.id;
  document.documentElement.dataset.a2learnDisplayMode = displayMode;
  applyThemeVars(theme.vars);
}

export function applySourceTheme(source: ViewerSourceOffline | ViewerSourceOnline): void {
  if (source.themeVars) {
    applyThemeVars(source.themeVars);
  } else if (source.themeId) {
    applyGenerationTheme(source.themeId);
  }
}

export function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, "");
}

const LANG_STORAGE_KEY = "a2learn_lang";

export function getLang(): Lang {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function configFromLocation(): ViewerRuntimeConfig {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get("embed") === "1";
  const modeRaw = (params.get("mode") || "").toLowerCase();
  const messagesUrlParam = params.get("messagesUrl") || "";
  const apiBaseUrlParam = params.get("apiBaseUrl") || params.get("apiUrl") || "";
  const resourcePathParam = params.get("resourcePath") || "";
  const resourceTextParam = params.get("resourceText") || "";
  const headersParam = params.get("headers") || "";
  const themeParam = params.get("themeVars") || params.get("theme") || "";
  const parsedHeaders = headersParam ? safeJsonParse(headersParam) : undefined;
  const parsedTheme = themeParam ? safeJsonParse(themeParam) : undefined;
  const headers = isPlainObject(parsedHeaders)
    ? Object.fromEntries(
        Object.entries(parsedHeaders).filter(([, value]) => typeof value === "string") as Array<[
          string,
          string,
        ]>,
      )
    : undefined;
  const themeVars = normalizeThemeVars(parsedTheme);
  const themeId = normalizeThemeId(params.get("themeId") || "");

  const envApiUrl = (import.meta.env.VITE_A2LEARN_API_URL || "").trim();
  const envMessagesUrl = (import.meta.env.VITE_A2LEARN_MESSAGES_URL || "").trim();
  const envResourcePath = (import.meta.env.VITE_A2LEARN_RESOURCE_PATH || "").trim();
  const envResourceText = (import.meta.env.VITE_A2LEARN_RESOURCE_TEXT || "").trim();

  const apiBaseUrl = (apiBaseUrlParam || envApiUrl).trim();
  const editorMode = modeRaw === "editor" || import.meta.env.MODE === "editor";
  const editorExample = params.get("example") || "hash-table";
  const editorMessagesUrl = editorMode
    ? (getLang() === "en" ? `/examples/en/${editorExample}.json` : `/examples/${editorExample}.json`)
    : "/generated/site_messages.json";
  const messagesUrl = (messagesUrlParam || envMessagesUrl || editorMessagesUrl).trim();
  const resourcePath = (resourcePathParam || envResourcePath).trim() || undefined;
  const resourceText = (resourceTextParam || envResourceText).trim() || undefined;
  const preferredMode = modeRaw === "online" || modeRaw === "offline"
    ? (modeRaw as "online" | "offline")
    : undefined;
  const resolvedMode = preferredMode || (apiBaseUrl && (resourceText || resourcePath) ? "online" : "offline");

  if (resolvedMode === "online") {
    return {
      embed,
      source: {
        mode: "online",
        apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
        resourcePath,
        resourceText,
        language: getLang(),
        headers,
        themeVars,
        themeId,
      },
    };
  }
  return {
    embed,
    source: { mode: "offline", messagesUrl, themeVars, themeId },
  };
}

export function applyEmbedFlag(embed: boolean): void {
  if (embed) {
    document.documentElement.dataset.a2learnEmbed = "1";
  } else {
    delete document.documentElement.dataset.a2learnEmbed;
  }
}

export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (key && typeof value === "string") headers[key] = value;
    }
  }
  return headers;
}
