import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { showState } from "@a2learn/viewer-kit/page-shell";
import { getStoredGenerationProfile } from "./generation-profile";
import {
  createPresentationSurface,
  findPresentationPageIndex,
  paginateSurface,
  type PresentationPage,
  type PresentationSurface,
} from "./presentation-paginator";
import { getLang } from "./viewer-config";
import { T } from "./viewer-copy";

let presentationRenderVersion = 0;
let activePresentationPage: PresentationSurface | null = null;

function injectRoutingTheme(): void {}

function getSurfaceTitle(surface: any): string {
  if (surface.name) return surface.name;
  
  if (surface.componentsMap && surface.componentsMap.size > 0) {
    const components = Array.from(surface.componentsMap.values()) as any[];
    
    // Look for first Text component with variant h1/h2
    const headingComp = components.find((c: any) => c.component === "Text" && (c.variant === "h1" || c.variant === "h2") && c.text);
    if (headingComp && headingComp.text) {
      return headingComp.text;
    }

    // Look for custom catalog components with title (ConceptCard, AnalogyCard, MentalModel, DetailedExplanation, etc.)
    const titleComp = components.find((c: any) => c.title && typeof c.title === "string");
    if (titleComp) {
      return titleComp.title;
    }
    
    // Look for any Text component
    const anyTextComp = components.find((c: any) => c.component === "Text" && c.text);
    if (anyTextComp && anyTextComp.text) {
      return anyTextComp.text;
    }
  }
  
  const rawId = (surface.id || "Page").toLowerCase();
  const lang = getLang();
  const fallbackLabels: Record<string, [string, string]> = {
    concept: ["💡 核心概念", "💡 Core Concept"],
    analogy: ["💡 直觉类比", "💡 Intuitive Analogy"],
    quiz: ["✍️ 自测练习", "✍️ Self Check"],
    outline: ["📚 课程大纲", "📚 Course Outline"],
    detail: ["📖 详细讲解", "📖 Deep Dive"],
    mental: ["🧠 心智模型", "🧠 Mental Model"],
  };
  const pickLabel = (key: string) => fallbackLabels[key][lang === "zh" ? 0 : 1];
  if (rawId.includes("main") || rawId.includes("concept")) return pickLabel("concept");
  if (rawId.includes("analogy")) return pickLabel("analogy");
  if (rawId.includes("quiz") || rawId.includes("test")) return pickLabel("quiz");
  if (rawId.includes("outline")) return pickLabel("outline");
  if (rawId.includes("detail") || rawId.includes("explain")) return pickLabel("detail");
  if (rawId.includes("mode") || rawId.includes("mental")) return pickLabel("mental");

  const cleanId = rawId
    .replace(/^site-/, "")
    .replace(/^surface-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return cleanId || (lang === "zh" ? "学习页面" : "Learning Page");
}

function injectPresentationContentTheme(): void {}

function disposePresentationPage(): void {
  activePresentationPage?.dispose();
  activePresentationPage = null;
}

function renderPresentationDeck(
  container: HTMLElement,
  source: any,
  title: string,
  modeHint?: string,
): void {
  const renderVersion = presentationRenderVersion;
  const deck = document.createElement("section");
  deck.className = "presentation-deck";
  deck.setAttribute("aria-label", modeHint || "Presentation content");

  const toolbar = document.createElement("div");
  toolbar.className = "presentation-deck-toolbar";
  const deckTitle = document.createElement("span");
  deckTitle.className = "presentation-deck-title";
  deckTitle.textContent = title;
  const controls = document.createElement("div");
  controls.className = "presentation-deck-controls";
  const previous = document.createElement("button");
  previous.className = "presentation-page-button";
  previous.type = "button";
  previous.textContent = getLang() === "zh" ? "上一页" : "Previous";
  const pageCount = document.createElement("span");
  pageCount.className = "presentation-page-count";
  const next = document.createElement("button");
  next.className = "presentation-page-button";
  next.type = "button";
  next.textContent = getLang() === "zh" ? "下一页" : "Next";
  const fullscreen = document.createElement("button");
  fullscreen.className = "presentation-page-button";
  fullscreen.type = "button";
  fullscreen.textContent = getLang() === "zh" ? "全屏" : "Full screen";
  fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement === container) {
      void document.exitFullscreen();
      return;
    }
    void container.requestFullscreen().catch(() => {
      // Fullscreen can be disallowed by an embedding host; normal viewing remains available.
    });
  });
  controls.append(previous, pageCount, next, fullscreen);
  toolbar.append(deckTitle, controls);

  const canvas = document.createElement("div");
  canvas.className = "presentation-page-canvas";
  deck.append(toolbar, canvas);
  container.appendChild(deck);

  const loading = document.createElement("span");
  loading.className = "presentation-page-count";
  loading.textContent = getLang() === "zh" ? "正在分页…" : "Paginating…";
  pageCount.replaceWith(loading);
  previous.disabled = true;
  next.disabled = true;

  void paginateSurface(source).then((pages) => {
    if (renderVersion !== presentationRenderVersion || !deck.isConnected) return;
    if (!pages?.length) {
      deck.remove();
      const fallback = document.createElement("a2learn-markdown-surface") as any;
      fallback.surface = source;
      fallback.setAttribute("data-surface-id", source.id ?? "");
      container.appendChild(fallback);
      setTimeout(() => stampComponentIds(container), 0);
      return;
    }

    let activeIndex = 0;
    const renderedCount = document.createElement("span");
    renderedCount.className = "presentation-page-count";
    loading.replaceWith(renderedCount);

    const renderPage = (index: number) => {
      if (renderVersion !== presentationRenderVersion) return;
      activeIndex = index;
      disposePresentationPage();
      canvas.innerHTML = "";
      const page: PresentationPage = pages[activeIndex];
      canvas.style.setProperty("--presentation-page-scale", String(page.scale));
      const content = document.createElement("div");
      content.className = "presentation-page-content";
      const rendered = document.createElement("a2learn-markdown-surface") as any;
      activePresentationPage = createPresentationSurface(source, page.items, activeIndex);
      rendered.surface = activePresentationPage.surface;
      rendered.setAttribute("data-surface-id", source.id ?? "");
      content.appendChild(rendered);
      canvas.appendChild(content);
      renderedCount.textContent = `${activeIndex + 1} / ${pages.length}`;
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === pages.length - 1;
      setTimeout(() => stampComponentIds(canvas), 0);
    };

    previous.addEventListener("click", () => renderPage(Math.max(0, activeIndex - 1)));
    next.addEventListener("click", () => renderPage(Math.min(pages.length - 1, activeIndex + 1)));
    // A right-click on the visible “Next” control is intentionally equivalent
    // to its normal click, so macOS secondary clicks do not merely focus it.
    next.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (!next.disabled) next.click();
    });
    next.addEventListener("mousedown", (event) => {
      // macOS can expose a secondary click as button 2 (mouse/two-finger) or
      // Control+primary click. Handle it at the control itself, before the
      // browser turns it into a focused context-menu target.
      if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!next.disabled) next.click();
    });
    deck.addEventListener("a2learn:navigate-component", (event) => {
      const targetComponentId = (event as CustomEvent<{ targetComponentId?: unknown }>).detail?.targetComponentId;
      if (typeof targetComponentId !== "string") return;
      const targetPage = findPresentationPageIndex(source, pages, targetComponentId);
      if (targetPage >= 0 && targetPage !== activeIndex) renderPage(targetPage);
    });

    // LearningPath normally performs its own hash/DOM navigation. In a paged
    // presentation, its destination can be on a different generated page, so
    // resolve the clicked step at the viewer level as well.
    deck.addEventListener("click", (event) => {
      const path = event.composedPath();
      const stepElement = path.find((node) => node instanceof HTMLElement && node.classList.contains("step")) as HTMLElement | undefined;
      const learningPath = path.find((node) => node instanceof HTMLElement && node.localName === "a2learn-learning-path") as HTMLElement | undefined;
      if (!stepElement || !learningPath) return;
      const steps = (learningPath as any).controller?.props?.steps;
      const siblingSteps = Array.from(stepElement.parentElement?.children || []).filter((node) => node instanceof HTMLElement && node.classList.contains("step"));
      const stepIndex = siblingSteps.indexOf(stepElement);
      const step = Array.isArray(steps) && stepIndex >= 0 ? steps[stepIndex] : null;
      if (!step || typeof step !== "object") return;
      if (typeof step.targetSurfaceId === "string" && step.targetSurfaceId) {
        window.location.hash = `#/${step.targetSurfaceId}`;
      }
      const targetComponentId = typeof step.targetSectionId === "string"
        ? step.targetSectionId
        : typeof step.targetComponentId === "string"
          ? step.targetComponentId
          : "";
      if (targetComponentId) {
        const targetPage = findPresentationPageIndex(source, pages, targetComponentId);
        if (targetPage >= 0 && targetPage !== activeIndex) renderPage(targetPage);
      }
    }, true);

    const isInteractiveTarget = (event: MouseEvent | PointerEvent): boolean => {
      const selector = "a, button, input, select, textarea, summary, [contenteditable='true'], [data-presentation-preserve-contextmenu]";
      return event.composedPath().some((node) => node instanceof Element && !!node.closest(selector));
    };
    const advanceWithRightClick = (event: MouseEvent | PointerEvent): boolean => {
      if (isInteractiveTarget(event) || activeIndex >= pages.length - 1) return false;
      event.preventDefault();
      renderPage(activeIndex + 1);
      return true;
    };
    let latestRightPointerAt = 0;
    const handleRightPointer = (event: PointerEvent | MouseEvent) => {
      if (event.button !== 2) return;
      if (advanceWithRightClick(event)) latestRightPointerAt = Date.now();
    };
    canvas.addEventListener("pointerdown", handleRightPointer, true);
    canvas.addEventListener("mousedown", handleRightPointer, true);
    canvas.addEventListener("contextmenu", (event) => {
      if (Date.now() - latestRightPointerAt < 600) {
        event.preventDefault();
        return;
      }
      advanceWithRightClick(event);
    }, true);
    renderPage(0);
  }).catch((error: unknown) => {
    if (renderVersion !== presentationRenderVersion || !deck.isConnected) return;
    deck.remove();
    showState(container, `Unable to paginate presentation content: ${String(error)}`, "error");
  });
}

