import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/lit/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";
import "@a2learn/viewer-kit/markdown-surface";
import {
  injectBaseTheme,
  renderAppFrame,
  showState,
} from "@a2learn/viewer-kit/page-shell";
import { bootstrapGallery } from "@a2learn/viewer-kit/gallery/gallery-ui";

function setupRoot(): HTMLElement | null {
  const root = document.getElementById("app");
  if (!root) {
    return null;
  }
  root.setAttribute("role", "main");
  injectBaseTheme();
  return root;
}

async function bootstrapViewer() {
  const root = setupRoot();
  if (!root) {
    return;
  }
  renderAppFrame(
    root,
    "A2Learn Viewer",
    "用于预览 Agent 生成的 A2UI Surface，支持实时加载与基础错误提示。",
    `<section id="surface-container" aria-live="polite">
      <p class="viewer-state loading">A2UI 消息文件加载中，请稍候...</p>
    </section>`,
  );

  const container = document.getElementById("surface-container");
  if (!container) {
    return;
  }

  const res = await fetch(`/generated/site_messages.json?ts=${Date.now()}`);
  if (!res.ok) {
    showState(container, "无法加载 A2UI 消息，请先运行 Agent 生成 messages。", "error");
    return;
  }
  const messages = await res.json();

  const processor = new MessageProcessor([basicCatalog, a2learnCatalog]);
  try {
    processor.processMessages(messages);
  } catch (err) {
    showState(container, `A2UI 消息处理失败：${String(err)}`, "error");
    return;
  }

  const surfaces = Array.from(processor.model.surfacesMap.values());
  if (surfaces.length === 0) {
    showState(container, "未生成可渲染的 surface。");
    return;
  }

  container.innerHTML = "";
  for (const surface of surfaces) {
    const el = document.createElement("a2learn-markdown-surface") as any;
    el.surface = surface;
    container.appendChild(el);
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
