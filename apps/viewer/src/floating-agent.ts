import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import { RecentProject } from "./recent-projects";

type AgentSync = { messages: A2uiMessage[] };
type AgentEvent = { event: string; data: Record<string, any> };
type HistoryChange = {
  documentId: string;
  revision: number;
  summary: string | null;
  createdAt: string;
};

type FloatingAgentOptions = {
  getLanguage: () => "zh" | "en";
  getProjectId: () => string | null;
  getSurfaceId: () => string;
  getApiBaseUrl: () => string;
  getApiKey: () => string;
  getProcessor: () => MessageProcessor<any> | null;
  render: () => void;
  pickComponent: () => Promise<string | null>;
  recentProjects: () => RecentProject[];
  onProjectCreated: (projectId: string, title: string, messages: A2uiMessage[]) => void;
  onOpenProject: (project: RecentProject) => Promise<void>;
};

export type FloatingAgentController = {
  onLanguageChanged: () => void;
  ask: (question: string) => void;
};

function headers(apiKey: string, json = false): HeadersInit {
  const result: Record<string, string> = {};
  if (json) result["Content-Type"] = "application/json";
  if (apiKey) result["X-OpenRouter-API-Key"] = apiKey;
  return result;
}

function parseEvent(frame: string): AgentEvent | null {
  const event = frame.match(/^event:\s*(.+)\r?$/m)?.[1]?.trim();
  const data = frame.match(/^data:\s*(.+)\r?$/m)?.[1];
  if (!event || !data) return null;
  try {
    return { event, data: JSON.parse(data) as Record<string, any> };
  } catch {
    return null;
  }
}

function addMessage(target: HTMLElement, kind: "user" | "agent" | "status" | "error", text: string): void {
  const item = document.createElement("div");
  item.className = `a2learn-agent-message ${kind}`;
  target.appendChild(item);
  target.scrollTop = target.scrollHeight;
  if (kind !== "user" && kind !== "agent") {
    item.textContent = text;
    return;
  }
  // renderMarkdown uses markdown-it followed by DOMPurify sanitization. Keep a
  // text fallback so a renderer failure never hides an Agent response.
  item.textContent = text;
  void renderMarkdown(text).then((html) => {
    item.innerHTML = html;
    target.scrollTop = target.scrollHeight;
  }).catch(() => undefined);
}

