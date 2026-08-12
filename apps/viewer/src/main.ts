import "./styles/runtime.css";
import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";
import "@a2learn/viewer-kit/markdown-surface";
import {
  injectBaseTheme,
  renderAppFrame,
  showState,
  type AppChromeStrings,
  type ExampleCardGroup,
} from "@a2learn/viewer-kit/page-shell";
import { bootstrapGallery } from "@a2learn/viewer-kit/gallery/gallery-ui";
import { pickRenderedComponent } from "./component-picker";
import { mountFloatingAgent } from "./floating-agent";
import { mountInlineComponentEditor } from "./inline-component-editor";
import { mountSourceLibrary } from "./source-library";
import { getExampleItems, renderCollapsibleExampleGallery } from "./example-gallery";
import { workspaceStore } from "./workspace-store";
import { renderWorkspaceSidebar } from "./workspace-sidebar-ui";
import { createEmbedMessageHandler, postToParent, setupAutoResize } from "./embed-bridge";
import {
  configureProjectNarration,
  openProject as openProjectRuntime,
} from "./project-runtime";
import { renderSurfaces } from "./surface-renderer";
import {
  bindGlobalListenersOnce,
  bindShellControls,
  getStoredApiKey,
} from "./shell-controls";
import { NarrationController } from "./narration-controller";
import { sendOnlineSessionAction, startOnlineSession } from "./online-session";
import { CHROME_STRINGS, T } from "./viewer-copy";
import { loadViewerSource } from "./viewer-loader";
import {
  generationSettingsHtml,
  isAudioEnabled,
  staticExampleAudioUrl,
} from "./generation-settings";
import {
  applyEmbedFlag,
  applyGenerationTheme,
  applySourceTheme,
  configFromLocation,
  getLang,
  isPlainObject,
  normalizeBaseUrl,
  normalizeThemeVars,
  setLang,
} from "./viewer-config";
import type {
  ActiveDocument,
  ViewerRuntimeConfig,
  ViewerSourceOffline,
  ViewerSourceOnline,
} from "./viewer-types";
import { recentProjects, rememberProject, type RecentProject } from "./recent-projects";
import {
  LOCAL_EXAMPLES,
  getStoredGenerationProfile,
  type Lang,
} from "./generation-profile";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;

const narrationController = new NarrationController(getLang);



function setupRoot(): HTMLElement | null {
  const root = document.getElementById("app");
  if (!root) {
    return null;
  }
  root.setAttribute("role", "main");
  injectBaseTheme();
  return root;
}

function renderWelcomeState(lang: Lang): string {
  const copy = T[lang];
  return `
    <div class="viewer-welcome-state">
      <div class="viewer-welcome-copy">
        <p class="viewer-welcome-eyebrow">${copy.welcomeEyebrow}</p>
        <h2 class="viewer-welcome-title">${copy.welcomeTitle}</h2>
        <p class="viewer-welcome-description">${copy.welcomeDescription}</p>
      </div>
      ${renderCollapsibleExampleGallery(lang)}
    </div>`;
}

function extractLastCreatedSurfaceId(messages: A2uiMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        return surfaceId;
      }
    }
  }
  return null;
}

function extractFirstCreatedSurfaceId(messages: A2uiMessage[]): string | null {
  for (const msg of messages) {
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        return surfaceId;
      }
    }
  }
  return null;
}

// Collects every surfaceId a set of messages ever creates, so a valid deep
// link (e.g. #/surface-module-1) can be told apart from a stale/missing hash.
function extractAllSurfaceIds(messages: A2uiMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const msg of messages) {
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        ids.add(surfaceId);
      }
    }
  }
  return ids;
}

function readCurrentSurfaceHash(): string {
  return window.location.hash.startsWith("#/") ? window.location.hash.slice(2) : "";
}

function readGalleryCategory(): ExampleCardGroup["id"] | undefined {
  const category = new URLSearchParams(window.location.search).get("gallery");
  return category === "paper" || category === "computing" || category === "poetry"
    ? category
    : undefined;
}

// Register window hashchange listener once
window.addEventListener("hashchange", () => {
  if (activeRuntime) {
    renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
  }
});


