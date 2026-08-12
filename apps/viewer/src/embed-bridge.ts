import type {
  InitMessage,
  ReadyMessage,
  ResizeMessage,
  ViewerRuntimeConfig,
} from "./viewer-types";
import { isPlainObject, normalizeBaseUrl, normalizeThemeVars, getLang } from "./viewer-config";

export function postToParent(message: ReadyMessage | ResizeMessage, targetOrigin: string): void {
  if (window.parent === window) return;
  try {
    window.parent.postMessage(message, targetOrigin);
  } catch {
    // ignore
  }
}

export function setupAutoResize(container: HTMLElement, getTargetOrigin: () => string): () => void {
  if (window.parent === window) return () => {};
  let raf = 0;
  const send = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      postToParent({ type: "a2learn:resize", height }, getTargetOrigin());
    });
  };
  const observer = new ResizeObserver(() => send());
  observer.observe(document.documentElement);
  observer.observe(container);
  send();
  return () => {
    observer.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}

export function createEmbedMessageHandler(options: {
  onOrigin: (origin: string) => void;
  onConfig: (config: ViewerRuntimeConfig) => void;
}): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    const data = event.data;
    if (!isPlainObject(data) || data.type !== "a2learn:init" || !isPlainObject((data as any).source)) return;
    const source = (data as InitMessage).source;
    options.onOrigin(event.origin || "*");
    const themeVars = normalizeThemeVars((source as any).themeVars);

    if (source.mode === "online" && typeof (source as any).apiBaseUrl === "string") {
      options.onConfig({
        embed: true,
        source: {
          mode: "online",
          apiBaseUrl: normalizeBaseUrl(String((source as any).apiBaseUrl || "")),
          resourcePath: typeof (source as any).resourcePath === "string" ? String((source as any).resourcePath) : undefined,
          resourceText: typeof (source as any).resourceText === "string" ? String((source as any).resourceText) : undefined,
          language: (source as any).language === "zh" || (source as any).language === "en" ? (source as any).language : getLang(),
          headers: isPlainObject((source as any).headers)
            ? Object.fromEntries(
                Object.entries((source as any).headers).filter(([, value]) => typeof value === "string") as Array<[string, string]>,
              )
            : undefined,
          themeVars,
        },
      });
      return;
    }

    if (source.mode === "offline" && typeof (source as any).messagesUrl === "string") {
      options.onConfig({
        embed: true,
        source: {
          mode: "offline",
          messagesUrl: String((source as any).messagesUrl || "").trim() || "/generated/site_messages.json",
          themeVars,
        },
      });
    }
  };
}
