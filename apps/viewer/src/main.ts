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
import { renderSurfaces } from "./surface-renderer";
import { NarrationController } from "./narration-controller";
import { sendOnlineSessionAction, startOnlineSession } from "./online-session";
import { CHROME_STRINGS, T } from "./viewer-copy";
import { loadViewerSource } from "./viewer-loader";
import {
  clearExamplesUsingComponent,
  generationSettingsHtml,
  getLocalExampleComponents,
  isAudioEnabled,
  markSettingsAsCustom,
  profileFromSettingsInputs,
  setAudioEnabled,
  setExampleComponentInputs,
  staticExampleAudioUrl,
  syncGenerationSettingsInputs,
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
  InitMessage,
  ReadyMessage,
  ResizeMessage,
  ViewerRuntimeConfig,
  ViewerSourceOffline,
  ViewerSourceOnline,
} from "./viewer-types";
import { recentProjects, rememberProject, type RecentProject } from "./recent-projects";
import {
  LOCAL_EXAMPLES,
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  getGenerationTemplate,
  getStoredGenerationProfile,
  profileForTemplate,
  setStoredGenerationProfile,
  type Lang,
} from "./generation-profile";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;

const narrationController = new NarrationController(() => getLang() === "en");



function setupRoot(): HTMLElement | null {
  const root = document.getElementById("app");
  if (!root) {
    return null;
  }
  root.setAttribute("role", "main");
  injectBaseTheme();
  return root;
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

function postToParent(message: ReadyMessage | ResizeMessage, targetOrigin: string): void {
  if (window.parent === window) {
    return;
  }
  try {
    window.parent.postMessage(message, targetOrigin);
  } catch {
    // ignore
  }
}

function setupAutoResize(container: HTMLElement, getTargetOrigin: () => string): () => void {
  if (window.parent === window) {
    return () => {};
  }
  let raf = 0;
  const send = () => {
    if (raf) {
      cancelAnimationFrame(raf);
    }
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
    if (raf) {
      cancelAnimationFrame(raf);
    }
  };
}

async function bootstrapOnline(
  container: HTMLElement,
  source: ViewerSourceOnline,
  isCurrent: () => boolean = () => true,
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


const LOCAL_STORAGE_KEY = "a2learn_user_api_key";

function getStoredApiKey(): string {
  try {
    return (localStorage.getItem(LOCAL_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function setStoredApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function updateKeyPillStatus(): void {
  const pill = document.getElementById("app-key-pill");
  if (!pill) return;
  const key = getStoredApiKey();
  const lang = getLang();
  if (key) {
    pill.className = "app-key-pill active";
    pill.textContent = lang === "zh" ? "🔑 API Key 已配置" : "🔑 API Key configured";
  } else {
    pill.className = "app-key-pill missing";
    pill.textContent = CHROME_STRINGS[lang].keyPillMissingLabel;
  }
}

// The settings modal is torn down and rebuilt every time the shell re-renders
// (language switch), so these always re-query the live DOM rather than
// closing over elements that may already be detached.
function openSettingsModal(): void {
  const modal = document.getElementById("app-settings-modal");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  if (keyInput) keyInput.value = getStoredApiKey();
  syncGenerationSettingsInputs(getStoredGenerationProfile());
  modal?.classList.remove("hidden");
}

function closeSettingsModal(): void {
  document.getElementById("app-settings-modal")?.classList.add("hidden");
}

// Rebindable per-render controls: the settings modal, prompt form, preset
// chips, language buttons, and example gallery. All of these live inside the
// markup renderAppFrame() regenerates on every language switch, so this must
// be called again after every re-render (the previous DOM nodes — and their
// listeners — are discarded together, so this never double-binds).
function bindShellControls(
  onGenerate: (promptText: string) => void,
  onSwitchLang: (lang: Lang) => void,
  onSelectExample: (id: string) => void,
  onOpenSourceLibrary?: () => void,
): void {
  updateKeyPillStatus();

  const settingsBtn = document.getElementById("app-settings-btn");
  const modal = document.getElementById("app-settings-modal");
  const closeBtn = document.getElementById("app-modal-close");
  const saveBtn = document.getElementById("app-modal-save");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  const form = document.getElementById("app-prompt-form") as HTMLFormElement | null;
  const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;
  const sourceLibraryButton = document.getElementById("app-source-library-btn");
  const templateInputs = document.querySelectorAll<HTMLInputElement>(".generation-template-input");
  const templatePreviewButtons = document.querySelectorAll<HTMLButtonElement>(".generation-template-preview");
  const componentInputs = document.querySelectorAll<HTMLInputElement>(".generation-component-input");
  const exampleInputs = document.querySelectorAll<HTMLInputElement>(".generation-example-input");

  const keyPill = document.getElementById("app-key-pill");

  settingsBtn?.addEventListener("click", openSettingsModal);
  keyPill?.addEventListener("click", openSettingsModal);
  closeBtn?.addEventListener("click", closeSettingsModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeSettingsModal();
  });

  saveBtn?.addEventListener("click", () => {
    if (keyInput) {
      setStoredApiKey(keyInput.value);
      updateKeyPillStatus();
    }
    const profile = setStoredGenerationProfile(profileFromSettingsInputs());
    const audioInput = document.getElementById("generation-audio-enabled") as HTMLInputElement | null;
    if (audioInput) setAudioEnabled(audioInput.checked);
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) narrationButton.hidden = !isAudioEnabled();
    applyGenerationTheme(profile.themeId, profile.displayMode);
    if (activeRuntime) {
      renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
    }
    closeSettingsModal();
  });

  templateInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        syncGenerationSettingsInputs(profileForTemplate(input.value));
        document.querySelector<HTMLDetailsElement>(".generation-advanced-settings")?.removeAttribute("open");
      }
    });
  });

  templatePreviewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const template = getGenerationTemplate(button.dataset.templatePreview || "");
      closeSettingsModal();
      onSelectExample(template.previewExampleId);
    });
  });

  componentInputs.forEach((input) => {
    input.addEventListener("change", () => {
      markSettingsAsCustom();
      if (!input.checked) {
        // A reference case is only meaningful while all of the components it
        // demonstrates remain available. Turning one off therefore removes
        // only the dependent examples, never restores a hidden default.
        clearExamplesUsingComponent(input.dataset.componentId || "");
      }
      const current = profileFromSettingsInputs();
      if (input.checked && current.enabledComponents.length > MAX_ENABLED_COMPONENTS) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_ENABLED_COMPONENTS} 个组件。` : `Choose at most ${MAX_ENABLED_COMPONENTS} components for one run.`);
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
  });

  exampleInputs.forEach((input) => {
    input.addEventListener("change", () => {
      markSettingsAsCustom();
      const selectedProfile = profileFromSettingsInputs();
      const selectedExampleCount = document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked").length;
      if (input.checked && selectedExampleCount > MAX_EXAMPLE_CASES) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_EXAMPLE_CASES} 个本地案例。` : `Choose at most ${MAX_EXAMPLE_CASES} local examples for one run.`);
      } else if (input.checked) {
        const requiredComponents = getLocalExampleComponents(input.dataset.exampleId || "");
        const combined = new Set([...selectedProfile.enabledComponents, ...requiredComponents]);
        if (combined.size > MAX_ENABLED_COMPONENTS) {
          input.checked = false;
          alert(getLang() === "zh" ? `该案例需要的组件会超过 ${MAX_ENABLED_COMPONENTS} 个上限。` : `This example would require more than ${MAX_ENABLED_COMPONENTS} components.`);
        } else {
          setExampleComponentInputs(requiredComponents, true);
        }
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
  });

  document.querySelectorAll<HTMLInputElement>("input[name='generation-theme'], input[name='generation-display-mode'], #generation-image-limit")
    .forEach((input) => input.addEventListener("change", markSettingsAsCustom));
  document.getElementById("generation-visual-intent")?.addEventListener("input", markSettingsAsCustom);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const promptText = (promptInput?.value || "").trim();
    if (!promptText) return;

    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[getLang()].needApiKeyExplore);
      return;
    }
    onGenerate(promptText);
  });

  sourceLibraryButton?.addEventListener("click", () => onOpenSourceLibrary?.());

  document.querySelectorAll(".app-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = chip.getAttribute("data-preset");
      if (preset) {
        if (promptInput) promptInput.value = preset;
        if (!getStoredApiKey()) {
          openSettingsModal();
          alert(T[getLang()].needApiKeyPreset);
          return;
        }
        onGenerate(preset);
      }
    });
  });

  const zhBtn = document.getElementById("lang-zh-btn");
  const enBtn = document.getElementById("lang-en-btn");
  zhBtn?.addEventListener("click", () => onSwitchLang("zh"));
  enBtn?.addEventListener("click", () => onSwitchLang("en"));

  document.querySelectorAll<HTMLElement>("[data-example-gallery]").forEach((gallery) => {
    gallery.addEventListener("click", (e: MouseEvent) => {
      const card = (e.target as HTMLElement)?.closest<HTMLElement>(".example-card");
      const id = card?.dataset.exampleId;
      if (!id) return;
      onSelectExample(id);
    });
  });
}

