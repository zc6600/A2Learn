import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SocialMomentsApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

/** A WeChat-Moments-like reading surface for poems, people, and historical scenes. */
export class A2learnSocialMomentsElement extends A2uiLitElement<typeof SocialMomentsApi> {
  static styles = css`
    :host { display: block; margin: var(--a2ui-spacing-l) 0; font-family: var(--a2ui-font-family); }
    .moments { overflow: hidden; border: 1px solid var(--a2ui-color-border); border-radius: 12px; background: var(--a2ui-color-surface); }
    .title { padding: 14px 18px; border-bottom: 1px solid var(--a2ui-color-border); color: var(--a2ui-color-on-surface); font: 650 16px/1.3 var(--a2ui-font-family-title, inherit); }
    .post { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; padding: 16px; border-bottom: 1px solid var(--a2ui-color-border); }
    .post:last-child { border-bottom: 0; }
    .avatar { display: grid; width: 42px; height: 42px; overflow: hidden; place-items: center; border-radius: 5px; background: var(--a2ui-color-surface-subtle); color: var(--a2ui-color-on-surface); font-size: 23px; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .author { color: var(--a2ui-color-primary); font-size: 14px; font-weight: 700; line-height: 1.35; }
    .content { margin-top: 4px; color: var(--a2ui-color-on-surface); font-size: 14px; line-height: 1.65; word-break: break-word; }
    .content p { margin: 0 0 7px; }
    .content p:last-child { margin-bottom: 0; }
    .images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; width: min(100%, 340px); margin-top: 9px; }
    .images.one { grid-template-columns: minmax(0, 1fr); width: min(100%, 300px); }
    .image { width: 100%; aspect-ratio: 1; border: 0; padding: 0; overflow: hidden; background: var(--a2ui-color-surface-subtle); cursor: zoom-in; }
    .images.one .image { aspect-ratio: 4 / 3; }
    .image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .meta { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; color: var(--app-muted, #74808e); font-size: 11px; line-height: 1.4; }
    .location { color: var(--a2ui-color-primary); }
    .engagement { display: grid; gap: 5px; margin-top: 9px; padding: 7px 9px; background: var(--a2ui-color-surface-subtle); color: var(--a2ui-color-on-surface); font-size: 12px; line-height: 1.5; }
    .likes { color: var(--a2ui-color-primary); }
    .comment + .comment { padding-top: 5px; border-top: 1px solid color-mix(in oklab, var(--a2ui-color-border) 70%, transparent); }
    .comment-author { color: var(--a2ui-color-primary); font-weight: 650; }
    dialog { max-width: min(92vw, 900px); padding: 0; overflow: hidden; border: 0; background: transparent; }
    dialog::backdrop { background: rgba(0,0,0,.74); }
    dialog img { display: block; max-width: min(92vw, 900px); max-height: 86vh; }
    @media (max-width: 560px) { .post { padding: 13px; } .images { width: 100%; } }
  `;

  protected createController() { return new A2uiController(this, SocialMomentsApi); }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private isImageUrl(value: string): boolean { return /^(https?:\/\/|\/|data:image\/)/i.test(value); }

  private openImage(url: string): void {
    const dialog = this.renderRoot.querySelector("dialog") as HTMLDialogElement | null;
    const image = dialog?.querySelector("img");
    if (!dialog || !image) return;
    image.src = url;
    if (!dialog.open) dialog.showModal();
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props || !Array.isArray(props.posts)) return nothing;
    const title = props.title ? this.resolveString(props.title) : "朋友圈 · 阅读现场";
    return html`
      <section class="moments" aria-label=${title}>
        <header class="title">${title}</header>
        ${props.posts.map((post: any) => {
          const avatar = post.avatar ? this.resolveString(post.avatar) : "📖";
          const urls = Array.isArray(post.imageUrls)
            ? post.imageUrls.map((url: unknown) => this.resolveString(url)).filter((url: string) => this.isImageUrl(url)).slice(0, 4)
            : [];
          const likes = Array.isArray(post.likes) ? post.likes.map((name: unknown) => this.resolveString(name)).filter(Boolean) : [];
          const comments = Array.isArray(post.comments) ? post.comments : [];
          return html`
            <article class="post">
              <div class="avatar">${this.isImageUrl(avatar) ? html`<img src=${avatar} alt="" loading="lazy" />` : avatar}</div>
              <div>
                <div class="author">${this.resolveString(post.author)}</div>
                <div class="content">${unsafeHTML(sanitizeHtml(this.resolveString(post.content)))}</div>
                ${urls.length ? html`<div class="images ${urls.length === 1 ? "one" : ""}">${urls.map((url: string) => html`<button class="image" type="button" @click=${() => this.openImage(url)}><img src=${url} alt=${post.imageAlt ? this.resolveString(post.imageAlt) : ""} loading="lazy" /></button>`)}</div>` : nothing}
                ${post.time || post.location ? html`<div class="meta"><span>${post.time ? this.resolveString(post.time) : ""}</span><span class="location">${post.location ? this.resolveString(post.location) : ""}</span></div>` : nothing}
                ${likes.length || comments.length ? html`<div class="engagement">
                  ${likes.length ? html`<div class="likes">♥ ${likes.join("、")}</div>` : nothing}
                  ${comments.map((comment: any) => html`<div class="comment"><span class="comment-author">${this.resolveString(comment.author)}：</span>${this.resolveString(comment.content)}</div>`)}
                </div>` : nothing}
              </div>
            </article>`;
        })}
      </section>
      <dialog @click=${(event: Event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}><img alt="" /></dialog>
    `;
  }
}

if (!customElements.get("a2learn-social-moments")) {
  customElements.define("a2learn-social-moments", A2learnSocialMomentsElement as any);
}

export const A2learnSocialMoments = { ...SocialMomentsApi, tagName: "a2learn-social-moments" };
