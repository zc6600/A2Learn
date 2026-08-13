export type A2uiMessageLike = Record<string, unknown>;
export type DemoCategory = "component" | "website" | "course" | "computer";

export interface DemoItem {
  id: string;
  title: string;
  filename: string;
  category: DemoCategory;
  description: string;
  messages: A2uiMessageLike[];
}

interface ExampleData {
  messages?: A2uiMessageLike[];
  description?: string;
}

interface ExampleModule {
  default: ExampleData | A2uiMessageLike[];
}

export function getComponentGalleryItems(catalogId: string): DemoItem[] {
  const items: DemoItem[] = [];
  const entries = getSortedExampleEntries();












  for (const [path, module] of entries) {
    // extract relative path from "examples/"
    const match = path.match(/examples\/(.+)$/);
    const relPath = match ? match[1] : path;
    
    const [messages, description] = extractMessagesAndDescription(
      module.default,
      relPath,
    );
    const category = resolveCategory(relPath);

    const surfaceId = ensureCreateSurfaceMessage(relPath, messages, catalogId);
    items.push({
      id: surfaceId,
      title: filenameToTitle(relPath),
      filename: relPath,
      category,
      description,
      messages,
    });
  }

  return items;
}

function getSortedExampleEntries(): [string, ExampleModule][] {
  const a2learnModules = (import.meta as any).glob(
    "../../a2learn-catalog/examples/**/*.json",
    { eager: true },
  ) as Record<string, ExampleModule>;
  return (Object.entries(a2learnModules) as [string, ExampleModule][])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function extractMessagesAndDescription(
  data: ExampleData | A2uiMessageLike[],
  filename: string,
): [A2uiMessageLike[], string] {
  if (Array.isArray(data)) {
    return [data, `Source: ${filename}`];
  }
  return [data.messages ?? [], data.description ?? `Source: ${filename}`];
}

function ensureCreateSurfaceMessage(
  relPath: string,
  messages: A2uiMessageLike[],
  catalogId: string,
): string {
  let surfaceId = relPath.replace(".json", "").replace(/\//g, "-");
  const create = messages.find((msg) => hasCreateSurface(msg));

  if (create) {
    surfaceId = getSurfaceId(create) ?? surfaceId;
  } else {
    messages.unshift({
      version: "v0.9",
      createSurface: {
        surfaceId,
        catalogId,
      },
    });
  }
  return surfaceId;
}

function hasCreateSurface(msg: A2uiMessageLike): boolean {
  return typeof msg === "object" && msg !== null && "createSurface" in msg;
}

function getSurfaceId(msg: A2uiMessageLike): string | undefined {
  if (!hasCreateSurface(msg)) {
    return undefined;
  }
  const surface = (msg as { createSurface?: { surfaceId?: string } }).createSurface;
  return surface?.surfaceId;
}

function filenameToTitle(relPath: string): string {
  const parts = relPath.replace(".json", "").split("/");
  return parts
    .map(part => 
      part
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" - ");
}

function resolveCategory(relPath: string): DemoCategory {
  const pathSegments = relPath.split("/").map((segment) => segment.toLowerCase());
  const topLevel = pathSegments[0] ?? "";
  if (pathSegments.includes("course") || pathSegments.includes("courses")) {
    return "course";
  }
  if (topLevel === "scenarios" || topLevel === "website" || topLevel === "websites") {
    return "website";
  }
  if (topLevel === "computer" || topLevel === "computing") {
    return "computer";
  }
  if (topLevel === "course" || topLevel === "courses") {
    return "course";
  }
  return "component";
}