function modeHintForSending(container: HTMLElement, isSending: boolean): void {
  const first = container.querySelector(".viewer-state");
  if (!first) {
    return;
  }
  const next = first as HTMLParagraphElement;
  if (isSending) {
    next.textContent = "Online mode connected, syncing latest interaction with Agent...";
  } else {
    next.textContent = "Online mode connected, supporting interaction callbacks and incremental updates.";
  }
}

async function bootstrapOnline(
  container: HTMLElement,
  source: ViewerSourceOnline,
  isCurrent: () => boolean = () => true,
  onSessionReady?: (sessionId: string, messages: A2uiMessage[]) => void,
): Promise<boolean> {
  const session = await startOnlineSession(source, getStoredGenerationProfile());
  const sessionId = session.sessionId;
  const initialMessages = session.messages;
  if (!isCurrent()) return false;

  let isSendingAction = false;

  const pendingActions: any[] = [];
  const MAX_PENDING_ACTIONS = 50;

  const processor = new MessageProcessor([a2learnCatalog], (action: any) => {
    if (!isCurrent() || !sessionId || !action) return;
    pendingActions.push(action);
    if (pendingActions.length > MAX_PENDING_ACTIONS) {
      pendingActions.shift();
    }
    modeHintForSending(container, true);
    void flushPendingActions();
  });

  const flushPendingActions = async () => {
    if (!isCurrent()) {
      pendingActions.length = 0;
      return;
    }
    if (isSendingAction) return;
    const next = pendingActions.shift();
    if (!next) {
      modeHintForSending(container, false);
      return;
    }
    isSendingAction = true;
    try {
      if (!isCurrent()) return;
      const messages = await sendOnlineSessionAction(source, sessionId, next);
      if (!isCurrent()) return;
      if (messages.length > 0) {
        processor.processMessages(messages);
        const lastCreatedId = extractLastCreatedSurfaceId(messages);
        if (lastCreatedId) {
          window.location.hash = `#/${lastCreatedId}`;
        }
        renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
      }
    } catch (err) {
      if (!isCurrent()) return;
      showState(
        container,
        `Online interaction callback failed: ${String(err)}\nPlease check API service status and retry.`,
        "error",
      );
    } finally {
      isSendingAction = false;
      if (!isCurrent()) return;
      if (pendingActions.length === 0) {
        modeHintForSending(container, false);
        return;
      }
      void flushPendingActions();
    }
  };

  if (!isCurrent()) return false;
  activeRuntime = {
    container,
    processor,
    modeHint: "Online mode connected, supporting interaction callbacks and incremental updates.",
  };

  processor.processMessages(initialMessages);
  // Land on the first generated surface, not the last — matches
  // bootstrapOffline's landing behavior: the course reads top to bottom, so
  // module 1 is the natural starting point right after generation.
  const startCreatedId = extractFirstCreatedSurfaceId(initialMessages);
  if (startCreatedId) {
    window.location.hash = `#/${startCreatedId}`;
  }
  renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
  onSessionReady?.(sessionId, initialMessages);
  return true;
}

// Static offline previews have no backend to ask for new content, but a few
// components (SectionNavigator, KnowledgeTree) dispatch an action on every
// click regardless of mode. Without a handler those actions silently went
// nowhere — cards looked clickable but did nothing. This gives them a real,
// honest local behavior: SectionNavigator switches which card is highlighted
// as current; KnowledgeTree steps into a child using the data it already has
// (there's no deeper content to fetch in a static demo, so descending shows
// the tree's own "leaf node" empty state instead of pretending to load more).
function extractInitialComponentSnapshots(messages: unknown): Map<string, Record<string, unknown>> {
  const snapshot = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(messages)) return snapshot;
  for (const msg of messages) {
    const update = (msg as any)?.updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    for (const comp of update.components) {
      if (comp && typeof comp.id === "string" && !snapshot.has(comp.id)) {
        snapshot.set(comp.id, comp);
      }
    }
  }
  return snapshot;
}