export function mountFloatingAgent(options: FloatingAgentOptions): FloatingAgentController {
  if (document.getElementById("a2learn-floating-agent")) {
    return { onLanguageChanged: () => undefined, ask: () => undefined };
  }

  const root = document.createElement("div");
  root.id = "a2learn-floating-agent";
  root.innerHTML = `
    <section class="a2learn-agent-panel" aria-label="学习 Agent">
      <header class="a2learn-agent-head"><span class="a2learn-agent-title"></span><span class="a2learn-agent-actions"><button class="a2learn-agent-new a2learn-agent-text-button" type="button"></button><button class="a2learn-agent-recent-toggle a2learn-agent-text-button" type="button"></button><button class="a2learn-agent-history-toggle a2learn-agent-text-button" type="button"></button><button class="a2learn-agent-close" type="button">×</button></span></header>
      <div class="a2learn-agent-target"><span class="a2learn-agent-target-label"></span><button class="a2learn-agent-pick a2learn-agent-text-button" type="button"></button></div>
      <div class="a2learn-agent-intent"><button class="a2learn-agent-intent-button" data-agent-mode="ask" type="button"></button><button class="a2learn-agent-intent-button" data-agent-mode="edit" type="button"></button></div>
      <div class="a2learn-agent-mode"><button class="a2learn-agent-mode-button" data-approval-mode="direct" type="button"></button><button class="a2learn-agent-mode-button" data-approval-mode="review" type="button"></button></div>
      <form class="a2learn-agent-create"><input class="a2learn-agent-create-input" /><button class="a2learn-agent-create-submit" type="submit"></button></form>
      <div class="a2learn-agent-recents"></div>
      <div class="a2learn-agent-history"></div>
      <section class="a2learn-agent-review"><p class="a2learn-agent-review-question"></p><div class="a2learn-agent-review-options"></div><form class="a2learn-agent-review-form"><input class="a2learn-agent-review-input" /><button class="a2learn-agent-text-button" type="submit"></button></form></section>
      <div class="a2learn-agent-events" aria-live="polite"></div>
      <form class="a2learn-agent-form"><textarea class="a2learn-agent-input"></textarea><button class="a2learn-agent-send" type="submit"></button></form>
    </section>
    <button class="a2learn-agent-launcher" type="button"></button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector<HTMLElement>(".a2learn-agent-panel")!;
  const launcher = root.querySelector<HTMLButtonElement>(".a2learn-agent-launcher")!;
  const close = root.querySelector<HTMLButtonElement>(".a2learn-agent-close")!;
  const title = root.querySelector<HTMLElement>(".a2learn-agent-title")!;
  const newProject = root.querySelector<HTMLButtonElement>(".a2learn-agent-new")!;
  const recentToggle = root.querySelector<HTMLButtonElement>(".a2learn-agent-recent-toggle")!;
  const historyToggle = root.querySelector<HTMLButtonElement>(".a2learn-agent-history-toggle")!;
  const targetLabel = root.querySelector<HTMLElement>(".a2learn-agent-target-label")!;
  const intentButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".a2learn-agent-intent-button"));
  const approvalModes = root.querySelector<HTMLElement>(".a2learn-agent-mode")!;
  const pick = root.querySelector<HTMLButtonElement>(".a2learn-agent-pick")!;
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>(".a2learn-agent-mode-button"));
  const createForm = root.querySelector<HTMLFormElement>(".a2learn-agent-create")!;
  const createInput = root.querySelector<HTMLInputElement>(".a2learn-agent-create-input")!;
  const createSubmit = root.querySelector<HTMLButtonElement>(".a2learn-agent-create-submit")!;
  const recents = root.querySelector<HTMLElement>(".a2learn-agent-recents")!;
  const history = root.querySelector<HTMLElement>(".a2learn-agent-history")!;
  const review = root.querySelector<HTMLElement>(".a2learn-agent-review")!;
  const reviewQuestion = root.querySelector<HTMLElement>(".a2learn-agent-review-question")!;
  const reviewOptions = root.querySelector<HTMLElement>(".a2learn-agent-review-options")!;
  const reviewForm = root.querySelector<HTMLFormElement>(".a2learn-agent-review-form")!;
  const reviewInput = root.querySelector<HTMLInputElement>(".a2learn-agent-review-input")!;
  const reviewSubmit = reviewForm.querySelector<HTMLButtonElement>("button")!;
  const events = root.querySelector<HTMLElement>(".a2learn-agent-events")!;
  const form = root.querySelector<HTMLFormElement>(".a2learn-agent-form")!;
  const input = root.querySelector<HTMLTextAreaElement>(".a2learn-agent-input")!;
  const send = root.querySelector<HTMLButtonElement>(".a2learn-agent-send")!;
  let threadId = "";
  let selectedComponentId: string | null = null;
  let waitingForHumanInput = false;
  let agentMode: "ask" | "edit" = "ask";
  let approvalMode: "direct" | "review" = "direct";
  let pageEpoch = 0;

  const text = (zh: string, en: string) => options.getLanguage() === "en" ? en : zh;

  const updateLabels = () => {
    const english = options.getLanguage() === "en";
    const isQuestionMode = agentMode === "ask";
    launcher.textContent = isQuestionMode
      ? (english ? "✦ Ask about case" : "✦ 案例问答")
      : (english ? "✦ Edit case" : "✦ 修改案例");
    title.textContent = isQuestionMode
      ? (english ? "Learning Q&A" : "学习问答")
      : (english ? "Page Editor Agent" : "页面编辑 Agent");
    input.placeholder = isQuestionMode
      ? (english ? "For example: Why does this approach avoid collisions?" : "例如：这个方法为什么能避免冲突？")
      : (english ? "For example: Make this case title more concise" : "例如：把这个案例的标题改得更简洁");
    input.setAttribute("aria-label", isQuestionMode
      ? (english ? "Question for the learning assistant" : "向学习助手提问")
      : (english ? "Instruction for page editor Agent" : "给页面编辑 Agent 的指令"));
    send.textContent = english ? "Send" : "发送";
    close.setAttribute("aria-label", english ? "Close" : "关闭");
    newProject.textContent = english ? "New" : "新建";
    recentToggle.textContent = english ? "Recent" : "最近";
    historyToggle.textContent = english ? "History" : "历史";
    pick.textContent = english ? "Select" : "选择组件";
    createInput.placeholder = english ? "Page title" : "页面标题";
    createSubmit.textContent = english ? "Create" : "创建";
    reviewInput.placeholder = english ? "Or write a different direction" : "或输入其他修改方向";
    reviewSubmit.textContent = english ? "Reply" : "回复";
    intentButtons.forEach((button) => {
      const mode = button.dataset.agentMode === "edit" ? "edit" : "ask";
      button.textContent = mode === "ask" ? (english ? "Ask" : "问答") : (english ? "Edit" : "编辑");
      button.classList.toggle("active", agentMode === mode);
    });
    approvalModes.hidden = isQuestionMode;
    modeButtons.forEach((button) => {
      const mode = button.dataset.approvalMode === "review" ? "review" : "direct";
      button.textContent = mode === "review"
        ? (english ? "Review first" : "先给方案")
        : (english ? "Direct" : "直接修改");
      button.classList.toggle("active", approvalMode === mode);
    });
    targetLabel.textContent = selectedComponentId
      ? `${english ? "Selected" : "已选择"}: ${selectedComponentId}`
      : (english ? "Target: current page" : "目标：当前页面");
  };
  updateLabels();

  launcher.addEventListener("click", () => {
    updateLabels();
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  });
  close.addEventListener("click", () => panel.classList.remove("open"));
  newProject.addEventListener("click", () => {
    createForm.classList.toggle("open");
    if (createForm.classList.contains("open")) createInput.focus();
  });
  const ensureProject = async (projectId: string, apiBaseUrl: string) => {
    const exampleId = projectId.match(/^example-(?:zh|en)-(.+)$/)?.[1];
    const ensure = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/ensure-example`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: document.documentElement.lang === "en" ? "en" : "zh",
        exampleId,
        actor: "human",
      }),
    });
    // Generated projects are already created but are not bundled examples;
    // their ensure call returns 422 and the following project call is valid.
    if (!ensure.ok && ensure.status !== 404 && ensure.status !== 409 && ensure.status !== 422) {
      throw new Error(text(`案例初始化失败 (${ensure.status})`, `Case initialization failed (${ensure.status})`));
    }
  };
  const renderRecents = () => {
    const projects = options.recentProjects();
    recents.replaceChildren();
    if (projects.length === 0) {
      const empty = document.createElement("span");
      empty.className = "a2learn-agent-recents-empty";
      empty.textContent = text("还没有最近页面", "No recent pages");
      recents.appendChild(empty);
      return;
    }
    projects.forEach((project) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "a2learn-agent-recent";
      const projectTitle = document.createElement("span");
      projectTitle.textContent = project.title;
      const time = document.createElement("span");
      time.className = "a2learn-agent-recent-time";
      time.textContent = new Date(project.openedAt).toLocaleDateString(options.getLanguage() === "en" ? "en" : "zh-CN");
      button.append(projectTitle, time);
      button.addEventListener("click", async () => {
        try {
          await options.onOpenProject(project);
          recents.classList.remove("open");
          selectedComponentId = null;
          threadId = "";
          updateLabels();
        } catch (error) {
          addMessage(events, "error", error instanceof Error ? error.message : String(error));
        }
      });
      recents.appendChild(button);
    });
  };
  recentToggle.addEventListener("click", () => {
    renderRecents();
    recents.classList.toggle("open");
  });
  const restoreChange = async (change: HistoryChange) => {
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId || !apiBaseUrl) {
      throw new Error(text("未配置可恢复的项目。", "No restorable project is configured."));
    }
    const confirmed = window.confirm(text("恢复到这次修改之前的页面状态？", "Restore the page to this earlier state?"));
    if (!confirmed) return;
    const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/restore`, {
      method: "POST",
      headers: headers(options.getApiKey(), true),
      body: JSON.stringify({ documentId: change.documentId, revision: change.revision, actor: "human" }),
    });
    if (!response.ok) throw new Error(text(`恢复失败 (${response.status})`, `Restore failed (${response.status})`));
    const payload = await response.json() as { sync?: AgentSync };
    const processor = options.getProcessor();
    if (!processor || !Array.isArray(payload.sync?.messages)) {
      throw new Error(text("恢复响应无效", "Invalid restore response"));
    }
    processor.processMessages(payload.sync.messages);
    options.render();
    addMessage(events, "status", text("已恢复页面状态。", "The page has been restored."));
  };
  const renderHistory = async () => {
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId || !apiBaseUrl) throw new Error(text("未配置编辑 API 服务。", "The editing API is not configured."));
    const query = new URLSearchParams({ surfaceId: options.getSurfaceId() });
    const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/history?${query}`, {
      headers: headers(options.getApiKey()),
    });
    if (!response.ok) throw new Error(text(`加载历史失败 (${response.status})`, `Could not load history (${response.status})`));
    const payload = await response.json() as { changes?: HistoryChange[] };
    if (!Array.isArray(payload.changes)) throw new Error(text("历史数据无效", "Invalid history data"));
    history.replaceChildren();
    if (payload.changes.length === 0) {
      const empty = document.createElement("span");
      empty.className = "a2learn-agent-recents-empty";
      empty.textContent = text("当前页面还没有历史记录", "This page has no history yet");
      history.appendChild(empty);
      return;
    }
    payload.changes.slice().reverse().forEach((change) => {
      const entry = document.createElement("div");
      entry.className = "a2learn-agent-history-entry";
      const summary = document.createElement("span");
      summary.className = "a2learn-agent-history-summary";
      summary.textContent = change.summary || text("页面更新", "Page update");
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "a2learn-agent-text-button";
      restore.textContent = text("恢复", "Restore");
      restore.title = new Date(change.createdAt).toLocaleString(options.getLanguage() === "en" ? "en" : "zh-CN");
      restore.addEventListener("click", async () => {
        try {
          await restoreChange(change);
          await renderHistory();
        } catch (error) {
          addMessage(events, "error", error instanceof Error ? error.message : String(error));
        }
      });
      entry.append(summary, restore);
      history.appendChild(entry);
    });
  };
  historyToggle.addEventListener("click", async () => {
    try {
      await renderHistory();
      history.classList.toggle("open");
    } catch (error) {
      addMessage(events, "error", error instanceof Error ? error.message : String(error));
    }
  });
  pick.addEventListener("click", async () => {
    pick.disabled = true;
    pick.textContent = text("请点击页面组件…", "Click a page component…");
    const componentId = await options.pickComponent();
    selectedComponentId = componentId;
    pick.disabled = false;
    updateLabels();
  });

  intentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (waitingForHumanInput) return;
      const nextMode = button.dataset.agentMode === "edit" ? "edit" : "ask";
      if (nextMode === agentMode) return;
      // Q&A and edit have different tool permissions. A thread therefore
      // belongs to exactly one mode and is never reused across that boundary.
      agentMode = nextMode;
      threadId = "";
      clearReview();
      updateLabels();
      input.focus();
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (waitingForHumanInput) return;
      const nextMode = button.dataset.approvalMode === "review" ? "review" : "direct";
      if (nextMode !== approvalMode) threadId = "";
      approvalMode = nextMode;
      updateLabels();
    });
  });

  const setComposerDisabled = (disabled: boolean) => {
    input.disabled = disabled;
    send.disabled = disabled;
    intentButtons.forEach((button) => { button.disabled = disabled; });
    modeButtons.forEach((button) => { button.disabled = disabled; });
  };

  const clearReview = () => {
    waitingForHumanInput = false;
    review.classList.remove("open");
    reviewQuestion.textContent = "";
    reviewOptions.replaceChildren();
    reviewInput.value = "";
  };

  const consumeAgentStream = async (
    response: Response,
    onHumanInput: (data: Record<string, any>) => void,
    requestEpoch: number,
  ) => {
    if (!response.ok || !response.body) throw new Error(`Agent 请求失败 (${response.status})`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const agentEvent = parseEvent(frame);
        if (!agentEvent) continue;
        // The old page can finish its server-side edit after a language/project
        // switch. Its A2UI sync must never be applied to the new renderer.
        if (requestEpoch !== pageEpoch) continue;
        if (agentEvent.event === "tool_end") {
          const result = agentEvent.data.result;
          const processor = options.getProcessor();
          if (result?.ok && Array.isArray(result?.sync?.messages) && processor) {
            processor.processMessages(result.sync.messages as A2uiMessage[]);
            options.render();
            addMessage(events, "status", text("当前案例已更新。", "The case has been updated."));
          } else if (!result?.ok) {
            const code = String(result?.error || text("页面更新失败", "Page update failed"));
            const detail = typeof result?.detail === "string" && result.detail ? `: ${result.detail}` : "";
            addMessage(events, "error", `${code}${detail}`);
          }
        }
        if (agentEvent.event === "human_input_required") onHumanInput(agentEvent.data);
        if (agentEvent.event === "assistant_message") addMessage(events, "agent", String(agentEvent.data.text || ""));
        if (agentEvent.event === "error") addMessage(events, "error", String(agentEvent.data.message || text("Agent 失败", "Agent failed")));
        if (agentEvent.event === "done" && typeof agentEvent.data.threadId === "string") threadId = agentEvent.data.threadId;
      }
    }
  };

  const resumeWithHumanDecision = async (
    decision: "approve" | "reject" | "respond",
    responseText = "",
  ) => {
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId || !apiBaseUrl || !threadId || (decision === "respond" && !responseText.trim())) return;
    clearReview();
    setComposerDisabled(true);
    const requestEpoch = pageEpoch;
    if (responseText.trim()) addMessage(events, "user", responseText.trim());
    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/agent/resume`, {
        method: "POST",
        headers: headers(options.getApiKey(), true),
        body: JSON.stringify({
          threadId,
          surfaceId: options.getSurfaceId(),
          agentMode,
          approvalMode,
          decision,
          response: responseText.trim() || undefined,
        }),
      });
      if (requestEpoch !== pageEpoch) return;
      addMessage(events, "status", text("正在按你的选择继续…", "Continuing with your choice…"));
      await consumeAgentStream(response, showHumanInput, requestEpoch);
    } catch (error) {
      if (requestEpoch === pageEpoch) {
        addMessage(events, "error", error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (requestEpoch === pageEpoch && !waitingForHumanInput) {
        setComposerDisabled(false);
        input.focus();
      }
    }
  };

  const showHumanInput = (data: Record<string, any>) => {
    if (typeof data.threadId === "string") threadId = data.threadId;
    const question = typeof data.question === "string" ? data.question : text("Agent 需要你的确认。", "The Agent needs your confirmation.");
    const proposal = data.kind === "approval";
    const choices = Array.isArray(data.options) ? data.options.filter((option): option is string => typeof option === "string" && Boolean(option)) : [];
    waitingForHumanInput = true;
    reviewQuestion.textContent = question;
    reviewOptions.replaceChildren();
    const addChoice = (label: string, decision: "approve" | "reject" | "respond", response = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "a2learn-agent-review-option";
      button.textContent = label;
      button.addEventListener("click", () => void resumeWithHumanDecision(decision, response));
      reviewOptions.appendChild(button);
    };
    if (proposal) {
      addChoice(text("确认修改", "Confirm edit"), "approve");
      addChoice(text("拒绝", "Reject"), "reject", text("请不要执行这项修改。", "Do not make this change."));
      reviewInput.placeholder = text("说明希望怎样调整方案", "Explain how the proposal should change");
      reviewSubmit.textContent = text("发送反馈", "Send feedback");
    } else {
      choices.forEach((choice) => addChoice(choice, "respond", choice));
      reviewInput.placeholder = text("或输入其他修改方向", "Or write a different direction");
      reviewSubmit.textContent = text("回复", "Reply");
    }
    review.classList.add("open");
    addMessage(events, "status", proposal
      ? text("Agent 已给出方案，等待你的确认。", "The Agent proposed an edit and is waiting for confirmation.")
      : text("Agent 暂停，等待你的选择。", "The Agent is paused for your choice."));
    reviewInput.focus();
  };

  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void resumeWithHumanDecision("reject", reviewInput.value);
  });

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pageTitle = createInput.value.trim() || text("未命名页面", "Untitled page");
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!apiBaseUrl) {
      addMessage(events, "error", text("未配置编辑 API 服务。", "The editing API is not configured."));
      return;
    }
    const projectId = `project-${crypto.randomUUID()}`;
    const surfaceId = "main";
    createInput.disabled = true;
    createSubmit.disabled = true;
    try {
      const created = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: headers(options.getApiKey(), true),
        body: JSON.stringify({
          projectId,
          source: "generated",
          actor: "human",
          documents: [{
            documentId: `${projectId}:${surfaceId}`,
            revision: 1,
            surfaceId,
            catalogId: "https://a2learn.ai/spec/v1/catalog.json",
            components: [
              { id: "root", component: "Column", props: { children: ["title"] } },
              { id: "title", component: "Text", props: { variant: "h1", text: pageTitle } },
            ],
            data: {},
          }],
        }),
      });
      if (!created.ok) throw new Error(text(`创建页面失败 (${created.status})`, `Could not create the page (${created.status})`));
      const snapshot = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/a2ui`, { headers: headers(options.getApiKey()) });
      if (!snapshot.ok) throw new Error(text(`加载页面失败 (${snapshot.status})`, `Could not load the page (${snapshot.status})`));
      const payload = await snapshot.json() as { messages?: A2uiMessage[] };
      if (!Array.isArray(payload.messages)) throw new Error(text("页面数据无效", "Invalid page data"));
      threadId = "";
      selectedComponentId = null;
      createInput.value = "";
      createForm.classList.remove("open");
      options.onProjectCreated(projectId, pageTitle, payload.messages);
      updateLabels();
      addMessage(events, "status", text("已创建空白页面。", "A blank page has been created."));
    } catch (error) {
      addMessage(events, "error", error instanceof Error ? error.message : String(error));
    } finally {
      createInput.disabled = false;
      createSubmit.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (waitingForHumanInput) return;
    const message = input.value.trim();
    if (!message) return;
    const projectId = options.getProjectId();
    const apiBaseUrl = options.getApiBaseUrl().replace(/\/+$/, "");
    if (!projectId) {
      addMessage(events, "error", text("请先选择一个案例。", "Select a case first."));
      return;
    }
    if (!apiBaseUrl) {
      addMessage(events, "error", text("未配置编辑 API 服务。", "The editing API is not configured."));
      return;
    }
    addMessage(events, "user", message);
    input.value = "";
    setComposerDisabled(true);
    const requestEpoch = pageEpoch;
    try {
      await ensureProject(projectId, apiBaseUrl);
      const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/agent`, {
        method: "POST",
        headers: headers(options.getApiKey(), true),
        body: JSON.stringify({
          message,
          threadId: threadId || undefined,
          surfaceId: options.getSurfaceId(),
          componentId: selectedComponentId || undefined,
          agentMode,
          approvalMode,
        }),
      });
      if (requestEpoch !== pageEpoch) return;
      addMessage(events, "status", agentMode === "ask"
        ? text("学习助手正在阅读当前案例…", "The learning assistant is reading this case…")
        : text("Agent 正在修改当前案例…", "The Agent is editing this case…"));
      await consumeAgentStream(response, showHumanInput, requestEpoch);
    } catch (error) {
      if (requestEpoch === pageEpoch) {
        addMessage(events, "error", error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (requestEpoch === pageEpoch && !waitingForHumanInput) {
        setComposerDisabled(false);
        input.focus();
      }
    }
  });

  return {
    ask: (question: string) => {
      if (!question.trim() || waitingForHumanInput) return;
      agentMode = "ask";
      approvalMode = "direct";
      updateLabels();
      panel.classList.add("open");
      input.value = question.trim();
      form.requestSubmit();
    },
    onLanguageChanged: () => {
      // A language-specific example points to a different PageDocument. Do
      // not carry its conversation target or LangGraph thread into the next
      // document, even if both rendered components happen to share an id.
      threadId = "";
      selectedComponentId = null;
      agentMode = "ask";
      approvalMode = "direct";
      pageEpoch += 1;
      clearReview();
      setComposerDisabled(false);
      createForm.classList.remove("open");
      recents.classList.remove("open");
      history.classList.remove("open");
      updateLabels();
    },
  };
}
