import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";

type Language = "zh" | "en";
type StringField = { prop: string; zh: string; en: string; multiline?: boolean };
type ListField = {
  prop: string;
  zh: string;
  en: string;
  itemFields: StringField[];
};
type Field = StringField | ListField;
type PageComponent = { id: string; component: string; props: Record<string, unknown> };

type InlineEditorOptions = {
  getContainer: () => HTMLElement | null;
  getLanguage: () => Language;
  getProjectId: () => string | null;
  getSurfaceId: () => string;
  getApiBaseUrl: () => string;
  getApiKey: () => string;
  getProcessor: () => MessageProcessor<any> | null;
  render: () => void;
};

export type InlineComponentEditorController = {
  onLanguageChanged: () => void;
};

const EDITABLE_FIELDS: Record<string, Field[]> = {
  Text: [{ prop: "text", zh: "文本", en: "Text", multiline: true }],
  AnalogyCard: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "analogy", zh: "内容", en: "Content", multiline: true },
  ],
  ConceptCard: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "definition", zh: "定义", en: "Definition", multiline: true },
    { prop: "example", zh: "示例", en: "Example", multiline: true },
  ],
  MentalModel: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "description", zh: "说明", en: "Description", multiline: true },
    { prop: "analogy", zh: "比喻", en: "Analogy", multiline: true },
    {
      prop: "pillars",
      zh: "核心支柱",
      en: "Pillars",
      itemFields: [
        { prop: "title", zh: "支柱名称", en: "Pillar title" },
        { prop: "description", zh: "支柱说明", en: "Pillar description", multiline: true },
      ],
    },
  ],
  DetailedExplanation: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "content", zh: "内容", en: "Content", multiline: true },
  ],
  InteractiveSandbox: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "description", zh: "说明", en: "Description", multiline: true },
    { prop: "code", zh: "代码", en: "Code", multiline: true },
  ],
  GenerativeLab: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "description", zh: "说明", en: "Description", multiline: true },
    { prop: "html", zh: "HTML", en: "HTML", multiline: true },
    { prop: "css", zh: "CSS", en: "CSS", multiline: true },
    { prop: "javascript", zh: "JavaScript", en: "JavaScript", multiline: true },
  ],
  QuizCard: [
    { prop: "title", zh: "标题", en: "Title" },
    {
      prop: "questions",
      zh: "题目",
      en: "Questions",
      itemFields: [
        { prop: "question", zh: "问题", en: "Question", multiline: true },
        { prop: "explanation", zh: "解析", en: "Explanation", multiline: true },
      ],
    },
  ],
  ScenarioDialogue: [
    { prop: "topic", zh: "主题", en: "Topic" },
    { prop: "groupName", zh: "群聊名称", en: "Group name" },
    { prop: "groupNotice", zh: "群公告", en: "Group notice", multiline: true },
    {
      prop: "messages",
      zh: "对话消息",
      en: "Messages",
      itemFields: [{ prop: "content", zh: "内容", en: "Content", multiline: true }],
    },
  ],
  SocialMoments: [
    { prop: "title", zh: "栏目标题", en: "Title" },
    {
      prop: "posts",
      zh: "朋友圈动态",
      en: "Posts",
      itemFields: [
        { prop: "author", zh: "发布者", en: "Author" },
        { prop: "content", zh: "正文", en: "Content", multiline: true },
        { prop: "location", zh: "地点", en: "Location" },
        { prop: "time", zh: "时间", en: "Time" },
      ],
    },
  ],
  LearningPath: [
    { prop: "title", zh: "标题", en: "Title" },
    {
      prop: "steps",
      zh: "学习步骤",
      en: "Learning steps",
      itemFields: [
        { prop: "title", zh: "步骤标题", en: "Title" },
        { prop: "description", zh: "步骤说明", en: "Description", multiline: true },
      ],
    },
  ],
  ResourceList: [
    { prop: "title", zh: "标题", en: "Title" },
    {
      prop: "resources",
      zh: "资源列表",
      en: "Resources",
      itemFields: [
        { prop: "title", zh: "标题", en: "Title" },
        { prop: "url", zh: "链接", en: "URL" },
        { prop: "description", zh: "说明", en: "Description", multiline: true },
      ],
    },
  ],
  Timeline: [
    {
      prop: "events",
      zh: "事件列表",
      en: "Events",
      itemFields: [
        { prop: "time", zh: "时间", en: "Time" },
        { prop: "title", zh: "标题", en: "Title" },
        { prop: "description", zh: "说明", en: "Description", multiline: true },
      ],
    },
  ],
  CodeSnippet: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "language", zh: "语言", en: "Language" },
    { prop: "code", zh: "代码", en: "Code", multiline: true },
  ],
  Flashcard: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "front", zh: "正面", en: "Front", multiline: true },
    { prop: "back", zh: "背面", en: "Back", multiline: true },
    {
      prop: "cards",
      zh: "卡片列表",
      en: "Cards",
      itemFields: [
        { prop: "front", zh: "正面", en: "Front", multiline: true },
        { prop: "back", zh: "背面", en: "Back", multiline: true },
        { prop: "hint", zh: "提示", en: "Hint" },
      ],
    },
  ],
  DeepDivePrompt: [
    { prop: "prompts", zh: "追问选项", en: "Prompts", itemFields: [{ prop: "label", zh: "文案", en: "Label" }] },
  ],
  DocumentFigure: [
    { prop: "imageUrl", zh: "图片链接", en: "Image URL" },
    { prop: "caption", zh: "图注", en: "Caption", multiline: true },
    { prop: "aiExplanation", zh: "AI说明", en: "AI Explanation", multiline: true },
  ],
  KnowledgeTree: [{ prop: "title", zh: "标题", en: "Title" }],
  ClozeTest: [
    { prop: "text", zh: "题干", en: "Question", multiline: true },
    { prop: "explanation", zh: "解析", en: "Explanation", multiline: true },
  ],
  SmartAnnotationBoard: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "prompt", zh: "提示", en: "Prompt", multiline: true },
  ],
  PaperAbstract: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "abstract", zh: "摘要", en: "Abstract", multiline: true },
    { prop: "tldr", zh: "简述", en: "TL;DR", multiline: true },
    { prop: "venue", zh: "会议/期刊", en: "Venue" },
  ],
  CourseOutline: [
    { prop: "courseTitle", zh: "课程标题", en: "Course title" },
    { prop: "description", zh: "课程说明", en: "Description", multiline: true },
    {
      prop: "modules",
      zh: "课程模块",
      en: "Modules",
      itemFields: [
        { prop: "title", zh: "标题", en: "Title" },
        { prop: "description", zh: "说明", en: "Description", multiline: true },
      ],
    },
  ],
  DataTable: [
    { prop: "title", zh: "表格标题", en: "Title" },
    { prop: "caption", zh: "表格说明", en: "Caption", multiline: true },
    { prop: "emptyMessage", zh: "空状态文案", en: "Empty message" },
  ],
  RelationshipMatch: [
    { prop: "leftItems", zh: "左侧项目", en: "Left items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
    { prop: "rightItems", zh: "右侧项目", en: "Right items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
  ],
  DragAndDropMatch: [
    { prop: "leftItems", zh: "左侧项目", en: "Left items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
    { prop: "rightItems", zh: "右侧项目", en: "Right items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
  ],
  LiteratureReference: [
    { prop: "citation", zh: "引用出处", en: "Citation" },
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "url", zh: "链接", en: "URL" },
    { prop: "highlightQuote", zh: "原文摘录", en: "Highlighted quote", multiline: true },
  ],
  InteractiveFormula: [
    { prop: "latex", zh: "公式", en: "Formula", multiline: true },
    { prop: "description", zh: "说明", en: "Description", multiline: true },
    {
      prop: "derivationSteps",
      zh: "推导步骤",
      en: "Derivation steps",
      itemFields: [
        { prop: "step", zh: "步骤序号", en: "Step" },
        { prop: "latex", zh: "公式", en: "Formula", multiline: true },
        { prop: "explanation", zh: "说明", en: "Explanation", multiline: true },
      ],
    },
  ],
};

function getFieldsForComponent(component: PageComponent): Field[] {
  if (EDITABLE_FIELDS[component.component]) {
    return EDITABLE_FIELDS[component.component];
  }
  // Auto-generate fields for all top-level string/multiline props on unknown or basic components
  const fields: Field[] = [];
  for (const [key, val] of Object.entries(component.props)) {
    if (key.startsWith("_") || key === "id" || key === "weight" || key === "accessibility") continue;
    if (typeof val === "string" || (val && typeof val === "object" && "literalString" in val)) {
      const textVal = readString(val);
      const isMulti = textVal.length > 40 || textVal.includes("\n");
      fields.push({
        prop: key,
        zh: key,
        en: key,
        multiline: isMulti,
      });
    }
  }
  return fields;
}

function headers(apiKey: string, json = false): HeadersInit {
  const result: Record<string, string> = {};
  if (json) result["Content-Type"] = "application/json";
  if (apiKey) result["X-OpenRouter-API-Key"] = apiKey;
  return result;
}

function readString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { literalString?: unknown }).literalString === "string") {
    return (value as { literalString: string }).literalString;
  }
  return "";
}

