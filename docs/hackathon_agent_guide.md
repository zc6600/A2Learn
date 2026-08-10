# 📖 A2Learn · 让一本书活起来：Agent 交互使用指南

> **黑客松主题**：如何突破传统书本纸张与纯文本对话的局限，利用 **AI Agent + A2UI (Agent-to-User Interface)** 动态交互技术，让一本经典古籍、硬核教材或学术名著“真正活起来”？

---

## 💡 一、 核心理念：从“单向阅读”到“多维交互空间”

传统的书籍阅读往往存在三大痛点：
1. **线性枯燥**：大段文字缺乏时空与结构感，读者容易迷失在字里行间。
2. **理解断层**：生僻典故、专业公式与抽象概念缺乏即时具象化的反馈。
3. **缺乏共鸣**：读者是旁观者，无法与书中的人物、思想产生沉浸式互动。

在 **A2Learn** 体系中，AI Agent 不再仅仅是一个在右侧聊天框打字的“文字助手”，而是拥有**教学设计能力与 UI 渲染权力的“空间营造师”**。Agent 能直接调度丰富的交互组件，将整本书编排成一个支持**时空漫游、情境对话、意象配对与动态沙盒**的探索式网页。

```
                    ┌────────────────────────┐
                    │   静态书本 / 章节文献   │
                    └───────────┬────────────┘
                                │ Agent 深度理解与结构化拆解
                                ▼
                    ┌────────────────────────┐
                    │    A2Learn AI Agent    │
                    │ (教学设计 + 交互架构)  │
                    └───────────┬────────────┘
                                │ 编译为标准 A2UI 消息流
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    A2Learn 动态互动剧场                         │
│  • 时空轴漫游 (Timeline)         • 跨时空书信 (ScenarioDialogue)│
│  • 互动词注 (DetailedExplanation)• 意象连线 (DragAndDropMatch)  │
│  • 认知探索 (LearningPath)       • 探究深挖 (DeepDivePrompt)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 二、 Agent 的三种使用方式

根据不同使用场景，A2Learn 提供了三种 Agent 接入形态：

### 方式 1：Web 端沉浸式伴读（面向大众读者与评委：0 门槛）

**适合场景**：直接在浏览器中体验书本活化，无需配置复杂开发环境。

1. 打开 A2Learn 前端主页：`https://a2learn.zc6600.wiki`
2. **上传书籍资料**：点击输入框右侧的 **「📚 上传资料」**，上传任意书籍章节、PDF、TXT 或 Markdown 文本。
3. **输入活化指令**：
   - 示例指令：*“请将《春江花月夜》活化为一堂沉浸式互动文学课，重点展现月行轨迹与两地相思。”*
4. **多模态探索**：
   - 页面实时渲染出主题自适应的交互卡片。
   - 点击右下角 **浮动伴读 Agent**，可以随时针对书中的任意段落提问、让 Agent 重新绘制某个组件或生成更深入的练习。

---

### 方式 2：MCP 标准协议接入（面向外部 Agent 生态）

**适合场景**：在 Claude Desktop、Cursor、Cline 或自定义 Agent 框架中，将 A2Learn 作为标准 MCP 工具调用。

1. **配置 MCP 连接**：
   在客户端的 `mcpServers` 配置中添加：
   ```json
   {
     "mcpServers": {
       "a2learn": {
         "url": "https://api.a2learn.zc6600.wiki/mcp"
       }
     }
   }
   ```
2. **Agent 调用工作流**：
   - Agent 自动调用 `get_course_generation_spec` 获取 A2Learn 教学组件规范。
   - Agent 根据书本内容输出符合规范的 `course_json`。
   - Agent 调用 `compile_course_json`，A2Learn 服务端执行确定性校验与编译，输出可渲染的 A2UI 消息流。

---

### 方式 3：Agent Skill / CLI 模式（面向创作者与深度开发者）

**适合场景**：利用本地算力或 CLI 批处理，一键将本地书库转换为交互式课程。

1. **克隆与环境就绪**：
   ```bash
   git clone https://github.com/zc6600/A2Learn.git
   cd A2Learn
   A2LEARN_SKIP_LLM_SETUP=1 bash setup.sh
   ```
