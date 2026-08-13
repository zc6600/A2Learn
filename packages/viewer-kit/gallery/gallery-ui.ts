import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/lit/v0_9";
import { a2learnCatalog } from "../../a2learn-catalog";
import { renderAppFrame, showState } from "../page-shell";
import {
  DemoItem,
  getComponentGalleryItems,
} from "./component-gallery";
import "../markdown-surface";

/**
 * 注入 Gallery 模式特有的布局样式
 */
function injectGalleryStyles(): void { }

/**
 * 渲染 Gallery 列表和预览区域
 */
function renderGalleryItems(
  items: DemoItem[],
  nav: HTMLElement,
  preview: HTMLElement,
): void {
  let activeIndex = 0;
  let processor: MessageProcessor<any>;

  const mockAgentHandler = (action: any) => {
    console.log("Mock Agent received action:", action);

    // ======== Mock Agent - Cross Component Coordination ========
    if (action.name === "sandbox_status_change") {
      if (action.context.status === "success") {
        console.log("Sandbox success -> Unlocking LearningPath Step 2");
        processor.processMessages([{
          version: "v0.9",
          updateComponents: {
            surfaceId: action.surfaceId,
            components: [{
              id: "learning-path",
              component: "LearningPath",
              direction: "horizontal",
              steps: [
                { id: "1", title: "认识 Promise", status: "completed" },
                { id: "2", title: "手写 delay", status: "current" },
                { id: "3", title: "解锁成就", status: "locked" }
              ]
            }]
          }
        }]);
      }
    } else if (action.name === "oj_status_change") {
      if (action.context.status === "accepted") {
        console.log("OJ Accepted -> Unlocking LearningPath Step 3.");
        processor.processMessages([{
          version: "v0.9",
          updateComponents: {
            surfaceId: action.surfaceId,
            components: [
              {
                id: "root",
                component: "Column",
                children: ["header", "learning-path", "intro-text", "concept", "sandbox", "oj", "resources"]
              },
              {
                id: "learning-path",
                component: "LearningPath",
                direction: "horizontal",
                steps: [
                  { id: "1", title: "认识 Promise", status: "completed" },
                  { id: "2", title: "手写 delay", status: "completed" },
                  { id: "3", title: "解锁成就", status: "completed" }
                ]
              }
            ]
          }
        }]);
      }
    }
    // ======== Mock Agent - Non-Linear Routing (LearningPath) ========
    else if (action.name === "navigate_section" || action.name === "learning_path_select") {
      const sectionId = action.context.sectionId || action.context.stepId;
      console.log(`Navigating to section: ${sectionId}`);

      let newContent = [];
      let activeSteps = [
        { id: "intro", title: "1. Grid 基础概念", description: "什么是网格容器、网格线和轨道" },
        { id: "template", title: "2. 定义网格模板", description: "学习使用 grid-template-columns 等属性" },
        { id: "placement", title: "3. 放置网格项", description: "跨越行和列的高级布局技巧" },
        { id: "challenge", title: "4. 终极实战挑战", description: "使用 Grid 还原复杂仪表盘 UI" }
      ];

      if (sectionId === "template") {
        newContent = [
          {
            id: "content-area",
            component: "Column",
            children: ["content-title", "sandbox"]
          },
          {
            id: "content-title",
            component: "Text",
            variant: "h2",
            text: "第二章：定义网格模板"
          },
          {
            id: "sandbox",
            component: "InteractiveSandbox",
            title: "动手尝试 grid-template",
            description: "你可以改变 <code>grid-template-columns</code> 的值，比如改成 <code>1fr 2fr 1fr</code>。",
            language: "css",
            code: ".container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 10px;\n}",
            status: "idle",
            runLocally: false
          }
        ];
      } else if (sectionId === "placement") {
        newContent = [
          {
            id: "content-area",
            component: "Column",
            children: ["content-title", "quiz"]
          },
          {
            id: "content-title",
            component: "Text",
            variant: "h2",
            text: "第三章：放置网格项"
          },
          {
            id: "quiz",
            component: "QuizCard",
            question: "要让一个元素跨越从第 1 条网格线到第 3 条网格线，正确的 CSS 属性是？",
            options: [
              "grid-column: 1 / span 3;",
              "grid-column: 1 / 3;",
              "grid-area: 1 / 3;"
            ],
            correctIndex: 1,
            status: "idle"
          }
        ];
      } else {
        // Default back to intro
        newContent = [
          {
            id: "content-area",
            component: "Column",
            children: ["content-title", "concept"]
          },
          {
            id: "content-title",
            component: "Text",
            variant: "h2",
            text: "第一章：Grid 基础概念"
          },
          {
            id: "concept",
            component: "ConceptCard",
            title: "网格容器 (Grid Container)",
            tags: ["CSS", "Layout"],
            definition: "将元素的 <code>display</code> 属性设置为 <code>grid</code> 或 <code>inline-grid</code> 后，它就成了一个网格容器。",
            example: "<pre><code>.container {\n  display: grid;\n}</code></pre>"
          }
        ];
      }

      processor.processMessages([{
        version: "v0.9",
        updateComponents: {
          surfaceId: action.surfaceId,
          components: [
            {
              id: "navigator",
              component: "LearningPath",
              title: "CSS Grid 交互式学习路径",
              activeStepId: sectionId,
              onStepSelect: { name: "learning_path_select", context: {} },
              steps: activeSteps
            },
            ...newContent
          ]
        }
      }]);
    }
    // ======== Mock Agent - Conversational UI (InteractiveDialog) ========
    else if (action.name === "send_chat_message") {
      const userText = action.context.text;
      console.log(`Received chat message: ${userText}`);

      // 1. First, append user's message and set typing state
      const currentMessages = processor.model.getComponent("site-conversational", "mentor-dialog")?.props.messages || [];
      processor.processMessages([{
        version: "v0.9",
        updateComponents: {
          surfaceId: action.surfaceId,
          components: [
            {
              id: "mentor-dialog",
              component: "InteractiveDialog",
              messages: [...currentMessages, { role: "user", content: userText }],
              isTyping: true
            }
          ]
        }
      }]);

      // 2. Simulate Agent thinking and responding after 1.5 seconds
      setTimeout(() => {
        processor.processMessages([{
          version: "v0.9",
          updateComponents: {
            surfaceId: action.surfaceId,
            components: [
              {
                id: "mentor-dialog",
                component: "InteractiveDialog",
                messages: [
                  ...currentMessages,
                  { role: "user", content: userText },
                  { role: "mentor", content: "这是一个非常好的问题！\n右下角的沙盒之所以会输出三次 <code>3</code>，是因为 <code>var</code> 声明的 <code>i</code> 是函数作用域，三个 <code>setTimeout</code> 里的闭包共享了同一个 <code>i</code>。\n\n**你可以试着把沙盒里的 `var` 改成 `let` 再运行一次看看！**" }
                ],
                isTyping: false
              }
            ]
          }
        }]);
      }, 1500);
    }
    // ======== Legacy Mock Agent endpoints (For server-side execution tests) ========
    else if (action.name === "run_sandbox_code") {
      processor.processMessages([{
        version: "v0.9",
        updateComponents: {
          surfaceId: action.surfaceId,
          components: [{
            id: action.sourceComponentId,
            component: "InteractiveSandbox",
            status: "running"
          }]
        }
      }]);

      setTimeout(() => {
        processor.processMessages([{
          version: "v0.9",
          updateComponents: {
            surfaceId: action.surfaceId,
            components: [{
              id: action.sourceComponentId,
              component: "InteractiveSandbox",
              status: "success",
              output: "Mock Agent executed your code:\\n" + action.context.code
            }]
          }
        }]);
      }, 1000);
    } else if (action.name === "submit_oj_code") {
      processor.processMessages([{
        version: "v0.9",
        updateComponents: {
          surfaceId: action.surfaceId,
          components: [{
            id: action.sourceComponentId,
            component: "OnlineJudge",
            status: "running"
          }]
        }
      }]);

      setTimeout(() => {
        processor.processMessages([{
          version: "v0.9",
          updateComponents: {
            surfaceId: action.surfaceId,
            components: [{
              id: action.sourceComponentId,
              component: "OnlineJudge",
              status: "wrong_answer",
              consoleOutput: "AssertionError: expected 0 to deeply equal 5\\n    at Object.runTest (test.js:12:3)\\n\\n(This is a simulated response from Gallery Mock Agent)",
              testCases: [
                { input: "n = 0", expectedOutput: "0", actualOutput: "0", status: "passed" },
                { input: "n = 5", expectedOutput: "5", actualOutput: "0", status: "failed" },
                { input: "n = 10", expectedOutput: "55", status: "pending" }
              ]
            }]
          }
        }]);
      }, 1500);
    } else if (action.name === "submit_quiz") {
      const isCorrect = action.context.selectedIndex === 1; // e.g. option 1 is correct
      processor.processMessages([{
        version: "v0.9",
        updateComponents: {
          surfaceId: action.surfaceId,
          components: [{
            id: action.sourceComponentId,
            component: "QuizCard",
            status: isCorrect ? "correct" : "incorrect",
            selectedIndex: action.context.selectedIndex,
            explanation: isCorrect
              ? "<b>回答正确！</b><br>你做出了完美的选择。(Mock Agent Response)"
              : "<b>回答错误。</b><br>请仔细思考再试一次。(Mock Agent Response)"
          }]
        }
      }]);
    }
  };

  const selectItem = (index: number) => {
    activeIndex = index;
    processor = new MessageProcessor([basicCatalog, a2learnCatalog], mockAgentHandler);
    const item = items[activeIndex];
    processor.processMessages(item.messages as unknown as A2uiMessage[]);
    const surface = processor.model.getSurface(item.id);

    preview.innerHTML = `
      <div class="gallery-preview-header">
        <h2 class="gallery-preview-title">${item.title}</h2>
        <p class="gallery-preview-desc">${item.description}</p>
      </div>
      <div class="gallery-surface"></div>
    `;
    const surfaceContainer = preview.querySelector(".gallery-surface");
    if (surfaceContainer && surface) {
      const el = document.createElement("a2learn-markdown-surface") as any;
      el.surface = surface;
      surfaceContainer.appendChild(el);
    }

    nav.querySelectorAll(".gallery-item").forEach((el) => {
      const elIndex = Number((el as HTMLElement).dataset.index);
      el.classList.toggle("active", elIndex === activeIndex);
    });
  };

  const categories = {
    websites: items.filter((item) => item.category === "website"),
    computer: items.filter((item) => item.category === "computer"),
    components: items.filter((item) => item.category === "component"),
    courses: items.filter((item) => item.category === "course"),
  };

  let navHtml = "";

  const renderCategory = (
    categoryItems: DemoItem[],
    title: string,
    marginTop = 8,
  ) => {
    if (categoryItems.length === 0) return "";
    let html = `<div class="gallery-category-title" style="margin: ${marginTop}px 8px 8px; font-size: 12px; font-weight: bold; color: var(--app-muted); text-transform: uppercase;">${title}</div>`;
    html += categoryItems.map((item) => {
      const originalIndex = items.indexOf(item);
      return `
      <button class="gallery-item" data-index="${originalIndex}">
        <p class="gallery-item-title">${item.title}</p>
        <p class="gallery-item-file">${item.filename}</p>
      </button>`;
    }).join("");
    return html;
  };

  navHtml += renderCategory(categories.websites, "🚀 Website 示例", 8);
  navHtml += renderCategory(categories.computer, "💻 Computer 示例", 16);
  navHtml += renderCategory(categories.components, "🧩 Component 示例", 16);
  navHtml += renderCategory(categories.courses, "📚 Course 示例", 16);

  nav.innerHTML = navHtml;

  nav.querySelectorAll<HTMLButtonElement>(".gallery-item").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index || "0");
      selectItem(index);
    });
  });

  selectItem(0);
}

/**
 * 启动 Gallery 模式
 */
export function bootstrapGallery(root: HTMLElement) {
  injectGalleryStyles();
  renderAppFrame(
    root,
    "A2Learn Gallery",
    "按 Component / Website / Course 三层分类展示 A2UI 示例，用于交互页面选型与预览。",
    `<section class="gallery-layout">
      <aside id="gallery-nav" class="gallery-nav"></aside>
      <section id="gallery-preview" class="gallery-preview">
        <p class="viewer-state loading">组件示例加载中，请稍候...</p>
      </section>
    </section>`,
  );

  const nav = document.getElementById("gallery-nav");
  const preview = document.getElementById("gallery-preview");
  if (!nav || !preview) {
    return;
  }

  const items = getComponentGalleryItems(a2learnCatalog.id);
  if (items.length === 0) {
    showState(preview, "未发现可用组件示例，请检查 A2UI 示例文件路径。", "error");
    return;
  }

  renderGalleryItems(items, nav, preview);
}
