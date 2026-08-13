import { ComponentModel, SurfaceModel } from "@a2ui/web_core/v0_9";

type Surface = SurfaceModel<any>;

export type PresentationItem = {
  reference: any;
  componentId?: string;
  text?: string;
};

export type PresentationPage = {
  items: PresentationItem[];
  scale: number;
};

export type PresentationSurface = {
  surface: Surface;
  dispose: () => void;
};

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

function copyValue<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function getRootId(surface: Surface): string | null {
  if (surface.componentsModel.get("root")) return "root";
  const expected = `root-${surface.id}`;
  if (surface.componentsModel.get(expected)) return expected;
  for (const [id] of surface.componentsModel.entries) {
    if (id.startsWith("root")) return id;
  }
  return null;
}

function getReferenceId(reference: any): string | undefined {
  if (typeof reference === "string") return reference;
  if (reference && typeof reference === "object" && typeof reference.id === "string") {
    return reference.id;
  }
  return undefined;
}

function isTextItem(surface: Surface, item: PresentationItem): boolean {
  const id = item.componentId ?? getReferenceId(item.reference);
  return !!id && surface.componentsModel.get(id)?.type === "Text";
}

function textForItem(surface: Surface, item: PresentationItem): string | undefined {
  if (!isTextItem(surface, item)) return undefined;
  if (typeof item.text === "string") return item.text;
  const id = item.componentId ?? getReferenceId(item.reference);
  const text = id ? surface.componentsModel.get(id)?.properties.text : undefined;
  return typeof text === "string" ? text : undefined;
}

function splitText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  const sentences = text
    .split(/(?<=[。！？!?；;])\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : [text];
}

function rootChildren(surface: Surface): PresentationItem[] | null {
  const rootId = getRootId(surface);
  if (!rootId) return null;
  const root = surface.componentsModel.get(rootId);
  if (root?.type !== "Column" || !Array.isArray(root.properties.children)) return null;
  return root.properties.children.map((reference: any) => ({
    reference: copyValue(reference),
    componentId: getReferenceId(reference),
  }));
}

/**
 * Builds an independent surface for one presentation page. Component ids stay
 * intact, so the existing catalog and interaction handlers continue to work.
 */
export function createPresentationSurface(
  source: Surface,
  items: PresentationItem[],
  pageIndex: number,
): PresentationSurface {
  const rootId = getRootId(source);
  if (!rootId) throw new Error("Surface has no root component");

  const clone = new SurfaceModel(
    `${source.id}--presentation-${pageIndex}`,
    source.catalog,
    copyValue(source.theme),
    source.sendDataModel,
  );
  clone.dataModel.set("/", copyValue(source.dataModel.get("/")) ?? {});

  const textOverrides = new Map<string, string>();
  for (const item of items) {
    const id = item.componentId ?? getReferenceId(item.reference);
    if (id && typeof item.text === "string") textOverrides.set(id, item.text);
  }

  for (const [id, component] of source.componentsModel.entries) {
    const properties = copyValue(component.properties);
    if (id === rootId) {
      properties.children = items.map((item) => copyValue(item.reference));
    }
    if (textOverrides.has(id)) {
      properties.text = textOverrides.get(id);
    }
    clone.componentsModel.addComponent(new ComponentModel(id, component.type, properties));
  }

  const actionSubscription = clone.onAction.subscribe(async (action) => {
    await source.dispatchAction(
      { event: { name: action.name, context: action.context } },
      action.sourceComponentId,
    );
  });

  return {
    surface: clone,
    dispose: () => {
      actionSubscription.unsubscribe();
      clone.dispose();
    },
  };
}

function nextFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function measurePage(source: Surface, items: PresentationItem[]): Promise<number> {
  const staging = document.createElement("div");
  staging.className = "presentation-measure-stage";
  staging.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("div");
  canvas.className = "presentation-measure-canvas";
  const rendered = document.createElement("a2learn-markdown-surface") as any;
  const page = createPresentationSurface(source, items, -1);
  rendered.surface = page.surface;
  canvas.appendChild(rendered);
  staging.appendChild(canvas);
  document.body.appendChild(staging);

  try {
    await customElements.whenDefined("a2learn-markdown-surface");
    await nextFrames();
    return canvas.scrollHeight;
  } finally {
    staging.remove();
    page.dispose();
  }
}