function applyStaticNavigation(
  processor: MessageProcessor<any>,
  container: HTMLElement,
  action: any,
  initialSnapshots: Map<string, Record<string, unknown>>,
): void {
  if (!action || typeof action.name !== "string") return;
  const surfaceId = action.surfaceId;
  const sourceComponentId = action.sourceComponentId;
  const ctx = action.context || {};
  if (!surfaceId || !sourceComponentId) return;

  if (action.name === "navigate_section" && typeof ctx.sectionId === "string") {
    // SectionNavigator treats a card as "active" if EITHER activeSectionId
    // matches OR the card's own status is "current" (source content usually
    // hardcodes one section as "current"). Updating activeSectionId alone
    // left the original card permanently highlighted too, so it looked like
    // clicks did nothing. Also flip each section's own status field.
    const current = (processor.model as any)?.getComponent?.(surfaceId, sourceComponentId);
    const currentProps: any = current?.props ?? initialSnapshots.get(sourceComponentId) ?? {};
    const sections: any[] = Array.isArray(currentProps.sections) ? currentProps.sections : [];
    const updatedSections = sections.map((sec) => {
      if (!sec || typeof sec !== "object") return sec;
      if (sec.id === ctx.sectionId) {
        return sec.status === "locked" ? sec : { ...sec, status: "current" };
      }
      return sec.status === "current" ? { ...sec, status: "available" } : sec;
    });

    processor.processMessages([
      {
        version: "v0.9",
        updateComponents: {
          surfaceId,
          components: [
            {
              id: sourceComponentId,
              component: "SectionNavigator",
              activeSectionId: ctx.sectionId,
              sections: updatedSections,
            },
          ],
        },
      },
    ]);
    renderSurfaces(container, processor);
    return;
  }

  if (action.name === "knowledge_tree_navigate" && typeof ctx.nodeId === "string") {
    const original = initialSnapshots.get(sourceComponentId);
    if (!original) return;

    const current = (processor.model as any)?.getComponent?.(surfaceId, sourceComponentId);
    const currentProps: any = current?.props ?? original;
    const children: any[] = Array.isArray(currentProps.childrenNodes) ? currentProps.childrenNodes : [];
    const target = children.find((c) => c && c.id === ctx.nodeId);

    if (ctx.nodeId === "root" || !target) {
      // Breadcrumb entries above the current level, or "root", aren't
      // reconstructible without the full tree — reset to the initial state.
      processor.processMessages([{ version: "v0.9", updateComponents: { surfaceId, components: [original] } }]);
      renderSurfaces(container, processor);
      return;
    }

    const prevCurrent: any = currentProps.currentNode;
    const prevPath: any[] = Array.isArray(currentProps.path) ? currentProps.path : [];
    processor.processMessages([
      {
        version: "v0.9",
        updateComponents: {
          surfaceId,
          components: [
            {
              id: sourceComponentId,
              component: "KnowledgeTree",
              path: prevCurrent ? [...prevPath, { id: prevCurrent.id, label: prevCurrent.label }] : prevPath,
              currentNode: {
                id: target.id,
                label: target.label,
                description: T[getLang()].staticTreeLeafNote,
              },
              childrenNodes: [],
            },
          ],
        },
      },
    ]);
    renderSurfaces(container, processor);
  }
}

async function bootstrapOffline(
  container: HTMLElement,
  source: ViewerSourceOffline,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const configuredUrl = source.messagesUrl || "/generated/site_messages.json";
  const separator = configuredUrl.includes("?") ? "&" : "?";
  const res = await fetch(`${configuredUrl}${separator}ts=${Date.now()}`);
  if (!isCurrent()) return;
  if (!res.ok) {
    showState(container, "Unable to load A2UI messages, please run Agent to generate messages first.", "error");
    return;
  }
  const messages = await res.json();
  const initialSnapshots = extractInitialComponentSnapshots(messages);

  let processor: MessageProcessor<any>;
  processor = new MessageProcessor([a2learnCatalog], (action: any) =>
    applyStaticNavigation(processor, container, action, initialSnapshots),
  );
  try {
    processor.processMessages(messages);
  } catch (err) {
    showState(container, `A2UI message processing failed: ${String(err)}`, "error");
    return;
  }

  if (!isCurrent()) return;

  activeRuntime = {
    container,
    processor,
    modeHint: "Offline mode: Previewing message file only, no interaction callbacks.",
  };

  const allSurfaceIds = extractAllSurfaceIds(messages);
  const currentHashId = readCurrentSurfaceHash();
  if (!currentHashId || !allSurfaceIds.has(currentHashId)) {
    // No hash yet (fresh load of "/") or an unrecognized hash: land on the
    // first surface in the file, not the last — the file is read top to
    // bottom as a lesson, so module 1 is the natural starting point.
    const firstCreatedId = extractFirstCreatedSurfaceId(messages);
    if (firstCreatedId) {
      window.location.hash = `#/${firstCreatedId}`;
    }
  }
  renderSurfaces(container, processor, "Offline mode: Previewing message file only, no interaction callbacks.");
}



