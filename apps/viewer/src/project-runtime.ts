import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import { renderSurfaces } from "./surface-renderer";
import { isAudioEnabled } from "./generation-settings";
import { getLang } from "./viewer-config";
import { getStoredApiKey } from "./shell-controls";
import { type ShellRuntime } from "./shell-controls";
import { type RecentProject, rememberProject } from "./recent-projects";
import { NarrationController } from "./narration-controller";
import type { ActiveDocument } from "./viewer-types";
import { T } from "./viewer-copy";

export type ProjectRuntimeOptions = {
  project: RecentProject;
  expectedVersion?: number;
  getLoadVersion: () => number;
  nextLoadVersion: () => number;
  getContainer: () => HTMLElement | null;
  getApiBaseUrl: () => string;
  setRuntime: (runtime: ShellRuntime) => void;
  setContent: (content: ActiveDocument) => void;
  updateProjectUrl: (projectId: string | null) => void;
  extractFirstSurfaceId: (messages: A2uiMessage[]) => string | null;
  narrationController: NarrationController;
};

export async function openProject(options: ProjectRuntimeOptions): Promise<void> {
  const {
    project,
    expectedVersion,
    getLoadVersion,
    nextLoadVersion,
    getContainer,
    getApiBaseUrl,
    setRuntime,
    setContent,
    updateProjectUrl,
    extractFirstSurfaceId,
    narrationController,
  } = options;
  const requestVersion = expectedVersion ?? nextLoadVersion();
  const isCurrent = () => requestVersion === getLoadVersion();
  const target = getContainer();
  if (!target) return;

  narrationController.resetForDocument(
    document.getElementById("page-narration-button") as HTMLButtonElement | null,
  );

  const apiBaseUrl = getApiBaseUrl().replace(/\/+$/, "");
  if (!apiBaseUrl) {
    throw new Error(T[getLang()].editingApiNotConfigured);
  }
  const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(project.id)}/a2ui`);
  if (!response.ok) {
    throw new Error(`${T[getLang()].openPageFailedPrefix} (${response.status})`);
  }
  const payload = await response.json() as { messages?: A2uiMessage[] };
  if (!isCurrent()) return;
  if (!Array.isArray(payload.messages)) {
    throw new Error(T[getLang()].invalidPageData);
  }

  const processor = new MessageProcessor([a2learnCatalog], () => undefined);
  processor.processMessages(payload.messages);
  setRuntime({ container: target, processor, modeHint: "Project editor mode." });
  setContent({ type: "project", projectId: project.id, title: project.title });
  rememberProject(project.id, project.title);
  updateProjectUrl(project.id);
  const firstSurface = extractFirstSurfaceId(payload.messages);
  if (firstSurface) window.location.hash = `#/${firstSurface}`;
  renderSurfaces(target, processor, "Project editor mode.");
  configureProjectNarration({
    button: document.getElementById("page-narration-button") as HTMLButtonElement | null,
    project,
    apiBaseUrl,
    narrationController,
  });
}

function configureProjectNarration(options: {
  button: HTMLButtonElement | null;
  project: RecentProject;
  apiBaseUrl: string;
  narrationController: NarrationController;
}): void {
  const { button, project, apiBaseUrl, narrationController } = options;
  if (!button) return;
  button.hidden = !isAudioEnabled();
  button.onclick = () => {
    const language = getLang();
    void narrationController.toggle(button, async () => {
      const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(project.id)}/narration?language=${language}`, {
        method: "POST",
        headers: { ...(getStoredApiKey() ? { "X-OpenRouter-API-Key": getStoredApiKey() } : {}) },
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`${response.status}: ${detail || response.statusText}`);
      }
      return (await response.json()) as { script?: string; audioUrl: string };
    }, apiBaseUrl);
  };
}
