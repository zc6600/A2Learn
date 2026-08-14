import componentStyles from "../styles/components/SocialMoments.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SocialMomentsApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

type UserComment = {
  author: string;
  content: string;
  role?: string;
  isUser?: boolean;
};

/** A WeChat-Moments-like reading surface for poems, people, and historical scenes with authentic interactions. */
export class A2learnSocialMomentsElement extends A2uiLitElement<typeof SocialMomentsApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  @state() private userLikes = new Set<string>();
  @state() private activeActionMenu: string | null = null;
  @state() private activeCommentPostId: string | null = null;
  @state() private commentDrafts = new Map<string, string>();
  @state() private userComments = new Map<string, UserComment[]>();

  protected createController() {
    return new A2uiController(this, SocialMomentsApi);
  }

  private handleDocumentClick = (event: MouseEvent) => {
    const target = event.composedPath()[0] as HTMLElement | undefined;
    if (this.activeActionMenu && (!target || !target.closest?.(".action-wrapper"))) {
      this.activeActionMenu = null;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private isImageUrl(value: string): boolean {
    return /^(https?:\/\/|\/|data:image\/)/i.test(value);
  }

  private openImage(url: string): void {
    const dialog = this.renderRoot.querySelector("dialog") as HTMLDialogElement | null;
    const image = dialog?.querySelector("img");
    if (!dialog || !image) return;
    image.src = url;
    if (!dialog.open) dialog.showModal();
  }

  private toggleActionMenu(postId: string, event: Event): void {
    event.stopPropagation();
    this.activeActionMenu = this.activeActionMenu === postId ? null : postId;
  }

  private toggleLike(postId: string, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.userLikes);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
    }
    this.userLikes = next;
    this.activeActionMenu = null;
  }

  private openCommentForm(postId: string, event: Event): void {
    event.stopPropagation();
    this.activeCommentPostId = postId;
    this.activeActionMenu = null;
    setTimeout(() => {
      const input = this.renderRoot.querySelector<HTMLInputElement>(`input[data-comment-post="${postId}"]`);
      input?.focus();
    }, 50);
  }

  private handleCommentInput(postId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const next = new Map(this.commentDrafts);
    next.set(postId, value);
    this.commentDrafts = next;
  }

  private cancelComment(postId: string, event: Event): void {
    event.stopPropagation();
    this.activeCommentPostId = null;
  }

  private submitComment(postId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const draft = (this.commentDrafts.get(postId) || "").trim();
    if (!draft) return;

    const existing = this.userComments.get(postId) || [];
    const updated = [
      ...existing,
      {
        author: uiText("你（现代知己）", "You (modern companion)"),
        content: draft,
        role: uiText("读者留言", "Reader comment"),
        isUser: true,
      },
    ];
    const nextComments = new Map(this.userComments);
    nextComments.set(postId, updated);
    this.userComments = nextComments;

    const nextDrafts = new Map(this.commentDrafts);
    nextDrafts.delete(postId);
    this.commentDrafts = nextDrafts;
    this.activeCommentPostId = null;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props || !Array.isArray(props.posts)) return nothing;
    const title = props.title ? this.resolveString(props.title) : uiText("朋友圈 · 阅读现场", "Moments · Reading Scene");

    return html`
      <section class="moments" aria-label=${title}>
        <header class="title">
          <span>📜</span>
          <span>${title}</span>
        </header>
        ${props.posts.map((post: any) => {
          const postId = String(post.id || "post-0");
          const avatar = post.avatar ? this.resolveString(post.avatar) : "📖";
          const urls = Array.isArray(post.imageUrls)
            ? post.imageUrls.map((url: unknown) => this.resolveString(url)).filter((url: string) => this.isImageUrl(url)).slice(0, 4)
            : [];

          const rawLikes = Array.isArray(post.likes) ? post.likes.map((name: unknown) => this.resolveString(name)).filter(Boolean) : [];
          const isLiked = this.userLikes.has(postId);
          const allLikes = isLiked
            ? [...rawLikes, uiText("你（已点赞）", "You (liked)")]
            : rawLikes;

          const rawComments = Array.isArray(post.comments) ? post.comments : [];
          const localComments = this.userComments.get(postId) || [];
          const isMenuOpen = this.activeActionMenu === postId;
          const isCommenting = this.activeCommentPostId === postId;
          const currentDraft = this.commentDrafts.get(postId) || "";

          let imageGridClass = "";
          if (urls.length === 1) imageGridClass = "one";
          else if (urls.length === 2) imageGridClass = "two";
          else if (urls.length === 4) imageGridClass = "four";

          return html`
            <article class="post">
              <div class="avatar">${this.isImageUrl(avatar) ? html`<img src=${avatar} alt="" loading="lazy" />` : avatar}</div>
              <div>
                <div class="author-line">
                  <span class="author">${this.resolveString(post.author)}</span>
                </div>
                <div class="content a2learn-markdown-body">${unsafeHTML(sanitizeHtml(this.resolveString(post.content)))}</div>
                ${urls.length ? html`
                  <div class="images ${imageGridClass}">
                    ${urls.map((url: string) => html`
                      <button class="image" type="button" aria-label=${uiText("查看大图", "View image")} @click=${() => this.openImage(url)}>
                        <img src=${url} alt=${post.imageAlt ? this.resolveString(post.imageAlt) : ""} loading="lazy" />
                      </button>
                    `)}
                  </div>` : nothing}

                <div class="meta-bar">
                  <div class="meta-info">
                    ${post.time ? html`<span>${this.resolveString(post.time)}</span>` : nothing}
                    ${post.location ? html`<span class="location">📍 ${this.resolveString(post.location)}</span>` : nothing}
                  </div>

                  <div class="action-wrapper">
                    ${isMenuOpen ? html`
                      <div class="action-popup" role="menu">
                        <button class="action-item" type="button" @click=${(e: Event) => this.toggleLike(postId, e)}>
                          <span>${isLiked ? "💔" : "❤️"}</span>
                          <span>${isLiked ? uiText("取消点赞", "Unlike") : uiText("赞", "Like")}</span>
                        </button>
                        <div class="action-divider"></div>
                        <button class="action-item" type="button" @click=${(e: Event) => this.openCommentForm(postId, e)}>
                          <span>💬</span>
                          <span>${uiText("评论", "Comment")}</span>
                        </button>
                      </div>
                    ` : nothing}
                    <button
                      class="action-trigger ${isMenuOpen ? "active" : ""}"
                      type="button"
                      aria-label=${uiText("操作菜单", "Actions")}
                      @click=${(e: Event) => this.toggleActionMenu(postId, e)}
                    >••</button>
                  </div>
                </div>

                ${isCommenting ? html`
                  <form class="comment-form" @submit=${(e: Event) => this.submitComment(postId, e)}>
                    <input
                      class="comment-input"
                      type="text"
                      data-comment-post=${postId}
                      placeholder=${uiText("跨越千年，给作者留一条评论...", "Leave a comment for the author...")}
                      .value=${currentDraft}
                      @input=${(e: Event) => this.handleCommentInput(postId, e)}
                    />
                    <button class="comment-send-btn" type="submit">${uiText("发送", "Send")}</button>
                    <button class="comment-cancel-btn" type="button" @click=${(e: Event) => this.cancelComment(postId, e)}>${uiText("取消", "Cancel")}</button>
                  </form>
                ` : nothing}

                ${allLikes.length || rawComments.length || localComments.length ? html`
                  <div class="engagement">
                    ${allLikes.length ? html`
                      <div class="likes-row ${isLiked ? "user-liked" : ""}">
                        <span class="heart-icon">♥</span>
                        <span>${allLikes.join("、")}</span>
                      </div>
                    ` : nothing}

                    ${rawComments.length || localComments.length ? html`
                      <div class="comments-list">
                        ${rawComments.map((comment: any) => html`
                          <div class="comment">
                            ${comment.role ? html`<span class="comment-role">${this.resolveString(comment.role)}</span>` : nothing}
                            <span class="comment-author">${this.resolveString(comment.author)}：</span>
                            <span>${unsafeHTML(sanitizeHtml(this.resolveString(comment.content), { inline: true }))}</span>
                          </div>
                        `)}
                        ${localComments.map((comment: UserComment) => html`
                          <div class="comment user-comment">
                            ${comment.role ? html`<span class="comment-role">${comment.role}</span>` : nothing}
                            <span class="comment-author">${comment.author}：</span>
                            <span>${unsafeHTML(sanitizeHtml(comment.content, { inline: true }))}</span>
                          </div>
                        `)}
                      </div>
                    ` : nothing}
                  </div>
                ` : nothing}
              </div>
            </article>`;
        })}
      </section>
      <dialog @click=${(event: Event) => { if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close(); }}>
        <img alt="" />
      </dialog>
    `;
  }
}

if (!customElements.get("a2learn-social-moments")) {
  customElements.define("a2learn-social-moments", A2learnSocialMomentsElement as any);
}

export const A2learnSocialMoments = { ...SocialMomentsApi, tagName: "a2learn-social-moments" };
