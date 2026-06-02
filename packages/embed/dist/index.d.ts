type ViewerSourceOffline = {
    mode: "offline";
    messagesUrl: string;
    themeVars?: Record<string, string>;
};
type ViewerSourceOnline = {
    mode: "online";
    apiBaseUrl: string;
    resourcePath?: string;
    resourceText?: string;
    headers?: Record<string, string>;
    themeVars?: Record<string, string>;
};
type ViewerSource = ViewerSourceOffline | ViewerSourceOnline;
type EmbedEvent = {
    type: "ready";
} | {
    type: "resize";
    height: number;
} | {
    type: "error";
    error: unknown;
};
type CreateEmbedOptions = {
    container: HTMLElement;
    viewerUrl: string;
    source: ViewerSource;
    iframeClassName?: string;
    iframeStyle?: Partial<CSSStyleDeclaration>;
    onEvent?: (event: EmbedEvent) => void;
};
declare function createA2LearnEmbed(opts: CreateEmbedOptions): {
    iframe: HTMLIFrameElement;
    destroy: () => void;
    reload: () => void;
};
declare class A2LearnEmbedElement extends HTMLElement {
    static get observedAttributes(): string[];
    private controller;
    private rootEl;
    headers?: Record<string, string>;
    themeVars?: Record<string, string>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private mount;
}
declare global {
    interface HTMLElementTagNameMap {
        "a2learn-embed": A2LearnEmbedElement;
    }
}

export { A2LearnEmbedElement, type CreateEmbedOptions, type EmbedEvent, type ViewerSource, type ViewerSourceOffline, type ViewerSourceOnline, createA2LearnEmbed };
