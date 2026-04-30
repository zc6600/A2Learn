import { LitElement, html, nothing } from "lit";
import { ContextProvider } from "@lit/context";
import { Context } from "@a2ui/lit/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import "@a2ui/lit/v0_9";

/**
 * 一个简单的包装器，用于为 A2UI Surface 提供 Markdown 渲染上下文。
 */
export class A2learnMarkdownSurface extends LitElement {
  static properties = {
    surface: { attribute: false },
  };

  surface: unknown = undefined;

  private markdownProvider = new ContextProvider(this, {
    context: Context.markdown,
    initialValue: renderMarkdown,
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
