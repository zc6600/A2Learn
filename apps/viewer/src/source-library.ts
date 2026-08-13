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
  onCreateBookCourse: (sourceIds: string[], lessonCount: number) => void;
  onCreateManualCourse: (sourceId: string, title: string, lessons: Array<{ title: string; pageStart: number; pageEnd: number }>) => void;
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
  const courseActions = document.createElement("div");
  courseActions.className = "a2learn-library-course-actions";
  const lessonCountLabel = document.createElement("label");
  lessonCountLabel.className = "a2learn-library-field-label";
  const lessonCount = document.createElement("input");
  lessonCount.type = "number";
  lessonCount.min = "1";
  lessonCount.max = "100";
  lessonCount.value = "10";
  lessonCount.className = "a2learn-library-lesson-count";
  lessonCountLabel.htmlFor = "a2learn-library-lesson-count";
  lessonCount.id = lessonCountLabel.htmlFor;
  const createCourse = document.createElement("button");
  createCourse.className = "a2learn-library-button";
  createCourse.type = "button";
  courseActions.append(lessonCountLabel, lessonCount, createCourse);
  const manualStart = document.createElement("button");
  manualStart.className = "a2learn-library-button";
  manualStart.type = "button";
  const manual = document.createElement("section");
  manual.className = "a2learn-library-manual-course";
  manual.hidden = true;
  const manualHead = document.createElement("header");
  manualHead.className = "a2learn-library-manual-head";
  const manualHeading = document.createElement("div");
  manualHeading.className = "a2learn-library-manual-heading";
  const manualSource = document.createElement("p");
  manualSource.className = "a2learn-library-manual-source";
  const manualBack = document.createElement("button");
  manualBack.className = "a2learn-library-button";
  manualBack.type = "button";
  manualHead.append(manualHeading, manualSource, manualBack);
  const manualReader = document.createElement("iframe");
  manualReader.className = "a2learn-library-pdf-reader";
  manualReader.title = "PDF reader";
  const manualForm = document.createElement("div");
  manualForm.className = "a2learn-library-manual-form";
  const manualTitle = document.createElement("input");
  manualTitle.className = "a2learn-library-lesson-count";
  const lessonTitle = document.createElement("input");
  lessonTitle.className = "a2learn-library-lesson-count";
  const pageStart = document.createElement("input");
  pageStart.type = "number";
  pageStart.min = "1";
  pageStart.value = "1";
  pageStart.className = "a2learn-library-lesson-count";
  const pageEnd = document.createElement("input");
  pageEnd.type = "number";
  pageEnd.min = "1";
  pageEnd.value = "1";
  pageEnd.className = "a2learn-library-lesson-count";
  const addLesson = document.createElement("button");
  addLesson.className = "a2learn-library-button";
  addLesson.type = "button";
  const manualLessons = document.createElement("div");
  manualLessons.className = "a2learn-library-manual-lessons";
  const generateManual = document.createElement("button");
  generateManual.className = "a2learn-library-button primary";
  generateManual.type = "button";
  manualForm.append(manualTitle, lessonTitle, pageStart, pageEnd, addLesson, manualLessons, generateManual);
  manual.append(manualHead, manualReader, manualForm);
  footer.append(selected, generate, courseActions, manualStart, manual);
  panel.append(header, actions, hint, message, sourcesElement, goal, footer);
  root.append(panel);
  document.body.appendChild(root);

  let sources: KnowledgeSource[] = [];
  const chosen = new Set<string>();
  let readerLessons: Array<{ title: string; pageStart: number; pageEnd: number }> = [];
  let manualOpen = false;
  let isLoading = false;
  let hasLoadError = false;

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
    lessonCount.setAttribute("aria-label", options.getLanguage() === "zh" ? "课程课时数" : "Number of lessons");
    lessonCountLabel.textContent = options.getLanguage() === "zh" ? "课程课时数" : "Lessons";
    createCourse.textContent = options.getLanguage() === "zh" ? "生成整本书课程" : "Plan book course";
    manualStart.textContent = options.getLanguage() === "zh" ? "按 PDF 页手动拆分课程" : "Split a PDF into lessons";
    manualHeading.textContent = options.getLanguage() === "zh" ? "按 PDF 页手动拆分" : "Split the PDF into lessons";
    manualBack.textContent = options.getLanguage() === "zh" ? "返回资料库" : "Back to library";
    manualTitle.placeholder = options.getLanguage() === "zh" ? "课程名称（手动拆分）" : "Course title (manual split)";
    lessonTitle.placeholder = options.getLanguage() === "zh" ? "课时名称" : "Lesson title";
    pageStart.setAttribute("aria-label", options.getLanguage() === "zh" ? "起始 PDF 页" : "Start PDF page");
    pageEnd.setAttribute("aria-label", options.getLanguage() === "zh" ? "结束 PDF 页" : "End PDF page");
    addLesson.textContent = options.getLanguage() === "zh" ? "添加页码范围" : "Add page range";
    generateManual.textContent = options.getLanguage() === "zh" ? "按所选内容批量生成" : "Generate selected lessons";
    renderSources();
  };

  const renderSources = () => {
    const copy = getText(options);
    sourcesElement.replaceChildren();
    const readyIds = new Set(sources.filter((source) => source.extractionStatus === "ready").map((source) => source.sourceId));
    for (const sourceId of [...chosen]) {
      if (!readyIds.has(sourceId)) chosen.delete(sourceId);
    }
    if (sources.length === 0 && !isLoading && !hasLoadError) {
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
    createCourse.disabled = chosen.size === 0;
    const selectedPdf = sources.find((source) => chosen.has(source.sourceId) && source.filename.toLowerCase().endsWith(".pdf"));
    const canOpenManual = chosen.size === 1 && Boolean(selectedPdf);
    manualStart.disabled = !canOpenManual;
    if (manualOpen && !selectedPdf) manualOpen = false;
    panel.classList.toggle("manual-open", manualOpen);
    manual.hidden = !manualOpen;
    if (manualOpen && selectedPdf) {
      manualSource.textContent = `${selectedPdf.title} · ${selectedPdf.pageCount || "?"} PDF ${options.getLanguage() === "zh" ? "页" : "pages"}`;
      const sourceUrl = `${apiBaseUrl()}/api/knowledge/sources/${encodeURIComponent(selectedPdf.sourceId)}/original`;
      if (manualReader.src !== sourceUrl) manualReader.src = sourceUrl;
      pageEnd.max = String(selectedPdf.pageCount || "");
      pageStart.max = String(selectedPdf.pageCount || "");
    } else {
      manualReader.removeAttribute("src");
    }
    generateManual.disabled = chosen.size !== 1 || readerLessons.length === 0 || !manualTitle.value.trim();
    manualLessons.replaceChildren(...readerLessons.map((lesson, index) => {
      const item = document.createElement("div");
      item.className = "a2learn-library-manual-lesson";
      const label = document.createElement("span");
      label.textContent = `${lesson.title} · PDF p.${lesson.pageStart}–${lesson.pageEnd}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        readerLessons = readerLessons.filter((_, current) => current !== index);
        renderSources();
      });
      item.append(label, remove);
      return item;
    }));
  };

  const loadSources = async () => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      hasLoadError = true;
      setMessage(getText(options).noBackend);
      renderSources();
      return;
    }
    isLoading = true;
    hasLoadError = false;
    refresh.disabled = true;
    setMessage(getText(options).loading);
    try {
      const response = await fetch(`${baseUrl}/api/knowledge/sources`, { headers: requestHeaders(options.getApiKey()) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { sources?: KnowledgeSource[] };
      sources = Array.isArray(payload.sources) ? payload.sources : [];
      hasLoadError = false;
      setMessage("");
    } catch (error) {
      hasLoadError = true;
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage(`${getText(options).loadFailed} (${errorMsg})`);
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
      const payload = await response.json() as { source?: KnowledgeSource };
      if (payload.source?.extractionStatus === "ready") chosen.add(payload.source.sourceId);
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
  manualStart.addEventListener("click", () => {
    const selectedPdf = sources.find((source) => chosen.has(source.sourceId) && source.filename.toLowerCase().endsWith(".pdf"));
    if (!selectedPdf || chosen.size !== 1) {
      setMessage(options.getLanguage() === "zh" ? "请先只选择一份 PDF 资料。" : "Select exactly one PDF source first.");
      return;
    }
    manualOpen = true;
    renderSources();
  });
  manualBack.addEventListener("click", () => {
    manualOpen = false;
    renderSources();
  });
  createCourse.addEventListener("click", () => {
    if (chosen.size === 0) {
      setMessage(getText(options).selectReady);
      return;
    }
    if (!options.getApiKey()) {
      setMessage(getText(options).noApiKey);
      return;
    }
    const count = Number.parseInt(lessonCount.value, 10);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setMessage(options.getLanguage() === "zh" ? "请输入 1 到 100 之间的课时数。" : "Enter a lesson count from 1 to 100.");
      return;
    }
    panel.classList.remove("open");
    options.onCreateBookCourse([...chosen], count);
  });
  addLesson.addEventListener("click", () => {
    const start = Number.parseInt(pageStart.value, 10);
    const end = Number.parseInt(pageEnd.value, 10);
    const name = lessonTitle.value.trim();
    if (!name || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      setMessage(options.getLanguage() === "zh" ? "请填写课时名称和有效的 PDF 页码范围。" : "Enter a lesson title and valid PDF page range.");
      return;
    }
    readerLessons = [...readerLessons, { title: name, pageStart: start, pageEnd: end }];
    lessonTitle.value = "";
    pageStart.value = String(end + 1);
    pageEnd.value = String(end + 1);
    renderSources();
  });
  manualTitle.addEventListener("input", renderSources);
  generateManual.addEventListener("click", () => {
    if (chosen.size !== 1 || !manualTitle.value.trim() || readerLessons.length === 0) return;
    panel.classList.remove("open");
    options.onCreateManualCourse([...chosen][0], manualTitle.value.trim(), readerLessons);
  });

  root.addEventListener("click", (event) => {
    if (event.target === root) panel.classList.remove("open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("open")) {
      event.preventDefault();
      panel.classList.remove("open");
    }
  });

  updateLabels();
  return { open, onLanguageChanged: updateLabels };
}
