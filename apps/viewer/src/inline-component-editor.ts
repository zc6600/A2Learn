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
    { prop: "messages", zh: "对话", en: "Messages", itemFields: [{ prop: "content", zh: "内容", en: "Content", multiline: true }] },
  ],
  LearningPath: [
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "steps", zh: "学习步骤", en: "Learning steps", itemFields: [{ prop: "title", zh: "标题", en: "Title" }] },
  ],
  ResourceList: [
    { prop: "title", zh: "标题", en: "Title" },
    {
      prop: "resources",
      zh: "资源", en: "Resources",
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
      zh: "事件",
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
    { prop: "front", zh: "正面", en: "Front", multiline: true },
    { prop: "back", zh: "背面", en: "Back", multiline: true },
  ],
  DeepDivePrompt: [
    { prop: "prompts", zh: "追问", en: "Prompts", itemFields: [{ prop: "label", zh: "文案", en: "Label" }] },
  ],
  DocumentFigure: [
    { prop: "imageUrl", zh: "图片链接", en: "Image URL" },
    { prop: "caption", zh: "图注", en: "Caption", multiline: true },
    { prop: "aiExplanation", zh: "说明", en: "Explanation", multiline: true },
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
    { prop: "venue", zh: "会议或期刊", en: "Venue" },
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
  RelationshipMatch: [
    { prop: "leftItems", zh: "左侧项目", en: "Left items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
    { prop: "rightItems", zh: "右侧项目", en: "Right items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
  ],
  DragAndDropMatch: [
    { prop: "leftItems", zh: "左侧项目", en: "Left items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
    { prop: "rightItems", zh: "右侧项目", en: "Right items", itemFields: [{ prop: "content", zh: "内容", en: "Content" }] },
  ],

  LiteratureReference: [
    { prop: "citation", zh: "引用", en: "Citation" },
    { prop: "title", zh: "标题", en: "Title" },
    { prop: "url", zh: "链接", en: "URL" },
    { prop: "highlightQuote", zh: "引用内容", en: "Highlighted quote", multiline: true },
  ],
  InteractiveFormula: [
    { prop: "latex", zh: "公式", en: "Formula", multiline: true },
    { prop: "description", zh: "说明", en: "Description", multiline: true },
    {
      prop: "derivationSteps",
      zh: "推导步骤",
      en: "Derivation steps",
      itemFields: [
        { prop: "step", zh: "步骤", en: "Step" },
        { prop: "latex", zh: "公式", en: "Formula", multiline: true },
        { prop: "explanation", zh: "说明", en: "Explanation", multiline: true },
      ],
    },
  ],
};

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
    const width = Math.min(340, window.innerWidth - 28);
    root.style.left = `${Math.max(14, Math.min(rect.left, window.innerWidth - width - 14))}px`;
    root.style.top = `${Math.max(14, Math.min(rect.bottom + 8, window.innerHeight - 220))}px`;
    root.classList.add("open");
    root.querySelector<HTMLInputElement | HTMLTextAreaElement>("[data-prop]")?.focus();
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
    if (save) save.disabled = true;
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
      if (save) save.disabled = false;
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
      const document = payload.documents?.find((item) => item.surfaceId === options.getSurfaceId());
      const component = document?.components.find((item) => item.id === componentId);
      const fields = component ? EDITABLE_FIELDS[component.component] : undefined;
      if (!component || !fields) return;
      open(target, component, fields);
    } catch {
      // The floating Agent remains the fallback when a component cannot be read.
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("open")) {
      event.preventDefault();
      close();
    }
  }, true);

  return { onLanguageChanged: close };
}