// True global listeners: unlike bindShellControls(), these don't touch any
// DOM that gets torn down on a language switch (composedPath delegation, or
// re-querying #app-prompt-input fresh each time it fires) — so they're bound
// exactly once for the page's lifetime instead of once per render.
let globalListenersBound = false;
function bindGlobalListenersOnce(askAgent: (promptText: string) => void): void {
  if (globalListenersBound) return;
  globalListenersBound = true;

  window.addEventListener("a2learn-explore-concept", (e: Event) => {
    const concept = (e as CustomEvent).detail?.concept;
    if (!concept) return;
    const lang = getLang();
    const promptText = lang === "zh" ? `详细解释 ${concept}` : `Explain ${concept} in detail`;

    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[lang].needApiKeyExplore);
      return;
    }
    askAgent(promptText);
  });

  document.addEventListener("click", (e: MouseEvent) => {
    const path = e.composedPath();
    const btn = path.find(
      (el) =>
        el instanceof HTMLElement &&
        el.classList.contains("tooltip-explore-btn")
    ) as HTMLElement | undefined;

    if (btn) {
      const term = btn.getAttribute("data-term");
      if (term) {
        window.dispatchEvent(
          new CustomEvent("a2learn-explore-concept", {
            detail: { concept: term },
          })
        );
      }
    }
  });
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

  type ContentState = { kind: "example" | "project"; id: string } | { kind: "other" };
  let currentContent: ContentState = { kind: "other" };
  let loadVersion = 0;
  const locationParams = new URLSearchParams(window.location.search);
  const initialProjectId = locationParams.get("project");
  const initialEditorExample = locationParams.get("example");
  if (initialProjectId) {
    currentContent = { kind: "project", id: initialProjectId };
  } else if (import.meta.env.MODE === "editor" || locationParams.get("mode") === "editor") {
    currentContent = { kind: "example", id: initialEditorExample || "hash-table" };
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

  const renderShell = (lang: Lang) => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    const title = initialConfig.embed ? "" : "A2Learn Showcase Generator";
    const subtitle = initialConfig.embed ? "" : T[lang].subtitle;

    const deepLinkedExample = LOCAL_EXAMPLES.find((example) => example.id === readCurrentSurfaceHash());
    const galleryCategory = readGalleryCategory() || deepLinkedExample?.category;
    const examplesHtml = initialConfig.embed
      ? ""
      : renderCollapsibleExampleGallery(lang, galleryCategory);

    const chrome: AppChromeStrings = {
      ...CHROME_STRINGS[lang],
      settingsContentHtml: generationSettingsHtml(lang, getStoredGenerationProfile()),
    };
    renderAppFrame(
      root,
      title,
      subtitle,
      `${examplesHtml}<section id="surface-container" aria-live="polite">
        <p class="viewer-state loading">${T[lang].loadingShowcase}</p>
      </section><button id="page-narration-button" type="button" hidden aria-label="播放讲稿">🔊</button>`,
      initialConfig.embed ? undefined : { lang, chrome },
    );
  container = document.getElementById("surface-container");
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      narrationButton.style.cssText = "position:fixed;right:22px;bottom:78px;z-index:999;border:0;border-radius:50%;width:34px;height:34px;cursor:pointer;background:#0d9488;color:white;box-shadow:0 3px 12px #0003";
      narrationButton.title = lang === "en" ? "Play narration" : "播放讲稿";
      narrationButton.addEventListener("click", () => {
        void narrationController.toggle(narrationButton);
      });
    }
  };

  renderShell(getLang());
  if (!container) {
    return;
  }

  if (!initialConfig.embed) {
    const getCurrentProjectId = () => {
      if (currentContent.kind === "other") return null;
      return currentContent.kind === "example"
        ? `example-${getLang()}-${currentContent.id}`
        : currentContent.id;
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
        currentContent = { kind: "project", id: projectId };
        rememberProject(projectId, title);
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
      bootstrapOnline,
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
    narrationController.stop();
    currentContent = { kind: "example", id };
    updateProjectUrl(null);
    const staticAudioUrl = staticExampleAudioUrl(id, getLang());
    // Bundled examples with a pre-generated asset must stay fully offline:
    // selecting audio should bind the shipped MP3, never regenerate it.
    if (isAudioEnabled() && staticAudioUrl) {
      await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
      if (!isCurrent()) return;
      const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
      if (narrationButton) {
        narrationButton.dataset.audioUrl = staticAudioUrl;
        narrationButton.hidden = false;
        narrationButton.title = getLang() === "en" ? "Play narration" : "播放讲稿音频";
      }
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
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      const audioUrl = staticAudioUrl;
      narrationButton.dataset.audioUrl = audioUrl || "";
      narrationButton.hidden = !isAudioEnabled() || !audioUrl;
      narrationButton.title = audioUrl
        ? (getLang() === "en" ? "Play narration" : "播放讲稿音频")
        : (getLang() === "en" ? "No narration available" : "暂无预生成音频");
    }
  };

  const openProject = async (project: RecentProject, expectedVersion?: number) => {
    const requestVersion = expectedVersion ?? ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
    const target = container;
    if (!target) return;
    const apiBaseUrl = editorApiBaseUrl().replace(/\/+$/, "");
    if (!apiBaseUrl) {
      throw new Error(getLang() === "en" ? "The editing API is not configured." : "未配置编辑 API 服务。");
    }
    const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(project.id)}/a2ui`);
    if (!response.ok) {
      throw new Error(getLang() === "en" ? `Could not open the page (${response.status})` : `打开页面失败 (${response.status})`);
    }
    const payload = await response.json() as { messages?: A2uiMessage[] };
    if (!isCurrent()) return;
    if (!Array.isArray(payload.messages)) {
      throw new Error(getLang() === "en" ? "Invalid page data" : "页面数据无效");
    }
    const processor = new MessageProcessor([a2learnCatalog], () => undefined);
    processor.processMessages(payload.messages);
    activeRuntime = { container: target, processor, modeHint: "Project editor mode." };
    currentContent = { kind: "project", id: project.id };
    rememberProject(project.id, project.title);
    updateProjectUrl(project.id);
    const firstSurface = extractFirstCreatedSurfaceId(payload.messages);
    if (firstSurface) window.location.hash = `#/${firstSurface}`;
    renderSurfaces(target, processor, "Project editor mode.");
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      narrationButton.hidden = !isAudioEnabled();
      narrationButton.onclick = () => {
        const language = getLang() === "en" ? "en" : "zh";
        void narrationController.toggle(narrationButton, async () => {
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
  };

  const onGenerate = (promptText: string) => {
    const target = container;
    if (!target) return;
    currentContent = { kind: "other" };
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
    currentContent = { kind: "other" };
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
    narrationController.stop();
    languageChangeControllers.forEach((controller) => controller.onLanguageChanged());
    renderShell(newLang);
    const target = container;
    if (!target) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);

    const content = currentContent;
    if (content.kind === "example") {
      const item = getExampleItems(newLang).find((i) => i.id === content.id);
      if (item) {
        await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
        return;
      }
    }
    if (requestVersion !== loadVersion) return;
    if (content.kind === "project" && activeRuntime) {
      activeRuntime = { ...activeRuntime, container: target };
      renderSurfaces(target, activeRuntime.processor, activeRuntime.modeHint);
      return;
    }
    showState(target, T[newLang].pickExamplePrompt, "empty");
  };

  if (!initialConfig.embed) {
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!isPlainObject(data)) {
      return;
    }
    if (data.type === "a2learn:init" && isPlainObject((data as any).source)) {
      const source = (data as InitMessage).source;
      parentOrigin = event.origin || "*";

      const themeVarsFromSource = normalizeThemeVars((source as any).themeVars);

      if (source.mode === "online" && typeof (source as any).apiBaseUrl === "string") {
        const next: ViewerRuntimeConfig = {
          embed: true,
          source: {
            mode: "online",
            apiBaseUrl: normalizeBaseUrl(String((source as any).apiBaseUrl || "")),
            resourcePath: typeof (source as any).resourcePath === "string" ? String((source as any).resourcePath) : undefined,
            resourceText: typeof (source as any).resourceText === "string" ? String((source as any).resourceText) : undefined,
            language: (source as any).language === "zh" || (source as any).language === "en" ? (source as any).language : getLang(),
            headers: isPlainObject((source as any).headers)
              ? Object.fromEntries(
                  Object.entries((source as any).headers).filter(([, v]) => typeof v === "string") as Array<[
                    string,
                    string,
                  ]>,
                )
              : undefined,
            themeVars: themeVarsFromSource,
          },
        };
        void startWithConfig(next);
        return;
      }

      if (source.mode === "offline" && typeof (source as any).messagesUrl === "string") {
        const next: ViewerRuntimeConfig = {
          embed: true,
          source: {
            mode: "offline",
            messagesUrl: String((source as any).messagesUrl || "").trim() || "/generated/site_messages.json",
            themeVars: themeVarsFromSource,
          },
        };
        void startWithConfig(next);
      }
    }
  };

  window.addEventListener("message", onMessage);

  if (initialProjectId) {
    await openProject({ id: initialProjectId, title: initialProjectId, openedAt: new Date().toISOString() });
  } else if (hasExplicitSource || initialConfig.embed) {
    await startWithConfig(initialConfig);
  } else if (container) {
    // Nothing explicit was requested (typical first visit to the static
    // deployment) — the placeholder "/generated/site_messages.json" would
    // just 404. Show a friendly, localized nudge toward the example gallery
    // instead of a fetch-failure error. A known example hash or gallery query
    // only controls which gallery category is expanded; the visitor still
    // chooses the case.
    showState(container, T[getLang()].pickExamplePrompt, "empty");
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