async function splitTextToFit(
  source: Surface,
  prefix: PresentationItem[],
  item: PresentationItem,
): Promise<[PresentationItem | null, PresentationItem | null]> {
  const text = textForItem(source, item);
  if (!text) return [null, null];

  const parts = splitText(text);
  if (parts.length < 2) return [null, null];

  let fitCount = 0;
  for (let index = 1; index <= parts.length; index += 1) {
    const candidate: PresentationItem = { ...item, text: parts.slice(0, index).join("\n\n") };
    const height = await measurePage(source, [...prefix, candidate]);
    if (height > CANVAS_HEIGHT + 1) break;
    fitCount = index;
  }

  if (fitCount === 0) return [null, null];
  const first: PresentationItem = { ...item, text: parts.slice(0, fitCount).join("\n\n") };
  const remaining = parts.slice(fitCount).join("\n\n");
  return [first, remaining ? { ...item, text: remaining } : null];
}

function isHeaderItem(surface: Surface, item: PresentationItem): boolean {
  const id = item.componentId ?? getReferenceId(item.reference);
  if (!id) return false;
  const comp = surface.componentsModel.get(id);
  if (!comp) return false;
  if (comp.type === "Text") {
    const variant = comp.properties?.variant;
    if (variant === "h1" || variant === "h2" || variant === "h3") return true;
    if (typeof id === "string" && id.endsWith("-title")) return true;
  }
  return false;
}

/**
 * Measures real rendered blocks, then greedily fills a 1280×720 page. Text
 * blocks may be split at paragraphs/sentences; other components remain whole.
 */
export async function paginateSurface(source: Surface): Promise<PresentationPage[] | null> {
  const pending = rootChildren(source);
  if (!pending?.length) return null;

  const pages: PresentationPage[] = [];
  let current: PresentationItem[] = [];

  while (pending.length > 0) {
    const item = pending.shift()!;
    const candidateHeight = await measurePage(source, [...current, item]);

    if (candidateHeight <= CANVAS_HEIGHT + 1) {
      // Prevent orphan headers at the bottom of a slide:
      // If `item` is a section header and the following component won't fit on this slide,
      // move the header to the next slide together with its component.
      if (current.length > 0 && isHeaderItem(source, item) && pending.length > 0) {
        const nextItem = pending[0];
        const combinedHeight = await measurePage(source, [...current, item, nextItem]);
        if (combinedHeight > CANVAS_HEIGHT + 1) {
          pages.push({ items: current, scale: 1 });
          current = [item];
          continue;
        }
      }

      current.push(item);
      continue;
    }

    if (isTextItem(source, item)) {
      const [firstPart, remainingPart] = await splitTextToFit(source, current, item);
      if (firstPart) {
        current.push(firstPart);
        pages.push({ items: current, scale: 1 });
        current = [];
        if (remainingPart) pending.unshift(remainingPart);
        continue;
      }
    }

    if (current.length > 0) {
      pages.push({ items: current, scale: 1 });
      current = [];
      pending.unshift(item);
      continue;
    }

    // Complex custom components are deliberately never cut in half. If one is
    // taller than a page, the rendered page stays readable and scrolls.
    pages.push({
      items: [item],
      scale: 1,
    });
  }

  if (current.length > 0) pages.push({ items: current, scale: 1 });
  return pages;
}

function componentContains(source: Surface, componentId: string, targetId: string, seen = new Set<string>()): boolean {
  if (componentId === targetId) return true;
  if (seen.has(componentId)) return false;
  seen.add(componentId);
  const component = source.componentsModel.get(componentId);
  if (!component) return false;

  const visit = (value: unknown): boolean => {
    if (typeof value === "string") {
      return source.componentsModel.get(value)
        ? componentContains(source, value, targetId, seen)
        : false;
    }
    if (Array.isArray(value)) return value.some(visit);
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.id === "string" && source.componentsModel.get(record.id)) {
        return componentContains(source, record.id, targetId, seen);
      }
      return Object.values(record).some(visit);
    }
    return false;
  };

  return visit(component.properties);
}

/** Returns the auto-generated page that contains an A2UI component id. */
export function findPresentationPageIndex(
  source: Surface,
  pages: PresentationPage[],
  targetComponentId: string,
): number {
  return pages.findIndex((page) => page.items.some((item) => {
    const itemId = item.componentId ?? getReferenceId(item.reference);
    return !!itemId && componentContains(source, itemId, targetComponentId);
  }));
}

export const PRESENTATION_CANVAS = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
