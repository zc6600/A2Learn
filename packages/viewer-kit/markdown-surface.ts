import { LitElement, html, nothing } from "lit";
import { ContextProvider } from "@lit/context";
import { Context } from "@a2ui/lit/v0_9";
import { sanitizeHtml } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";

const catalogMarkdownRenderer = async (value: string) => sanitizeHtml(value);

/**
 * 包装器组件，用于为 A2UI Surface 注入完整的 Markdown/KaTeX 渲染上下文。
 */
export class A2learnMarkdownSurface extends LitElement {
  static properties = {
    surface: { attribute: false },
  };

  surface: unknown = undefined;

  private markdownProvider = new ContextProvider(this, {
    context: Context.markdown,
    initialValue: catalogMarkdownRenderer,
  });

  protected createRenderRoot(): this {
    return this;
  }

  render() {
    const _keepProvider = this.markdownProvider;
    void _keepProvider;
    if (!this.surface) {
      return nothing;
    }
    return html`<a2ui-surface .surface=${this.surface}></a2ui-surface>`;
  }
}

if (!customElements.get("a2learn-markdown-surface")) {
  customElements.define("a2learn-markdown-surface", A2learnMarkdownSurface);
}
