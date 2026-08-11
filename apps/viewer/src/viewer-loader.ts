import { showState } from "@a2learn/viewer-kit/page-shell";
import { applyEmbedFlag, applySourceTheme } from "./viewer-config";
import { T } from "./viewer-copy";
import type { Lang } from "./generation-profile";
import type {
  ViewerRuntimeConfig,
  ViewerSourceOffline,
  ViewerSourceOnline,
} from "./viewer-types";

export type ViewerLoaderOptions = {
  config: ViewerRuntimeConfig;
  target: HTMLElement;
  fallbackToOffline: boolean;
  isCurrent: () => boolean;
  getApiKey: () => string;
  getLanguage: () => Lang;
  bootstrapOnline: (
    target: HTMLElement,
    source: ViewerSourceOnline,
    isCurrent: () => boolean,
  ) => Promise<boolean>;
  bootstrapOffline: (
    target: HTMLElement,
    source: ViewerSourceOffline,
    isCurrent: () => boolean,
  ) => Promise<void>;
  onLoaded: () => void;
};

export async function loadViewerSource(options: ViewerLoaderOptions): Promise<void> {
  const {
    config,
    target,
    fallbackToOffline,
    isCurrent,
    getApiKey,
    getLanguage,
    bootstrapOnline,
    bootstrapOffline,
    onLoaded,
  } = options;

  applyEmbedFlag(config.embed);
  applySourceTheme(config.source);

  const storedKey = getApiKey();
  const source = config.source.mode === "online" && storedKey
    ? {
        ...config.source,
        headers: {
          ...(config.source.headers || {}),
          Authorization: `Bearer ${storedKey}`,
        },
      }
    : config.source;

  try {
    if (source.mode === "online") {
      showState(target, T[getLanguage()].agentPlanning, "loading");
      await bootstrapOnline(target, source, isCurrent);
      if (!isCurrent()) return;
      onLoaded();
      return;
    }
  } catch (err) {
    if (!isCurrent()) return;
    const copy = T[getLanguage()];
    const errorLine = getLanguage() === "zh" ? `错误信息: ${String(err)}` : `Error: ${String(err)}`;
    const fallbackNote = fallbackToOffline ? `\n${copy.onlineFailedFallback}` : "";
    showState(target, `${copy.onlineFailedPrefix}\n${errorLine}${fallbackNote}`, "error");
    if (!fallbackToOffline) return;
  }

  await bootstrapOffline(
    target,
    source.mode === "offline"
      ? source
      : { mode: "offline", messagesUrl: "/generated/site_messages.json" },
    isCurrent,
  );
  if (!isCurrent()) return;
  onLoaded();
}