async function bootstrapViewer() {
  const root = setupRoot();
  if (!root) {
    return;
  }
  const initialConfig = configFromLocation();
  applyEmbedFlag(initialConfig.embed);
  applySourceTheme(initialConfig.source);
  if (!initialConfig.embed && !initialConfig.source.themeVars && !initialConfig.source.themeId) {
    const profile = getStoredGenerationProfile();
    applyGenerationTheme(profile.themeId, profile.displayMode);
  }

  // Whether the caller explicitly asked for a particular source (query
  // params / env vars). If not, the "default" offline config is just a
  // placeholder that never resolves to a real file in a static deployment —
  // show a friendly localized picker prompt instead of a scary fetch error.
  const hasExplicitSource =
    initialConfig.source.mode === "online" ||
    (initialConfig.source.mode === "offline" && initialConfig.source.messagesUrl !== "/generated/site_messages.json");

  let activeDoc: ActiveDocument = { type: "empty" };
  let loadVersion = 0;
  const locationParams = new URLSearchParams(window.location.search);
  const initialProjectId = locationParams.get("project");
  const initialExample = locationParams.get("example") || (locationParams.get("mode") === "editor" ? "hash-table" : "");

  if (initialProjectId) {
    activeDoc = { type: "project", projectId: initialProjectId };
  } else if (initialExample) {
    activeDoc = { type: "example", exampleId: initialExample };
  }

  let container: HTMLElement | null = null;
  let parentOrigin = "*";
  let stopResize: () => void = () => {};
  const languageChangeControllers: Array<{ onLanguageChanged: () => void }> = [];

  const editorApiBaseUrl = () =>
    initialConfig.source.mode === "online"
      ? initialConfig.source.apiBaseUrl
      : (
          import.meta.env.VITE_A2LEARN_API_URL ||
          (import.meta.env.DEV ? "http://localhost:8008" : window.location.origin)
        ).trim();

  const updateProjectUrl = (projectId: string | null) => {
    const url = new URL(window.location.href);
    if (projectId) url.searchParams.set("project", projectId);
    else url.searchParams.delete("project");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const openProject = (project: RecentProject, expectedVersion?: number) => {
    workspaceStore.setActiveNode(project.id);
    return openProjectRuntime({
      project,
      expectedVersion,
      getLoadVersion: () => loadVersion,
      nextLoadVersion: () => ++loadVersion,
      getContainer: () => container,
      getApiBaseUrl: editorApiBaseUrl,
      setRuntime: (runtime) => { activeRuntime = runtime; },
      setContent: (content) => { activeDoc = content; },
      updateProjectUrl,
      extractFirstSurfaceId: extractFirstCreatedSurfaceId,
      narrationController,
    });
  };

  const renderShell = (lang: Lang) => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    const title = initialConfig.embed ? "" : "A2Learn";
    const subtitle = initialConfig.embed ? "" : T[lang].subtitle;

    const chrome: AppChromeStrings = {
      ...CHROME_STRINGS[lang],
      settingsContentHtml: generationSettingsHtml(lang, getStoredGenerationProfile()),
    };
    renderAppFrame(
      root,
      title,
      subtitle,
      `<section id="surface-container" aria-live="polite">
        ${renderWelcomeState(lang)}
      </section><section id="narration-result" class="a2learn-narration-result" hidden aria-live="polite"></section><button id="page-narration-button" type="button" hidden aria-label="播放讲稿">🔊</button>`,
      initialConfig.embed ? undefined : { lang, chrome },
    );
    container = document.getElementById("surface-container");
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      narrationButton.className = "a2learn-narration-button";
      narrationButton.title = T[lang].playNarration;
      narrationButton.onclick = () => {
        void narrationController.toggle(narrationButton);
      };
    }

    if (!initialConfig.embed) {
      const sidebarSlot = document.getElementById("workspace-sidebar-slot");
      if (sidebarSlot) {
        workspaceStore.setLang(lang);
        renderWorkspaceSidebar(sidebarSlot, {
          getLang,
          onSelectLesson: async (id: string) => {
            const builtinItem = getExampleItems(getLang()).find((i) => i.id === id);
            if (builtinItem) {
              await selectExample(id);
            } else {
              const userNode = workspaceStore.getState().nodes[id];
              if (userNode) {
                await openProject({ id: userNode.id, title: userNode.title, openedAt: userNode.updatedAt });
              }
            }
          },
        });
      }

      const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
      if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener("click", () => {
          document.getElementById("app-layout")?.classList.toggle("sidebar-collapsed");
        });
      }
    }
  };

  const bindExampleAudio = (audioUrl: string | null, lang: Lang = getLang()): void => {
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (!narrationButton) return;
    narrationButton.dataset.audioUrl = audioUrl || "";
    // Pre-generated example audio is always available. The audio setting only
    // controls whether newly generated projects request narration.
    narrationButton.hidden = !audioUrl;
    narrationButton.title = audioUrl ? T[lang].playNarration : T[lang].noNarrationAvailable;
  };

  renderShell(getLang());
  if (!container) {
    return;
  }

  if (!initialConfig.embed) {
    const getCurrentProjectId = (): string | null => {
      if (activeDoc.type === "project") return activeDoc.projectId;
      if (activeDoc.type === "example") return `example-${getLang()}-${activeDoc.exampleId}`;
      return null;
    };
    const floatingAgent = mountFloatingAgent({
      getLanguage: () => (getLang() === "en" ? "en" : "zh"),
      getProjectId: getCurrentProjectId,
      getSurfaceId: readCurrentSurfaceHash,
      getApiBaseUrl: editorApiBaseUrl,
      getApiKey: getStoredApiKey,
      getProcessor: () => activeRuntime?.processor || null,
      render: () => {
        if (activeRuntime) renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
      },
      pickComponent: () => container ? pickRenderedComponent(container) : Promise.resolve(null),
      recentProjects,
      onProjectCreated: (projectId, title, messages) => {
        if (!container) return;
        const processor = new MessageProcessor([a2learnCatalog], () => undefined);
        processor.processMessages(messages);
        activeRuntime = { container, processor, modeHint: "Project editor mode." };
        activeDoc = { type: "project", projectId, title };
        rememberProject(projectId, title);
        workspaceStore.recordNewGeneration(projectId, title);
        updateProjectUrl(projectId);
        const firstSurface = extractFirstCreatedSurfaceId(messages);
        if (firstSurface) window.location.hash = `#/${firstSurface}`;
        renderSurfaces(container, processor, "Project editor mode.");
      },
      onOpenProject: async (project) => openProject(project),
    });
    bindGlobalListenersOnce((promptText) => floatingAgent.ask(promptText));
    const inlineEditor = mountInlineComponentEditor({
      getContainer: () => container,
      getLanguage: () => (getLang() === "en" ? "en" : "zh"),
      getProjectId: getCurrentProjectId,
      getSurfaceId: readCurrentSurfaceHash,
      getApiBaseUrl: editorApiBaseUrl,
      getApiKey: getStoredApiKey,
      getProcessor: () => activeRuntime?.processor || null,
      render: () => {
        if (activeRuntime) renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
      },
    });
    languageChangeControllers.push(floatingAgent, inlineEditor);
  }

  stopResize = setupAutoResize(container, () => parentOrigin);
  if (initialConfig.embed) {
    postToParent({ type: "a2learn:ready" }, parentOrigin);
  }

  const startWithConfig = async (
    cfg: ViewerRuntimeConfig,
    fallbackToOffline: boolean = true,
    expectedVersion?: number,
  ) => {
    const requestVersion = expectedVersion ?? ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
    // Snapshot container for the duration of this call: it's a `let` that
    // renderShell() can reassign (on a language switch), and it shouldn't
    // move out from under an in-flight load.
    const target = container;
    if (!target) return;
    await loadViewerSource({
      config: cfg,
      target,
      fallbackToOffline,
      isCurrent,
      getApiKey: getStoredApiKey,
      getLanguage: getLang,
      bootstrapOnline: (t, s, ic) => bootstrapOnline(t, s, ic, async (sessionId) => {
        if (!ic()) return;
        const apiBaseUrl = editorApiBaseUrl().replace(/\/+$/, "");
        if (!apiBaseUrl) return;
        const projectTitle = s.resourceText || s.resourceQuery || T[getLang()].defaultGeneratedTitle;
        try {
          const res = await fetch(`${apiBaseUrl}/api/projects/from-session`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(getStoredApiKey() ? { "X-OpenRouter-API-Key": getStoredApiKey() } : {}),
            },
            body: JSON.stringify({
              sessionId,
              title: projectTitle,
              actor: "ai",
            }),
          });
          if (res.ok && ic()) {
            const data = (await res.json()) as { project?: { projectId?: string; id?: string; title?: string } };
            const projectId = data?.project?.projectId || data?.project?.id;
            if (projectId) {
              activeDoc = { type: "project", projectId, title: projectTitle };
              rememberProject(projectId, projectTitle);
              workspaceStore.recordNewGeneration(projectId, projectTitle);
              updateProjectUrl(projectId);
            }
          }
        } catch {
          // Gracefully fallback: in-memory session still active
        }
      }),
      bootstrapOffline,
      onLoaded: () => {
        stopResize();
        stopResize = setupAutoResize(target, () => parentOrigin);
      },
    });
  };

  const selectExample = async (id: string) => {
    const requestVersion = ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
    const item = getExampleItems(getLang()).find((i) => i.id === id);
    if (!item) return;
    narrationController.resetForDocument(
      document.getElementById("page-narration-button") as HTMLButtonElement | null,
    );
    activeDoc = { type: "example", exampleId: id, title: item.title };
    workspaceStore.setActiveNode(id);
    updateProjectUrl(null);
    const staticAudioUrl = staticExampleAudioUrl(id, getLang());
    // Bundled examples with a pre-generated asset must stay fully offline:
    // selecting audio should bind the shipped MP3, never regenerate it.
    if (staticAudioUrl) {
      await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
      if (!isCurrent()) return;
      bindExampleAudio(staticAudioUrl);
      return;
    }
    const apiBaseUrl = editorApiBaseUrl().replace(/\/+$/, "");
    if (isAudioEnabled() && apiBaseUrl) {
      try {
        const projectId = `example-${getLang()}-${id}`;
        const ensure = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/ensure-example`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: getLang(), exampleId: id, actor: "human" }),
        });
        if (ensure.ok) {
          if (!isCurrent()) return;
          await openProject({ id: projectId, title: item.title, openedAt: new Date().toISOString() }, requestVersion);
          return;
        }
      } catch {
        // Audio is optional; a backend failure must not prevent the static
        // example from opening normally.
      }
    }
    if (!isCurrent()) return;
    await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
    if (!isCurrent()) return;
    bindExampleAudio(staticAudioUrl);
  };

  const onGenerate = (promptText: string) => {
    const target = container;
    if (!target) return;
    narrationController.resetForDocument(
      document.getElementById("page-narration-button") as HTMLButtonElement | null,
    );
    activeDoc = { type: "generated", promptText };
    updateProjectUrl(null);
    const currentApiUrl =
      initialConfig.source.mode === "online"
        ? initialConfig.source.apiBaseUrl
        : (import.meta.env.VITE_A2LEARN_API_URL || "").trim();

    if (!currentApiUrl) {
      showState(target, T[getLang()].noBackendConfigured, "error");
      return;
    }

    const userKey = getStoredApiKey();
    const onlineConfig: ViewerRuntimeConfig = {
      embed: false,
      source: {
        mode: "online",
        apiBaseUrl: normalizeBaseUrl(currentApiUrl),
        resourceText: promptText,
        language: getLang(),
        headers: userKey ? { Authorization: `Bearer ${userKey}` } : undefined,
      },
    };
    // User explicitly asked to generate from their own prompt — on failure,
    // leave the error on screen instead of silently swapping in the static
    // demo gallery content (see startWithConfig's fallbackToOffline comment).
    void startWithConfig(onlineConfig, false);
  };

  const onGenerateFromSources = (sourceIds: string[], resourceQuery: string) => {
    const target = container;
    if (!target) return;
    narrationController.resetForDocument(
      document.getElementById("page-narration-button") as HTMLButtonElement | null,
    );
    activeDoc = { type: "generated", promptText: resourceQuery };
    updateProjectUrl(null);
    const currentApiUrl =
      initialConfig.source.mode === "online"
        ? initialConfig.source.apiBaseUrl
        : (import.meta.env.VITE_A2LEARN_API_URL || "").trim();
    if (!currentApiUrl) {
      showState(target, T[getLang()].noBackendConfigured, "error");
      return;
    }
    const userKey = getStoredApiKey();
    void startWithConfig({
      embed: false,
      source: {
        mode: "online",
        apiBaseUrl: normalizeBaseUrl(currentApiUrl),
        sourceIds,
        resourceQuery: resourceQuery || undefined,
        language: getLang(),
        headers: userKey ? { Authorization: `Bearer ${userKey}` } : undefined,
      },
    }, false);
  };

  const sourceLibrary = initialConfig.embed
    ? null
    : mountSourceLibrary({
        getApiBaseUrl: editorApiBaseUrl,
        getApiKey: getStoredApiKey,
        getLanguage: () => (getLang() === "en" ? "en" : "zh"),
        onGenerate: onGenerateFromSources,
      });
  if (sourceLibrary) {
    languageChangeControllers.push(sourceLibrary);
  }

  const switchLanguage = async (newLang: Lang) => {
    if (newLang === getLang()) return;
    const requestVersion = ++loadVersion;
    setLang(newLang);
    narrationController.resetForDocument(
      document.getElementById("page-narration-button") as HTMLButtonElement | null,
    );
    languageChangeControllers.forEach((controller) => controller.onLanguageChanged());
    renderShell(newLang);
    const target = container;
    if (!target) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
    bindShellControls({
      onGenerate,
      onSwitchLang: switchLanguage,
      onSelectExample: selectExample,
      onOpenSourceLibrary: sourceLibrary?.open,
      getRuntime: () => activeRuntime,
    });

    const doc = activeDoc;
    if (doc.type === "example") {
      const item = getExampleItems(newLang).find((i) => i.id === doc.exampleId);
      if (item) {
        await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
        if (requestVersion !== loadVersion) return;
        const staticAudioUrl = staticExampleAudioUrl(doc.exampleId, newLang);
        bindExampleAudio(staticAudioUrl, newLang);
        return;
      }
    }
    if (requestVersion !== loadVersion) return;
    if (doc.type === "project" && activeRuntime) {
      activeRuntime = { ...activeRuntime, container: target };
      renderSurfaces(target, activeRuntime.processor, activeRuntime.modeHint);
      configureProjectNarration({
        button: document.getElementById("page-narration-button") as HTMLButtonElement | null,
        project: {
          id: doc.projectId,
          title: doc.title || doc.projectId,
          openedAt: new Date().toISOString(),
        },
        apiBaseUrl: editorApiBaseUrl().replace(/\/+$/, ""),
        narrationController,
      });
      return;
    }
    // renderShell() already mounted the localized welcome state and bound its
    // example gallery handlers before this branch is reached.
  };

  if (!initialConfig.embed) {
    bindShellControls({
      onGenerate,
      onSwitchLang: switchLanguage,
      onSelectExample: selectExample,
      onOpenSourceLibrary: sourceLibrary?.open,
      getRuntime: () => activeRuntime,
    });
  }

  window.addEventListener("message", createEmbedMessageHandler({
    onOrigin: (origin) => { parentOrigin = origin; },
    onConfig: (config) => { void startWithConfig(config); },
  }));

  if (initialProjectId) {
    await openProject({ id: initialProjectId, title: initialProjectId, openedAt: new Date().toISOString() });
  } else if (hasExplicitSource || initialConfig.embed) {
    await startWithConfig(initialConfig);
    // A direct example URL (for example ?example=hash-table) bypasses the
    // gallery click handler, so attach its bundled narration after loading.
    if (!initialConfig.embed && initialExample) {
      const staticAudioUrl = staticExampleAudioUrl(initialExample, getLang());
      bindExampleAudio(staticAudioUrl);
    }
  } else if (container) {
    // Nothing explicit was requested (typical first visit to the static
    // deployment) — the placeholder "/generated/site_messages.json" would
    // just 404. Show a friendly, localized nudge toward the example gallery
    // instead of a fetch-failure error. A known example hash or gallery query
    // only controls which gallery category is expanded; the visitor still
    // chooses the case. renderShell() has already mounted this welcome state.
  }
}

async function bootstrap() {
  if (import.meta.env.MODE === "gallery") {
    const root = setupRoot();
    if (root) {
      bootstrapGallery(root);
    }
    return;
  }
  await bootstrapViewer();
}

bootstrap().catch((err) => {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }
  const target =
    document.getElementById("gallery-preview") ||
    document.getElementById("surface-container") ||
    root;
  showState(target as HTMLElement, String(err), "error");
});
