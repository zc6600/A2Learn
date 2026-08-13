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
  onCreateManualCourse: (
    sourceId: string,
    title: string,
    lessons: Array<{ title: string; pageStart: number; pageEnd: number }>,
  ) => void;
};

export type SourceLibraryController = {
  open: () => void;
  onLanguageChanged: () => void;
};

function getText(options: SourceLibraryOptions) {
  return SOURCE_LIBRARY_COPY[options.getLanguage()] || SOURCE_LIBRARY_COPY.zh;
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

export function mountSourceLibrary(options: SourceLibraryOptions): SourceLibraryController {
  const existing = document.getElementById("a2learn-source-library");
  if (existing) return { open: () => undefined, onLanguageChanged: () => undefined };

  // =========================================================================
  // 1. SOURCE LIBRARY MODAL
  // =========================================================================
  const root = document.createElement("aside");
  root.id = "a2learn-source-library";
  root.setAttribute("aria-live", "polite");

  const panel = document.createElement("section");
  panel.className = "a2learn-library-panel";

  // Header
  const libraryHead = document.createElement("header");
  libraryHead.className = "a2learn-library-head";

  const titleGroup = document.createElement("div");
  titleGroup.className = "a2learn-library-title-group";
  const title = document.createElement("h2");
  title.className = "a2learn-library-title";
  const subtitle = document.createElement("p");
  subtitle.className = "a2learn-library-subtitle";
  titleGroup.append(title, subtitle);

  const headActions = document.createElement("div");
  headActions.className = "a2learn-library-head-actions";
  const refresh = document.createElement("button");
  refresh.className = "a2learn-icon-btn";
  refresh.type = "button";
  refresh.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`;

  const close = document.createElement("button");
  close.className = "a2learn-library-close-btn";
  close.type = "button";
  close.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  headActions.append(refresh, close);
  libraryHead.append(titleGroup, headActions);

  // Upload Area
  const uploadArea = document.createElement("div");
  uploadArea.className = "a2learn-library-upload-area";

  const uploadLabel = document.createElement("label");
  uploadLabel.className = "a2learn-library-dropzone";

  const fileInput = document.createElement("input");
  fileInput.className = "a2learn-library-file-input";
  fileInput.type = "file";
  fileInput.accept = ".pdf,.epub,.docx,.md,.markdown,.txt,.html,.htm,.json,.yaml,.yml,.csv,.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp";

  const uploadIcon = document.createElement("div");
  uploadIcon.className = "a2learn-dropzone-icon";
  uploadIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

  const uploadTextGroup = document.createElement("div");
  uploadTextGroup.className = "a2learn-dropzone-text";
  const uploadTitle = document.createElement("span");
  uploadTitle.className = "a2learn-dropzone-title";
  const uploadDesc = document.createElement("span");
  uploadDesc.className = "a2learn-dropzone-desc";
  uploadTextGroup.append(uploadTitle, uploadDesc);

  uploadLabel.append(fileInput, uploadIcon, uploadTextGroup);
  uploadArea.append(uploadLabel);

  // Message banner
  const messageBanner = document.createElement("div");
  messageBanner.className = "a2learn-library-alert";
  messageBanner.hidden = true;

  // Sources Section
  const sourcesSection = document.createElement("div");
  sourcesSection.className = "a2learn-library-sources-section";

  const sourcesHeader = document.createElement("div");
  sourcesHeader.className = "a2learn-sources-header";
  const sourcesHeaderTitle = document.createElement("span");
  sourcesHeaderTitle.className = "a2learn-sources-section-title";
  sourcesHeader.append(sourcesHeaderTitle);

  const sourcesElement = document.createElement("div");
  sourcesElement.className = "a2learn-library-sources";
  sourcesSection.append(sourcesHeader, sourcesElement);

  // Learning Goal Customization
  const goalSection = document.createElement("div");
  goalSection.className = "a2learn-library-goal-section";
  const goalLabel = document.createElement("label");
  goalLabel.className = "a2learn-field-label";
  const goal = document.createElement("textarea");
  goal.className = "a2learn-library-goal";
  goal.maxLength = 1000;
  goal.rows = 2;
  goalSection.append(goalLabel, goal);

  // Library Footer Actions
  const footer = document.createElement("footer");
  footer.className = "a2learn-library-footer";

  const selectedBadge = document.createElement("div");
  selectedBadge.className = "a2learn-selection-count";

  const footerActions = document.createElement("div");
  footerActions.className = "a2learn-footer-actions";

  const manualStart = document.createElement("button");
  manualStart.className = "a2learn-btn-secondary a2learn-btn-split";
  manualStart.type = "button";
  manualStart.hidden = true; // Hidden by default, only shown when 1 PDF is selected

  const generate = document.createElement("button");
  generate.className = "a2learn-btn-primary a2learn-btn-generate";
  generate.type = "button";

  footerActions.append(manualStart, generate);
  footer.append(selectedBadge, footerActions);

  panel.append(libraryHead, uploadArea, messageBanner, sourcesSection, goalSection, footer);
  root.append(panel);
  document.body.appendChild(root);

  // =========================================================================
  // 2. DEDICATED PDF SPLITTER POPUP MODAL
  // =========================================================================
  const splitterRoot = document.createElement("aside");
  splitterRoot.id = "a2learn-pdf-splitter-modal";
  splitterRoot.className = "a2learn-modal-overlay";
  splitterRoot.setAttribute("aria-live", "polite");

  const splitterPanel = document.createElement("section");
  splitterPanel.className = "a2learn-splitter-panel";

  // Splitter Header
  const splitterHead = document.createElement("header");
  splitterHead.className = "a2learn-manual-head";

  const manualBack = document.createElement("button");
  manualBack.className = "a2learn-btn-back";
  manualBack.type = "button";
  const backIcon = document.createElement("span");
  backIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
  const backText = document.createElement("span");
  manualBack.append(backIcon, backText);

  const manualTitleWrap = document.createElement("div");
  manualTitleWrap.className = "a2learn-manual-title-wrap";
  const manualHeading = document.createElement("h3");
  manualHeading.className = "a2learn-manual-heading";
  const manualSource = document.createElement("span");
  manualSource.className = "a2learn-manual-source-pill";
  manualTitleWrap.append(manualHeading, manualSource);

  const splitterClose = document.createElement("button");
  splitterClose.className = "a2learn-library-close-btn";
  splitterClose.type = "button";
  splitterClose.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  splitterHead.append(manualBack, manualTitleWrap, splitterClose);

  // Splitter Workspace (Left: PDF Reader, Right: Form Controls)
  const manualWorkspace = document.createElement("div");
  manualWorkspace.className = "a2learn-manual-workspace";

  // Left Pane: PDF Reader
  const readerPane = document.createElement("div");
  readerPane.className = "a2learn-reader-pane";

  const readerHeader = document.createElement("div");
  readerHeader.className = "a2learn-reader-header";
  readerHeader.innerHTML = `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>PDF 原文预览</span>`;

  const readerWrapper = document.createElement("div");
  readerWrapper.className = "a2learn-reader-wrapper";
  const manualReader = document.createElement("iframe");
  manualReader.className = "a2learn-library-pdf-reader";
  manualReader.title = "PDF Reader";
  readerWrapper.append(manualReader);
  readerPane.append(readerHeader, readerWrapper);

  // Right Pane: Form Controls
  const formPane = document.createElement("div");
  formPane.className = "a2learn-form-pane";

  // Card 1: Course Title
  const courseTitleCard = document.createElement("div");
  courseTitleCard.className = "a2learn-panel-card";
  const courseTitleLabel = document.createElement("label");
  courseTitleLabel.className = "a2learn-field-label required";
  const manualTitle = document.createElement("input");
  manualTitle.className = "a2learn-text-input";
  courseTitleCard.append(courseTitleLabel, manualTitle);

  // Card 2: Add Lesson
  const lessonCreatorCard = document.createElement("div");
  lessonCreatorCard.className = "a2learn-panel-card a2learn-creator-card";
  const lessonCreatorTitle = document.createElement("div");
  lessonCreatorTitle.className = "a2learn-card-section-title";

  const lessonTitleGroup = document.createElement("div");
  lessonTitleGroup.className = "a2learn-form-row";
  const lessonTitleLabel = document.createElement("label");
  lessonTitleLabel.className = "a2learn-field-label";
  const lessonTitle = document.createElement("input");
  lessonTitle.className = "a2learn-text-input";
  lessonTitleGroup.append(lessonTitleLabel, lessonTitle);

  const pageRangeGroup = document.createElement("div");
  pageRangeGroup.className = "a2learn-form-row";
  const pageRangeLabel = document.createElement("label");
  pageRangeLabel.className = "a2learn-field-label";

  const pageRangeRow = document.createElement("div");
  pageRangeRow.className = "a2learn-page-range-row";
  const pageFromText = document.createElement("span");
  pageFromText.className = "a2learn-range-text";
  const pageStart = document.createElement("input");
  pageStart.type = "number";
  pageStart.min = "1";
  pageStart.value = "1";
  pageStart.className = "a2learn-num-input";
  const pageToText = document.createElement("span");
  pageToText.className = "a2learn-range-text";
  const pageEnd = document.createElement("input");
  pageEnd.type = "number";
  pageEnd.min = "1";
  pageEnd.value = "1";
  pageEnd.className = "a2learn-num-input";
  const pageUnitText = document.createElement("span");
  pageUnitText.className = "a2learn-range-text";

  pageRangeRow.append(pageFromText, pageStart, pageToText, pageEnd, pageUnitText);
  pageRangeGroup.append(pageRangeLabel, pageRangeRow);

  const addLesson = document.createElement("button");
  addLesson.className = "a2learn-btn-secondary a2learn-add-lesson-btn";
  addLesson.type = "button";

  lessonCreatorCard.append(lessonCreatorTitle, lessonTitleGroup, pageRangeGroup, addLesson);

  // Card 3: Lessons Queue
  const lessonListCard = document.createElement("div");
  lessonListCard.className = "a2learn-panel-card a2learn-lesson-list-card";

  const lessonListHeader = document.createElement("div");
  lessonListHeader.className = "a2learn-card-section-title-row";
  const lessonListTitle = document.createElement("span");
  lessonListTitle.className = "a2learn-card-section-title";
  const lessonListBadge = document.createElement("span");
  lessonListBadge.className = "a2learn-count-pill";
  lessonListHeader.append(lessonListTitle, lessonListBadge);

  const manualLessons = document.createElement("div");
  manualLessons.className = "a2learn-manual-lessons-list";
  lessonListCard.append(lessonListHeader, manualLessons);

  // Card 4: Submit Batch Generation
  const generateManual = document.createElement("button");
  generateManual.className = "a2learn-btn-primary a2learn-generate-manual-btn";
  generateManual.type = "button";

  formPane.append(courseTitleCard, lessonCreatorCard, lessonListCard, generateManual);

  manualWorkspace.append(readerPane, formPane);
  splitterPanel.append(splitterHead, manualWorkspace);
  splitterRoot.append(splitterPanel);
  document.body.appendChild(splitterRoot);

  // State
  let sources: KnowledgeSource[] = [];
  const chosen = new Set<string>();
  let activePdfSource: KnowledgeSource | null = null;
  let readerLessons: Array<{ title: string; pageStart: number; pageEnd: number }> = [];
  let isLoading = false;
  let hasLoadError = false;

  const setMessage = (value: string, isError = false) => {
    if (!value) {
      messageBanner.hidden = true;
      messageBanner.textContent = "";
      messageBanner.classList.remove("error");
      return;
    }
    messageBanner.hidden = false;
    messageBanner.textContent = value;
    messageBanner.classList.toggle("error", isError);
  };

  const apiBaseUrl = () => options.getApiBaseUrl().replace(/\/+$/, "");

  const updateLabels = () => {
    const copy = getText(options);
    title.textContent = copy.title;
    subtitle.textContent = copy.unsupportedHint;
    close.setAttribute("aria-label", copy.close);
    splitterClose.setAttribute("aria-label", copy.close);
    refresh.setAttribute("aria-label", copy.refresh);
    uploadTitle.textContent = copy.dropzoneTitle;
    uploadDesc.textContent = copy.dropzoneSubtitle;
    sourcesHeaderTitle.textContent = options.getLanguage() === "zh" ? "资料列表" : "Sources";
    goalLabel.textContent = copy.goalLabel;
    goal.placeholder = copy.goal;
    generate.textContent = copy.generate;
    manualStart.textContent = copy.splitPdf;
    backText.textContent = copy.backToLibrary;
    manualHeading.textContent = copy.pdfSplitTitle;
    courseTitleLabel.textContent = copy.courseTitle;
    manualTitle.placeholder = copy.courseTitlePlaceholder;
    lessonCreatorTitle.textContent = copy.addLesson;
    lessonTitleLabel.textContent = copy.lessonTitle;
    lessonTitle.placeholder = copy.lessonTitlePlaceholder;
    pageRangeLabel.textContent = copy.pageRange;
    pageFromText.textContent = copy.pageFrom;
    pageToText.textContent = copy.pageTo;
    pageUnitText.textContent = copy.pageUnit;
    pageStart.setAttribute("aria-label", copy.pageFrom);
    pageEnd.setAttribute("aria-label", copy.pageTo);
    addLesson.textContent = copy.addToList;
    lessonListTitle.textContent = copy.lessonQueue;
    renderSources();
  };

  const openSplitter = (pdfSource: KnowledgeSource) => {
    const copy = getText(options);
    activePdfSource = pdfSource;
    panel.classList.remove("open");
    splitterPanel.classList.add("open");

    manualHeading.textContent = copy.pdfSplitTitle;
    manualSource.textContent = `${pdfSource.title} (${pdfSource.pageCount || "?"} ${options.getLanguage() === "zh" ? "页" : "p."})`;

    const sourceUrl = `${apiBaseUrl()}/api/knowledge/sources/${encodeURIComponent(pdfSource.sourceId)}/original`;
    if (manualReader.src !== sourceUrl) manualReader.src = sourceUrl;

    const maxP = String(pdfSource.pageCount || "");
    pageEnd.max = maxP;
    pageStart.max = maxP;
    pageStart.value = "1";
    pageEnd.value = String(Math.min(5, pdfSource.pageCount || 1));

    if (!manualTitle.value.trim()) {
      manualTitle.value = pdfSource.title.replace(/\.pdf$/i, "");
    }
    renderSplitterLessons();
  };

  const closeSplitter = () => {
    splitterPanel.classList.remove("open");
    manualReader.removeAttribute("src");
    activePdfSource = null;
  };

  const renderSplitterLessons = () => {
    const copy = getText(options);
    lessonListBadge.textContent = `${readerLessons.length} ${options.getLanguage() === "zh" ? "节课" : "lessons"}`;
    generateManual.textContent = copy.batchGenerate.replace("{count}", String(readerLessons.length));
    generateManual.disabled = !activePdfSource || readerLessons.length === 0 || !manualTitle.value.trim();

    if (readerLessons.length === 0) {
      const emptyLessons = document.createElement("div");
      emptyLessons.className = "a2learn-empty-lessons";
      emptyLessons.textContent = copy.noLessons;
      manualLessons.replaceChildren(emptyLessons);
    } else {
      manualLessons.replaceChildren(
        ...readerLessons.map((lesson, index) => {
          const item = document.createElement("div");
          item.className = "a2learn-lesson-item";

          const idxBadge = document.createElement("span");
          idxBadge.className = "a2learn-lesson-idx";
          idxBadge.textContent = `#${index + 1}`;

          const lessonContent = document.createElement("div");
          lessonContent.className = "a2learn-lesson-content";
          const titleSpan = document.createElement("span");
          titleSpan.className = "a2learn-lesson-title";
          titleSpan.textContent = lesson.title;
          const rangeSpan = document.createElement("span");
          rangeSpan.className = "a2learn-lesson-range-badge";
          rangeSpan.textContent = `p.${lesson.pageStart}–${lesson.pageEnd}`;
          lessonContent.append(titleSpan, rangeSpan);

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "a2learn-lesson-del-btn";
          remove.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
          remove.title = options.getLanguage() === "zh" ? "删除本节课时" : "Delete lesson";
          remove.addEventListener("click", () => {
            readerLessons = readerLessons.filter((_, current) => current !== index);
            renderSplitterLessons();
          });

          item.append(idxBadge, lessonContent, remove);
          return item;
        }),
      );
    }
  };

  const renderSources = () => {
    const copy = getText(options);
    sourcesElement.replaceChildren();

    const readyIds = new Set(
      sources.filter((source) => source.extractionStatus === "ready").map((source) => source.sourceId),
    );
    for (const sourceId of [...chosen]) {
      if (!readyIds.has(sourceId)) chosen.delete(sourceId);
    }

    if (sources.length === 0 && !isLoading && !hasLoadError) {
      const empty = document.createElement("div");
      empty.className = "a2learn-library-empty-state";
      empty.innerHTML = `
        <div class="a2learn-empty-icon">📂</div>
        <p class="a2learn-empty-text">${copy.empty}</p>
      `;
      sourcesElement.append(empty);
    }

    for (const source of sources) {
      const isPdf = source.filename.toLowerCase().endsWith(".pdf");
      const row = document.createElement("div");
      row.className = `a2learn-library-source-card ${chosen.has(source.sourceId) ? "selected" : ""}`;

      const checkboxWrap = document.createElement("label");
      checkboxWrap.className = "a2learn-source-check-wrap";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = source.extractionStatus !== "ready";
      checkbox.checked = chosen.has(source.sourceId);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) chosen.add(source.sourceId);
        else chosen.delete(source.sourceId);
        renderSources();
      });
      checkboxWrap.append(checkbox);

      const fileIcon = document.createElement("div");
      fileIcon.className = `a2learn-source-type-icon ${isPdf ? "pdf" : ""}`;
      const ext = source.filename.split(".").pop()?.toUpperCase() || "FILE";
      fileIcon.textContent = ext.slice(0, 4);

      const detail = document.createElement("div");
      detail.className = "a2learn-source-detail";

      const nameRow = document.createElement("div");
      nameRow.className = "a2learn-source-title-row";
      const name = document.createElement("div");
      name.className = "a2learn-source-title";
      name.title = source.title;
      name.textContent = source.title;

      const statusBadge = document.createElement("span");
      statusBadge.className = `a2learn-source-status ${source.extractionStatus === "ready" ? "ready" : source.extractionStatus === "failed" ? "failed" : "pending"}`;
      statusBadge.textContent = statusLabel(source, options);
      statusBadge.title = source.error || "";
      nameRow.append(name, statusBadge);

      const metaRow = document.createElement("div");
      metaRow.className = "a2learn-source-meta-row";
      const facts = [formatBytes(source.sizeBytes)];
      if (source.pageCount) facts.push(`${source.pageCount} ${options.getLanguage() === "zh" ? "页" : "pages"}`);
      if (source.chunkCount) facts.push(`${source.chunkCount} chunks`);
      const factsText = document.createElement("span");
      factsText.textContent = facts.join(" · ");
      metaRow.append(factsText);

      // If this is a ready PDF, add a direct "拆分课时" mini action tag
      if (isPdf && source.extractionStatus === "ready") {
        const splitTag = document.createElement("button");
        splitTag.type = "button";
        splitTag.className = "a2learn-source-split-tag";
        splitTag.innerHTML = `📑 <span>${copy.splitPdf}</span>`;
        splitTag.addEventListener("click", (e) => {
          e.stopPropagation();
          chosen.clear();
          chosen.add(source.sourceId);
          renderSources();
          openSplitter(source);
        });
        metaRow.append(splitTag);
      }

      detail.append(nameRow, metaRow);
      row.append(checkboxWrap, fileIcon, detail);
      sourcesElement.append(row);
    }

    selectedBadge.innerHTML = copy.selected.replace(
      "{count}",
      `<strong class="a2learn-highlight-count">${chosen.size}</strong>`,
    );
    generate.disabled = chosen.size === 0;

    // Check if exactly 1 PDF is selected
    const selectedPdf = sources.find(
      (source) => chosen.has(source.sourceId) && source.filename.toLowerCase().endsWith(".pdf"),
    );
    const hasSinglePdfSelected = chosen.size === 1 && Boolean(selectedPdf) && selectedPdf?.extractionStatus === "ready";

    // Only show "按 PDF 拆分课时" button when 1 PDF is selected; otherwise hide it completely
    manualStart.hidden = !hasSinglePdfSelected;
    manualStart.disabled = !hasSinglePdfSelected;
  };

  const loadSources = async () => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      hasLoadError = true;
      setMessage(getText(options).noBackend, true);
      renderSources();
      return;
    }
    isLoading = true;
    hasLoadError = false;
    refresh.disabled = true;
    setMessage(getText(options).loading, false);
    try {
      const response = await fetch(`${baseUrl}/api/knowledge/sources`, {
        headers: requestHeaders(options.getApiKey()),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { sources?: KnowledgeSource[] };
      sources = Array.isArray(payload.sources) ? payload.sources : [];
      hasLoadError = false;
      setMessage("", false);
    } catch (error) {
      hasLoadError = true;
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessage(`${getText(options).loadFailed} (${errorMsg})`, true);
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

  const closePanel = () => {
    panel.classList.remove("open");
  };

  close.addEventListener("click", closePanel);
  splitterClose.addEventListener("click", closeSplitter);
  refresh.addEventListener("click", () => void loadSources());

  manualBack.addEventListener("click", () => {
    closeSplitter();
    panel.classList.add("open");
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      setMessage(getText(options).noBackend, true);
      return;
    }
    fileInput.disabled = true;
    setMessage(getText(options).uploading, false);
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const response = await fetch(`${baseUrl}/api/knowledge/sources`, {
        method: "POST",
        headers: requestHeaders(options.getApiKey()),
        body,
      });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as { source?: KnowledgeSource };
      if (payload.source?.extractionStatus === "ready") chosen.add(payload.source.sourceId);
      await loadSources();
    } catch (error) {
      setMessage(`${getText(options).uploadFailed} (${String(error)})`, true);
    } finally {
      fileInput.value = "";
      fileInput.disabled = false;
    }
  });

  generate.addEventListener("click", () => {
    if (chosen.size === 0) {
      setMessage(getText(options).selectReady, true);
      return;
    }
    if (!options.getApiKey()) {
      setMessage(getText(options).noApiKey, true);
      return;
    }
    panel.classList.remove("open");
    options.onGenerate([...chosen], goal.value.trim());
  });

  manualStart.addEventListener("click", () => {
    const selectedPdf = sources.find(
      (source) => chosen.has(source.sourceId) && source.filename.toLowerCase().endsWith(".pdf"),
    );
    if (!selectedPdf || chosen.size !== 1) {
      setMessage(getText(options).selectPdfFirst, true);
      return;
    }
    openSplitter(selectedPdf);
  });

  addLesson.addEventListener("click", () => {
    const start = Number.parseInt(pageStart.value, 10);
    const end = Number.parseInt(pageEnd.value, 10);
    const name = lessonTitle.value.trim();
    if (!name || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      alert(getText(options).enterValidLesson);
      return;
    }
    readerLessons = [...readerLessons, { title: name, pageStart: start, pageEnd: end }];
    lessonTitle.value = "";
    pageStart.value = String(end + 1);
    pageEnd.value = String(end + 1);
    renderSplitterLessons();
  });

  manualTitle.addEventListener("input", renderSplitterLessons);

  generateManual.addEventListener("click", () => {
    if (!activePdfSource || !manualTitle.value.trim() || readerLessons.length === 0) return;
    const targetSourceId = activePdfSource.sourceId;
    const titleVal = manualTitle.value.trim();
    const lessonsList = [...readerLessons];
    closeSplitter();
    options.onCreateManualCourse(targetSourceId, titleVal, lessonsList);
  });

  root.addEventListener("click", (event) => {
    if (event.target === root) closePanel();
  });

  splitterRoot.addEventListener("click", (event) => {
    if (event.target === splitterRoot) closeSplitter();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (splitterPanel.classList.contains("open")) {
        event.preventDefault();
        closeSplitter();
      } else if (panel.classList.contains("open")) {
        event.preventDefault();
        closePanel();
      }
    }
  });

  updateLabels();
  return { open, onLanguageChanged: updateLabels };
}