function writeString(previous: unknown, value: string): unknown {
  if (previous && typeof previous === "object" && "literalString" in previous) {
    return { ...(previous as Record<string, unknown>), literalString: value };
  }
  return value;
}

function findComponentTarget(event: MouseEvent, container: HTMLElement): HTMLElement | null {
  const path = event.composedPath();
  if (!path.includes(container)) return null;
  return path.find(
    (node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.getAttribute("data-component-id")),
  ) || null;
}

export function mountInlineComponentEditor(options: InlineEditorOptions): InlineComponentEditorController {
  if (document.getElementById("a2learn-inline-editor")) {
    return { onLanguageChanged: () => undefined };
  }

  const root = document.createElement("form");
  root.id = "a2learn-inline-editor";
  document.body.appendChild(root);
  let selected: { component: PageComponent; fields: Field[] } | null = null;

  const close = () => {
    root.classList.remove("open");
    root.replaceChildren();
    selected = null;
  };

  const text = (zh: string, en: string) => options.getLanguage() === "en" ? en : zh;

  const ensureProject = async (projectId: string, apiBaseUrl: string) => {
    const exampleMatch = projectId.match(/^example-(?:zh|en)-(.+)$/);
    const exampleId = exampleMatch ? exampleMatch[1] : (projectId.startsWith("example-") ? projectId.replace(/^example-/, "") : projectId);
    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/ensure-example`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: options.getLanguage(), exampleId, actor: "human" }),
      });
      if (response.ok || response.status === 409) return;
    } catch {
      // Backend auto-import fallback
    }
  };

  const open = (target: HTMLElement, component: PageComponent, fields: Field[]) => {
    selected = { component, fields };
    root.replaceChildren();
    const head = document.createElement("header");
    head.className = "a2learn-inline-editor-head";
    const title = document.createElement("span");
    title.textContent = text("编辑组件", "Edit component");
    const closeButton = document.createElement("button");
    closeButton.className = "a2learn-inline-editor-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", text("关闭", "Close"));
    closeButton.addEventListener("click", close);
    head.append(title, closeButton);
    root.appendChild(head);

    const appendStringField = (
      field: StringField,
      value: unknown,
      attributes: Record<string, string> = {},
      parent: HTMLElement = root,
    ) => {
      const label = document.createElement("label");
      label.className = "a2learn-inline-editor-field";
      label.textContent = options.getLanguage() === "en" ? field.en : field.zh;
      const input = document.createElement(field.multiline ? "textarea" : "input");
      input.className = `a2learn-inline-editor-input${field.multiline ? " multiline" : ""}`;
      for (const [name, attributeValue] of Object.entries(attributes)) input.setAttribute(name, attributeValue);
      input.value = readString(value);
      label.appendChild(input);
      parent.appendChild(label);
    };
    for (const field of fields) {
      if ("itemFields" in field) {
        const list = document.createElement("section");
        list.className = "a2learn-inline-editor-list";
        const listTitle = document.createElement("span");
        listTitle.className = "a2learn-inline-editor-list-title";
        listTitle.textContent = options.getLanguage() === "en" ? field.en : field.zh;
        list.appendChild(listTitle);
        const items: unknown[] = Array.isArray(component.props[field.prop])
          ? component.props[field.prop] as unknown[]
          : [];
        items.forEach((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return;
          const itemRoot = document.createElement("div");
          itemRoot.className = "a2learn-inline-editor-list-item";
          const itemIndex = document.createElement("span");
          itemIndex.className = "a2learn-inline-editor-list-index";
          itemIndex.textContent = `${index + 1}`;
          itemRoot.appendChild(itemIndex);
          field.itemFields.forEach((itemField) =>
            appendStringField(
              itemField,
              (item as Record<string, unknown>)[itemField.prop],
              {
                "data-list-prop": field.prop,
                "data-list-index": String(index),
                "data-item-prop": itemField.prop,
              },
              itemRoot,
            ),
          );
          list.appendChild(itemRoot);
        });
        root.appendChild(list);
        continue;
      }
      appendStringField(field, component.props[field.prop], { "data-prop": field.prop });
    }
    const actions = document.createElement("div");
    actions.className = "a2learn-inline-editor-actions";
    const save = document.createElement("button");
    save.className = "a2learn-inline-editor-save";
    save.type = "submit";
    save.textContent = text("保存", "Save");
    actions.appendChild(save);
    root.appendChild(actions);

    const rect = target.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 28);
    root.style.width = `${width}px`;
    root.style.left = `${Math.max(14, Math.min(rect.left, window.innerWidth - width - 14))}px`;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 260 && rect.top > 260) {
      root.style.top = `${Math.max(14, rect.top - 240)}px`;
    } else {
      root.style.top = `${Math.max(14, Math.min(rect.bottom + 8, window.innerHeight - 300))}px`;
    }
    root.classList.add("open");
    root.querySelector<HTMLInputElement | HTMLTextAreaElement>("[data-prop], [data-item-prop]")?.focus();
  };

  root.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selected) return;
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId || !apiBaseUrl) return;
    const updates: Record<string, unknown> = {};
    for (const field of selected.fields) {
      if ("itemFields" in field) {
        const originalItems: unknown[] = Array.isArray(selected.component.props[field.prop])
          ? selected.component.props[field.prop] as unknown[]
          : [];
        const nextItems = originalItems.map((item) => item && typeof item === "object" && !Array.isArray(item)
          ? { ...(item as Record<string, unknown>) }
          : item,
        );
        let changed = false;
        nextItems.forEach((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return;
          field.itemFields.forEach((itemField) => {
            const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
              `[data-list-prop="${field.prop}"][data-list-index="${index}"][data-item-prop="${itemField.prop}"]`,
            );
            const next = input?.value ?? "";
            const previous = (item as Record<string, unknown>)[itemField.prop];
            if (next !== readString(previous)) {
              (item as Record<string, unknown>)[itemField.prop] = writeString(previous, next);
              changed = true;
            }
          });
        });
        if (changed) updates[field.prop] = nextItems;
        continue;
      }
      const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-prop="${field.prop}"]`);
      const next = input?.value ?? "";
      if (next !== readString(selected.component.props[field.prop])) {
        updates[field.prop] = writeString(selected.component.props[field.prop], next);
      }
    }
    if (Object.keys(updates).length === 0) {
      close();
      return;
    }
    const save = root.querySelector<HTMLButtonElement>(".a2learn-inline-editor-save");
    root.querySelectorAll(".a2learn-inline-editor-note").forEach((el) => el.remove());
    if (save) {
      save.disabled = true;
      save.textContent = text("保存中…", "Saving…");
    }
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/components/${encodeURIComponent(selected.component.id)}`,
        {
          method: "POST",
          headers: headers(options.getApiKey(), true),
          body: JSON.stringify({
            surfaceId: options.getSurfaceId(),
            props: updates,
            summary: text(`手动修改 ${selected.component.id}`, `Manual edit ${selected.component.id}`),
          }),
        },
      );
      if (!response.ok) throw new Error(text(`保存失败 (${response.status})`, `Save failed (${response.status})`));
      const payload = await response.json() as { sync?: { messages?: A2uiMessage[] } };
      const processor = options.getProcessor();
      if (!processor || !Array.isArray(payload.sync?.messages)) throw new Error(text("保存响应无效", "Invalid save response"));
      processor.processMessages(payload.sync.messages);
      options.render();
      close();
    } catch (error) {
      const note = document.createElement("p");
      note.className = "a2learn-inline-editor-note";
      note.textContent = error instanceof Error ? error.message : String(error);
      root.appendChild(note);
      if (save) {
        save.disabled = false;
        save.textContent = text("保存", "Save");
      }
    }
  });

  document.addEventListener("dblclick", async (event) => {
    const container = options.getContainer();
    if (!container || root.contains(event.target as Node)) return;
    const target = findComponentTarget(event, container);
    const componentId = target?.getAttribute("data-component-id");
    if (!target || !componentId) return;
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId || !apiBaseUrl) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      await ensureProject(projectId, apiBaseUrl);
      const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}`, { headers: headers(options.getApiKey()) });
      if (!response.ok) throw new Error(text(`加载组件失败 (${response.status})`, `Could not load the component (${response.status})`));
      const payload = await response.json() as { documents?: Array<{ surfaceId: string; components: PageComponent[] }> };
      const document = payload.documents?.find((item) => item.surfaceId === options.getSurfaceId()) || payload.documents?.[0];
      const component = document?.components.find((item) => item.id === componentId);
      const fields = component ? getFieldsForComponent(component) : [];
      if (!component || fields.length === 0) return;
      open(target, component, fields);
    } catch {
      // The floating Agent remains the fallback when a component cannot be read.
    }
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (!root.classList.contains("open")) return;
    if (!root.contains(event.target as Node)) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("open")) {
      event.preventDefault();
      close();
    }
  }, true);

  return { onLanguageChanged: close };
}
