import componentStyles from "../styles/components/DataTable.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DataTableApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

export class A2learnDataTableElement extends A2uiLitElement<typeof DataTableApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  protected createController() {
    return new A2uiController(this, DataTableApi);
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

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const columns = props.columns || [];
    const rows = props.rows || [];
    const title = props.title ? this.resolveString(props.title) : "";
    const caption = props.caption ? this.resolveString(props.caption) : "";
    const emptyMessage = props.emptyMessage
      ? this.resolveString(props.emptyMessage)
      : "暂无数据";

    return html`
      <section class="table-card">
        ${title ? html`<h2 class="title">${title}</h2>` : nothing}
        ${caption ? html`<p class="caption">${unsafeHTML(sanitizeHtml(caption))}</p>` : nothing}
        <div class="table-scroll" tabindex="0" aria-label=${title || "数据表格"}>
          ${rows.length > 0
            ? html`
                <table>
                  <thead>
                    <tr>
                      ${columns.map((column: any) => html`
                        <th scope="col" style=${`text-align: ${column.align || "left"}`}>
                          ${unsafeHTML(sanitizeHtml(this.resolveString(column.label), { inline: true }))}
                        </th>
                      `)}
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row: any, rowIndex: number) => html`
                      <tr>
                        ${columns.map((column: any) => {
                          const value = row.cells?.[column.key];
                          return html`
                            <td style=${`text-align: ${column.align || "left"}`}>
                              ${unsafeHTML(sanitizeHtml(this.resolveString(value), { inline: true }))}
                            </td>
                          `;
                        })}
                      </tr>
                    `)}
                  </tbody>
                </table>
              `
            : html`<p class="empty-message">${emptyMessage}</p>`}
        </div>
      </section>
    `;
  }
}

if (!customElements.get("a2learn-data-table")) {
  customElements.define("a2learn-data-table", A2learnDataTableElement);
}

export const A2learnDataTable = {
  ...DataTableApi,
  tagName: "a2learn-data-table",
};
