import type { A2uiMessage } from "@a2ui/web_core/v0_9";
import type { Lang } from "./generation-profile";

export type SessionStatus = "pending" | "ready" | "error";

export type SessionStartResponse = {
  session_id: string;
  mode: "online";
  status: SessionStatus;
  messages: A2uiMessage[];
};

export type SessionStatusResponse = {
  session_id: string;
  status: SessionStatus;
  messages: A2uiMessage[];
  error?: string | null;
};

export type SessionActionResponse = {
  session_id: string;
  messages: A2uiMessage[];
  action_count: number;
};

export type ViewerSourceOffline = {
  mode: "offline";
  messagesUrl: string;
  /** Optional bundled messages, used for curated course lessons. */
  messages?: A2uiMessage[];
  themeVars?: Record<string, string>;
  themeId?: string;
};

export type ViewerSourceOnline = {
  mode: "online";
  apiBaseUrl: string;
  resourcePath?: string;
  resourceText?: string;
  sourceIds?: string[];
  resourceQuery?: string;
  language?: Lang;
  headers?: Record<string, string>;
  themeVars?: Record<string, string>;
  themeId?: string;
};

export type ViewerRuntimeConfig = {
  embed: boolean;
  source: ViewerSourceOffline | ViewerSourceOnline;
};

export type InitMessage = {
  type: "a2learn:init";
  source:
    | {
        mode: "offline";
        messagesUrl?: string;
        themeVars?: Record<string, string>;
        themeId?: string;
      }
    | {
        mode: "online";
        apiBaseUrl?: string;
        resourcePath?: string;
        resourceText?: string;
        language?: Lang;
        headers?: Record<string, string>;
        themeVars?: Record<string, string>;
        themeId?: string;
      };
};

export type ReadyMessage = {
  type: "a2learn:ready";
};

export type ResizeMessage = {
  type: "a2learn:resize";
  height: number;
};

export type ActiveDocument =
  | { type: "project"; projectId: string; title?: string }
  | { type: "example"; exampleId: string; title?: string }
  | { type: "generated"; promptText?: string }
  | { type: "empty" };
