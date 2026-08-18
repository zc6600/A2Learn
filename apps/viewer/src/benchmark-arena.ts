import "./styles/runtime.css";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";
import "@a2learn/viewer-kit/markdown-surface";
import { injectBaseTheme } from "@a2learn/viewer-kit/page-shell";
import { renderSurfaces } from "./surface-renderer";

if (typeof document !== "undefined") {
  injectBaseTheme();
}

export function normalizeToA2uiMessages(input: any): any[] {
  if (!input) return [];
  let msgs: any[] = [];

  if (Array.isArray(input)) {
    if (input.some((m) => m && (m.createSurface || m.updateComponents))) {
      msgs = input;
    } else {
      msgs = [
        { version: "v0.9", createSurface: { surfaceId: "main" } },
        { version: "v0.9", updateComponents: { surfaceId: "main", components: input } },
      ];
    }
  } else if (typeof input === "object") {
    if (Array.isArray(input.a2ui_messages)) {
      msgs = input.a2ui_messages;
    } else if (Array.isArray(input.messages)) {
      msgs = input.messages;
    } else if (Array.isArray(input.components)) {
      msgs = [
        { version: "v0.9", createSurface: { surfaceId: "main" } },
        { version: "v0.9", updateComponents: { surfaceId: "main", components: input.components } },
      ];
    } else if (input.component || input.type) {
      msgs = [
        { version: "v0.9", createSurface: { surfaceId: "main" } },
        { version: "v0.9", updateComponents: { surfaceId: "main", components: [input] } },
      ];
    }
  }

  // Ensure A2UI surface has a root layout component
  for (const m of msgs) {
    if (m && m.updateComponents && Array.isArray(m.updateComponents.components)) {
      const comps = m.updateComponents.components;
      // Ensure all components have an ID
      comps.forEach((c: any, idx: number) => {
        if (!c.id) c.id = `comp_${idx}`;
      });

      const hasRoot = comps.some((c: any) => c.id === "root" || (typeof c.id === "string" && c.id.startsWith("root")));
      if (!hasRoot && comps.length > 0) {
        const childIds = comps.map((c: any) => c.id);
        comps.unshift({
          id: "root",
          component: "Column",
          children: childIds,
        });
      }
    }
  }

  return msgs;
}

export function renderBenchmarkA2UISurface(container: HTMLElement, rawInput: any): void {
  container.innerHTML = "";
  const messages = normalizeToA2uiMessages(rawInput);
  if (!Array.isArray(messages) || messages.length === 0) {
    container.innerHTML = `<div class="viewer-state error" style="padding: 2rem; text-align: center; color: #fb7185;">⚠️ 未检测到有效 A2UI 消息组件</div>`;
    return;
  }

  try {
    const processor = new MessageProcessor([a2learnCatalog]);
    processor.processMessages(messages);
    renderSurfaces(container, processor, "Benchmark Live Mode");
  } catch (err) {
    container.innerHTML = `<div class="viewer-state error" style="padding: 2rem; text-align: center; color: #fb7185;">A2UI 渲染异常: ${String(err)}</div>`;
  }
}

// Attach to window global for benchmark preview arena
if (typeof window !== "undefined") {
  (window as any).A2LearnBenchmarkRenderer = {
    renderBenchmarkA2UISurface,
    MessageProcessor,
    a2learnCatalog,
  };
}
