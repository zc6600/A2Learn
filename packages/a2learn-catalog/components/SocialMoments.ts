import componentStyles from "../styles/components/SocialMoments.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SocialMomentsApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

/** A WeChat-Moments-like reading surface for poems, people, and historical scenes. */
export class A2learnSocialMomentsElement extends A2uiLitElement<typeof SocialMomentsApi> {
  static styles = unsafeCSS(componentStyles);

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
