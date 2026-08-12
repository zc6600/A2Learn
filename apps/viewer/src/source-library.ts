import type { Lang } from "./generation-profile";
import { SOURCE_LIBRARY_COPY } from "./viewer-copy";

type KnowledgeSource = {
  sourceId: string;
  title: string;
  filename: string;
  sizeBytes: number;
  extractionMode: string;
  extractionStatus: "ready" | "needs_ocr" | "needs_parser" | "failed" | string;
  pageCount: number | null;
  chunkCount: number;
  error: string | null;
};

type SourceLibraryOptions = {
  getApiBaseUrl: () => string;
  getApiKey: () => string;
  getLanguage: () => Lang;
  onGenerate: (sourceIds: string[], resourceQuery: string) => void;
};

export type SourceLibraryController = {
  open: () => void;
  onLanguageChanged: () => void;
};

function getText(options: SourceLibraryOptions) {
  return SOURCE_LIBRARY_COPY[options.getLanguage()];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function requestHeaders(apiKey: string): HeadersInit {
  return apiKey ? { "X-OpenRouter-API-Key": apiKey } : {};
}

function statusLabel(source: KnowledgeSource, options: SourceLibraryOptions): string {
  const copy = getText(options);
  if (source.extractionStatus === "ready") return copy.ready;
  if (source.extractionStatus === "needs_ocr") return copy.needsOcr;
  if (source.extractionStatus === "needs_parser") return copy.needsParser;
  return copy.failed;
}

function injectSourceLibraryTheme(): void {}

export function mountSourceLibrary(options: SourceLibraryOptions): SourceLibraryController {
  const existing = document.getElementById("a2learn-source-library");
  if (existing) return { open: () => undefined, onLanguageChanged: () => undefined };
  injectSourceLibraryTheme();

  const root = document.createElement("aside");
  root.id = "a2learn-source-library";
  root.setAttribute("aria-live", "polite");
  const panel = document.createElement("section");
  panel.className = "a2learn-library-panel";
  const header = document.createElement("header");
  header.className = "a2learn-library-head";
  const title = document.createElement("h2");
  title.className = "a2learn-library-title";
  const close = document.createElement("button");
  close.className = "a2learn-library-close";
  close.type = "button";
  header.append(title, close);

  const actions = document.createElement("div");
  actions.className = "a2learn-library-actions";
  const upload = document.createElement("label");
  upload.className = "a2learn-library-button primary";
  const fileInput = document.createElement("input");
  fileInput.className = "a2learn-library-file-input";
  fileInput.type = "file";
  fileInput.accept = ".pdf,.epub,.docx,.md,.markdown,.txt,.html,.htm,.json,.yaml,.yml,.csv,.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp";
  const refresh = document.createElement("button");
  refresh.className = "a2learn-library-button";
  refresh.type = "button";
  upload.append(fileInput);
  actions.append(upload, refresh);

  const hint = document.createElement("p");
  hint.className = "a2learn-library-hint";
  const message = document.createElement("p");
  message.className = "a2learn-library-message";
  const sourcesElement = document.createElement("div");
  sourcesElement.className = "a2learn-library-sources";
  const goal = document.createElement("textarea");
  goal.className = "a2learn-library-goal";
  goal.maxLength = 1_000;
  const footer = document.createElement("footer");
  footer.className = "a2learn-library-footer";
  const selected = document.createElement("span");
  selected.className = "a2learn-library-message";
  const generate = document.createElement("button");
  generate.className = "a2learn-library-button primary";
  generate.type = "button";
  footer.append(selected, generate);
  panel.append(header, actions, hint, message, sourcesElement, goal, footer);
  root.append(panel);
  document.body.appendChild(root);

  let sources: KnowledgeSource[] = [];
  const chosen = new Set<string>();
  let isLoading = false;

  const setMessage = (value: string) => {
    message.textContent = value;
  };

  const apiBaseUrl = () => options.getApiBaseUrl().replace(/\/+$/, "");

  const updateLabels = () => {
    const copy = getText(options);
    title.textContent = copy.title;
    close.textContent = "×";
    close.setAttribute("aria-label", copy.close);
    upload.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    });
    upload.append(document.createTextNode(copy.upload));
    refresh.textContent = copy.refresh;
    hint.textContent = copy.unsupportedHint;
    goal.placeholder = copy.goal;
    generate.textContent = copy.generate;
    renderSources();
  };

  const renderSources = () => {
    const copy = getText(options);
    sourcesElement.replaceChildren();
    const readyIds = new Set(sources.filter((source) => source.extractionStatus === "ready").map((source) => source.sourceId));
    for (const sourceId of [...chosen]) {
      if (!readyIds.has(sourceId)) chosen.delete(sourceId);
    }
    if (sources.length === 0 && !isLoading) {
      const empty = document.createElement("p");
      empty.className = "a2learn-library-message";
      empty.textContent = copy.empty;
      sourcesElement.append(empty);
    }
    for (const source of sources) {
      const row = document.createElement("label");
      row.className = "a2learn-library-source";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = source.extractionStatus !== "ready";
      checkbox.checked = chosen.has(source.sourceId);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) chosen.add(source.sourceId);
        else chosen.delete(source.sourceId);
        renderSources();
      });
      const detail = document.createElement("div");
      const name = document.createElement("div");
      name.className = "a2learn-library-source-name";
      name.title = source.title;
      name.textContent = source.title;
      const meta = document.createElement("div");
      meta.className = "a2learn-library-source-meta";
      const facts = [formatBytes(source.sizeBytes), source.filename];
      if (source.pageCount) facts.push(`${source.pageCount} p`);
      if (source.chunkCount) facts.push(`${source.chunkCount} chunks`);
      const sourceFacts = document.createElement("span");
      sourceFacts.textContent = facts.join(" · ");
      const status = document.createElement("span");
      status.className = `a2learn-library-status ${source.extractionStatus === "ready" ? "ready" : source.extractionStatus === "failed" ? "failed" : "pending"}`;
      status.textContent = statusLabel(source, options);
      status.title = source.error || "";
      meta.append(sourceFacts, status);
      detail.append(name, meta);
      row.append(checkbox, detail);
      sourcesElement.append(row);
    }
    selected.textContent = copy.selected.replace("{count}", String(chosen.size));
    generate.disabled = chosen.size === 0;
  };

  const loadSources = async () => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      setMessage(getText(options).noBackend);
      return;
    }
    isLoading = true;
    refresh.disabled = true;
    setMessage(getText(options).loading);
    try {
      const response = await fetch(`${baseUrl}/api/knowledge/sources`, { headers: requestHeaders(options.getApiKey()) });
      if (!response.ok) throw new Error(String(response.status));
      const payload = await response.json() as { sources?: KnowledgeSource[] };
      sources = Array.isArray(payload.sources) ? payload.sources : [];
      setMessage("");
    } catch (error) {
      setMessage(`${getText(options).loadFailed} (${String(error)})`);
    } finally {
      isLoading = false;
      refresh.disabled = false;
      renderSources();
    }
  };

  const open = () => {
    panel.classList.add("open");
    void loadSources();
  };
  close.addEventListener("click", () => panel.classList.remove("open"));
  refresh.addEventListener("click", () => void loadSources());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      setMessage(getText(options).noBackend);
      return;
    }
    fileInput.disabled = true;
    setMessage(getText(options).uploading);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const response = await fetch(`${baseUrl}/api/knowledge/sources`, {
        method: "POST",
        headers: requestHeaders(options.getApiKey()),
        body,
      });
      if (!response.ok) throw new Error(String(response.status));
      await loadSources();
    } catch (error) {
      setMessage(`${getText(options).uploadFailed} (${String(error)})`);
    } finally {
      fileInput.value = "";
      fileInput.disabled = false;
    }
  });
  generate.addEventListener("click", () => {
    if (chosen.size === 0) {
      setMessage(getText(options).selectReady);
      return;
    }
    if (!options.getApiKey()) {
      setMessage(getText(options).noApiKey);
      return;
    }
    panel.classList.remove("open");
    options.onGenerate([...chosen], goal.value.trim());
  });

  updateLabels();
  return { open, onLanguageChanged: updateLabels };
}
