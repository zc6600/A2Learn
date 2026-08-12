import componentStyles from "../styles/components/KnowledgeTree.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { KnowledgeTreeApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnKnowledgeTreeElement extends A2uiLitElement<typeof KnowledgeTreeApi> {
  static styles = unsafeCSS(componentStyles);

  protected createController() {
    return new A2uiController(this, KnowledgeTreeApi);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (
      value &&
      typeof value === "object" &&
      "literalString" in (value as Record<string, unknown>)
    ) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private handleNavigate(nodeId: string) {
    const props = (this as any).controller?.props;
    if (props?.onNodeNavigate) {
      (this as any).context.dispatchAction({
        ...(props.onNodeNavigate as Record<string, unknown>),
        context: { nodeId },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "";
    const path = props.path || [];
    const currentNode = props.currentNode;
    const childrenNodes = props.childrenNodes || [];

    return html`
      <div class="explorer-container">
        ${title ? html`<h3 class="explorer-title">${title}</h3>` : nothing}
        
        <!-- 面包屑导航 -->
        ${path.length > 0 || currentNode ? html`
          <div class="breadcrumb">
            <span class="crumb-item" @click=${() => this.handleNavigate("root")}>🏠 ${uiText("根目录", "Root")}</span>
            ${path.map((p: any) => html`
              <span class="crumb-separator">/</span>
              <span class="crumb-item" @click=${() => this.handleNavigate(p.id)}>
                ${this.resolveString(p.label)}
              </span>
            `)}
            ${currentNode ? html`
              <span class="crumb-separator">/</span>
              <span class="crumb-current">${this.resolveString(currentNode.label)}</span>
            ` : nothing}
          </div>
        ` : nothing}

        <!-- 当前聚焦节点信息 -->
        ${currentNode ? html`
          <div class="current-node-card">
            <h4 class="node-title">${this.resolveString(currentNode.label)}</h4>
            ${currentNode.description ? html`
              <p class="node-desc">${unsafeHTML(sanitizeHtml(this.resolveString(currentNode.description)))}</p>
            ` : nothing}
          </div>
        ` : nothing}

        <!-- 子节点网格导航（仅在作者提供了可导航的兄弟/子主题时渲染；
             不提供 childrenNodes 就代表这里只是"你在知识地图中的位置"提示，
             不代表这是叶子节点，所以留空时不再显示误导性的"已到达叶子节点"文案） -->
        ${childrenNodes.length > 0 ? html`
          <div class="children-grid">
            ${childrenNodes.map((child: any) => html`
              <div class="child-card" @click=${() => this.handleNavigate(child.id)}>
                <span class="child-label">${this.resolveString(child.label)}</span>
                ${child.hasChildren !== false ? html`
                  <span class="child-icon">▶</span>
                ` : html`
                  <span class="child-icon">📄</span>
                `}
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-knowledge-tree")) {
  customElements.define("a2learn-knowledge-tree", A2learnKnowledgeTreeElement as any);
}

export const A2learnKnowledgeTree = {
  ...KnowledgeTreeApi,
  tagName: "a2learn-knowledge-tree",
};