2. **调用 A2Learn Skill 编译**：
   在 Codex、Claude Code 或 Antigravity 终端中，直接输入：
   ```bash
   # Agent 编写 outputs/<task_id>/course_content.json 后执行本地转换
   python -m agent.parse_course_content \
     --input "outputs/<task_id>/course_content.json" \
     --output "outputs/<task_id>/site_messages.json" \
     --sync-viewer
   ```
3. **实时预览**：
   ```bash
   npm run viewer:dev
   ```

---

## 🎨 三、 “让一本书活起来”五步法与组件库

Agent 在将书籍活化时，推荐按照以下五个维度进行教学交互设计：

| 活化维度 | 解决的传统痛点 | 推荐使用的 A2UI 组件 | 效果体现 |
| :--- | :--- | :--- | :--- |
| **1. 脉络活化** | 书本情节/发展脉络线性无感 | `Timeline` (journey / vertical) | 将情节化为“月起江天 → 月照万里 → 月落余情”的时空漫游线 |
| **2. 情境活化** | 人物心理与背景隔阂 | `ScenarioDialogue` (correspondence) | 楼上人与江上舟隔江对谈，具象化“相望不相闻”的心境 |
| **3. 细节活化** | 生僻字词与典故查阅打断阅读 | `DetailedExplanation` + `<dfn>` | 原文字词悬浮气泡注解（如“滟滟”、“芳甸”、“捣衣砧”） |
| **4. 认知活化** | 读者缺乏参与，被动接受 | `DragAndDropMatch` / `QuizCard` | 拖拽连线：诗句与“月亮承担的叙事作用”一一对应配对 |
| **5. 探究活化** | 读完即止，缺乏思维延展 | `DeepDivePrompt` / `LearningPath` | 抛出哲学问题（如人生代代与江月年年），引导延伸探究 |

---

## 🚀 四、 经典案例实战：《春江花月夜》

在 A2Learn 的 [poetry-social.json](file:///Users/frank/github_project/A2Learn/packages/a2learn-catalog/examples/Website/poetry-social.json) 中，Agent 成功将张若虚千古名篇活化为立体空间：

1. **第一幕：原文精读与词注**
   - 使用 `DetailedExplanation`，在保留古籍排版的同时，读者鼠标滑过字词即可直接查看“滟滟”、“芳甸”、“霰”的典故释义。
2. **第二幕：月光时空轨迹**
   - 使用 `Timeline (journey)`，将长诗提炼为 6 幕由浅入深的心灵旅程。
3. **第三幕：如果月光能替人传信**
   - 使用 `ScenarioDialogue (correspondence)` 双列书信模式，重现“明月楼·楼上人”与“江上舟·江上人”的隔空对白。
4. **第四幕：意象角色互动**
   - 使用 `DragAndDropMatch` 互动连线，让读者亲自判断“月亮在诗中到底在做什么”。

---

## 📝 五、 Agent 活化 Prompt 模板

你可以直接复制以下 Prompt 给你的 Agent（如 ChatGPT / Claude / DeepSeek），让它为你的一本书生成 A2Learn 课程：

```markdown
你是一名顶级的数字化教学设计师与 A2Learn 空间营造师。
请阅读以下书本章节材料，使用 A2Learn 组件规范将其“活化”为一份立体的互动教学页面：

【书籍主题】：[在此填入书名或章节，例如：《三体》黑暗森林法则 / 《论语》学而篇 / 《微积分简史》]
【核心内容】：[粘贴书本核心段落或大纲]

【活化要求】：
1. 脉络化：使用 Timeline 组件提炼出 4~6 个核心发展阶段或思想转折。
2. 情境化：使用 ScenarioDialogue 设计 2~3 个人物或思想流派的跨时空对话。
3. 交互化：使用 DragAndDropMatch 或 QuizCard 设计 1 个检验深层理解的互动环节。
4. 深度化：使用 DeepDivePrompt 提供 2 个引人深思的延伸课题。
5. 视觉基调：为该书选择最贴合的主题风格（poetry-ink / editorial / ppt-stage / learning-default）。
```

---

## 🏆 六、 比赛评审亮点总结

- **形式创新**：突破了传统 Chatbot 的文字问答，实现了真正的 **Generative UI**。
- **全链路打通**：支持从 **书籍上传 -> Agent 认知拆解 -> A2UI 交互渲染 -> 伴读实时答疑** 的闭环。
- **开放与解耦**：同时支持 Web 端直观体验与标准 MCP / Skill 开发者接入。