export function renderSurfaces(
  container: HTMLElement,
  processor: MessageProcessor<any>,
  modeHint?: string,
): void {
  injectRoutingTheme();
  injectPresentationContentTheme();
  const generationProfile = getStoredGenerationProfile();
  document.documentElement.dataset.a2learnDisplayMode = generationProfile.displayMode;
  presentationRenderVersion += 1;
  disposePresentationPage();

  const surfaces = Array.from(processor.model.surfacesMap.values());
  if (surfaces.length === 0) {
    showState(container, "No renderable surfaces generated.");
    return;
  }

  container.innerHTML = "";

  // Determine the active surface ID
  const hash = window.location.hash;
  let activeId: string | null = null;
  if (hash.startsWith("#/")) {
    const parsedId = hash.slice(2);
    if (surfaces.some(s => s.id === parsedId)) {
      activeId = parsedId;
    }
  }
  
  if (!activeId && surfaces.length > 0) {
    activeId = surfaces[0].id ?? null;
  }

  // Render tab bar if there are multiple surfaces
  if (surfaces.length > 1) {
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "surface-tabs-container";

    const tabsList = document.createElement("div");
    tabsList.className = "surface-tabs";
    tabsList.setAttribute("role", "tablist");

    for (const surface of surfaces) {
      const surfaceId = surface.id ?? "";
      const isActive = surfaceId === activeId;
      const tabButton = document.createElement("button");
      tabButton.className = `surface-tab${isActive ? " active" : ""}`;
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-selected", isActive ? "true" : "false");
      tabButton.setAttribute("data-surface-id", surfaceId);
      
      const tabTitle = getSurfaceTitle(surface);
      tabButton.textContent = tabTitle;

      tabButton.addEventListener("click", () => {
        window.location.hash = `#/${surfaceId}`;
      });

      tabsList.appendChild(tabButton);
    }
    tabsContainer.appendChild(tabsList);
    container.appendChild(tabsContainer);
  }

  // Render only the active surface
  const activeSurface = surfaces.find(s => s.id === activeId);
  if (activeSurface) {
    if (generationProfile.displayMode === "presentation") {
      renderPresentationDeck(container, activeSurface, getSurfaceTitle(activeSurface), modeHint);
      return;
    }
    const el = document.createElement("a2learn-markdown-surface") as any;
    el.surface = activeSurface;
    el.setAttribute("data-surface-id", activeSurface.id ?? "");
    container.appendChild(el);
  }

  // A2UI's own component ids aren't reflected as DOM attributes anywhere, so
  // components like LearningPath that want to scroll to "targetComponentId"
  // have nothing to query for. Stamp data-component-id after Lit's initial
  // render settles (macrotask, so it runs after Lit's microtask-based
  // update cycle) so those lookups can actually find their target.
  setTimeout(() => stampComponentIds(container), 0);
}

// Catalog components (ConceptCard, LearningPath, etc.) are Lit elements that
// render into their own shadow roots, and a2ui-surface itself is shadow-DOM
// too — so a plain container.querySelectorAll("*") never reaches most of the
// tree. Recurse into every node's shadowRoot as well.
function stampComponentIds(root: ParentNode): void {
  const nodes = root.querySelectorAll<HTMLElement>("*");
  nodes.forEach((node) => {
    const ctx = (node as any).context;
    const id = ctx?.componentModel?.id;
    if (typeof id === "string" && id && !node.hasAttribute("data-component-id")) {
      node.setAttribute("data-component-id", id);
    }
    const shadow = (node as any).shadowRoot as ShadowRoot | null | undefined;
    if (shadow) {
      stampComponentIds(shadow);
    }
  });
}
