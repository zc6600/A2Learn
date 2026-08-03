type Language = "zh" | "en";

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
  getLanguage: () => Language;
  onGenerate: (sourceIds: string[], resourceQuery: string) => void;
};

export type SourceLibraryController = {
  open: () => void;
  onLanguageChanged: () => void;
};

const COPY = {
  zh: {
    title: "资料库",
    close: "关闭",
    upload: "上传资料",
    refresh: "刷新",
    empty: "还没有资料。上传书籍、讲义或笔记开始学习。",
    goal: "学习目标（可选，例如：用初学者能理解的方式讲解第 3 章）",
    generate: "用所选资料生成课程",
    selectReady: "请选择至少一份已解析资料。",
    uploading: "正在上传并解析…",
    loading: "正在加载资料…",
    ready: "可用于生成",
    needsOcr: "等待 OCR",
    needsParser: "等待解析器",
    failed: "解析失败",
    selected: "已选 {count} 份资料",
    noBackend: "未配置资料库 API 服务。",
    noApiKey: "请先在 API Key 设置中配置密钥，再生成课程。",
    uploadFailed: "上传失败",
    loadFailed: "无法加载资料库",
    unsupportedHint: "支持 PDF、EPUB、DOCX、Markdown、文本、网页、表格和图片；扫描件会进入 OCR 队列。",
  },
  en: {
    title: "Source library",
    close: "Close",
    upload: "Upload source",
    refresh: "Refresh",
    empty: "No sources yet. Upload a book, handout, or notes to begin.",
    goal: "Learning goal (optional, e.g. explain chapter 3 for beginners)",
    generate: "Generate from selected sources",
    selectReady: "Select at least one parsed source.",
    uploading: "Uploading and extracting…",
    loading: "Loading sources…",
    ready: "Ready for generation",
    needsOcr: "Waiting for OCR",
    needsParser: "Waiting for parser",
    failed: "Extraction failed",
    selected: "{count} source(s) selected",
    noBackend: "The source-library API is not configured.",
    noApiKey: "Configure an API key in Settings before generating a course.",
    uploadFailed: "Upload failed",
    loadFailed: "Could not load the source library",
    unsupportedHint: "PDF, EPUB, DOCX, Markdown, text, web, tabular, and image files are supported; scans enter the OCR queue.",
  },
} as const;

function getText(options: SourceLibraryOptions) {
  return COPY[options.getLanguage()];
}

function formatBytes(bytes: number, language: Language): string {
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

function injectSourceLibraryTheme(): void {
  if (document.getElementById("a2learn-source-library-theme")) return;
  const style = document.createElement("style");
  style.id = "a2learn-source-library-theme";
  style.textContent = `
    .a2learn-library-panel { position: fixed; z-index: 30; top: 148px; right: max(20px, calc((100vw - 1200px) / 2)); display: none; width: min(390px, calc(100vw - 28px)); max-height: min(620px, calc(100vh - 168px)); overflow: auto; box-sizing: border-box; padding: 16px; border: 1px solid var(--a2ui-color-border, #dbe3ee); border-radius: var(--a2learn-shell-radius, 16px); background: var(--a2ui-color-surface, #fff); box-shadow: 0 20px 56px rgba(15, 23, 42, .2); color: var(--a2ui-color-on-surface, #111827); }
    .a2learn-library-panel.open { display: grid; gap: 12px; }
    .a2learn-library-head, .a2learn-library-actions, .a2learn-library-source-head, .a2learn-library-source-meta { display: flex; align-items: center; gap: 8px; }
    .a2learn-library-head { justify-content: space-between; }
    .a2learn-library-title { margin: 0; font: 750 17px/1.2 var(--a2ui-font-family-title, sans-serif); }
    .a2learn-library-close, .a2learn-library-button { border: 1px solid var(--a2ui-color-border, #dbe3ee); border-radius: var(--a2learn-control-radius, 9px); padding: 7px 9px; background: var(--a2ui-color-surface-subtle, #f8fafc); color: inherit; cursor: pointer; font: 600 12px/1.2 inherit; }
    .a2learn-library-button.primary { border-color: var(--a2ui-color-primary, #0d9488); background: var(--a2ui-color-primary, #0d9488); color: #fff; }
    .a2learn-library-button:disabled { cursor: not-allowed; opacity: .5; }
    .a2learn-library-hint, .a2learn-library-message, .a2learn-library-source-meta { color: var(--app-muted, #64748b); font-size: 12px; line-height: 1.45; }
    .a2learn-library-hint, .a2learn-library-message { margin: 0; }
    .a2learn-library-file-input { display: none; }
    .a2learn-library-sources { display: grid; gap: 8px; max-height: 270px; overflow: auto; }
    .a2learn-library-source { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; padding: 10px; border: 1px solid var(--a2ui-color-border, #dbe3ee); border-radius: var(--a2learn-control-radius, 9px); }
    .a2learn-library-source input { margin-top: 3px; accent-color: var(--a2ui-color-primary, #0d9488); }
    .a2learn-library-source-name { overflow: hidden; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .a2learn-library-source-meta { flex-wrap: wrap; margin-top: 4px; }
    .a2learn-library-status { padding: 2px 6px; border-radius: var(--a2learn-pill-radius, 999px); background: var(--a2ui-color-surface-subtle, #f1f5f9); font-size: 11px; }
    .a2learn-library-status.ready { background: #dcfce7; color: #166534; }
    .a2learn-library-status.pending { background: #fef3c7; color: #92400e; }
    .a2learn-library-status.failed { background: #fee2e2; color: #b91c1c; }
    .a2learn-library-goal { width: 100%; min-height: 64px; box-sizing: border-box; resize: vertical; border: 1px solid var(--a2ui-color-border, #dbe3ee); border-radius: var(--a2learn-control-radius, 9px); padding: 9px; background: var(--a2ui-color-surface, #fff); color: inherit; font: inherit; font-size: 13px; }
    .a2learn-library-footer { display: grid; gap: 8px; }
    @media (max-width: 640px) { .a2learn-library-panel { top: 118px; right: 12px; } }
  `;
  document.head.appendChild(style);
}

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
      const facts = [formatBytes(source.sizeBytes, options.getLanguage()), source.filename];
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
