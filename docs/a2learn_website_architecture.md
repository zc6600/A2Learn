# A2Learn 网站构图与场景编排指南 (v1.0)

本文档专注于探讨如何将 A2Learn 的基础组件 (Components) 拼装成具备**教学逻辑、场景沉浸感与互动性**的完整网页 (Webpages/Websites)。

在 A2UI 的理念中，组件是“乐高积木”，而本指南则是“图纸”。我们通过定义几种经典的“构图模式 (Layout Patterns)”，指导 Agent 如何在不同的教学场景下下发组件组合。

---

## 1. 经典构图模式与组件排列

### 1.1 瀑布流互动叙事 (Linear Interactive Waterfall)
这是最常见的基础教学模式，模拟“老师在黑板上一步步写板书并提问”的过程。
- **构图特征**: 自上而下的单列布局 (`Column`)。
- **组件排列公式**:
  1. `ConceptCard` (抛出核心概念)
  2. `AnalogyCard` (打个生动的比方，降低理解门槛)
  3. `CodeSnippet` / `DocumentFigure` (展示硬核的代码或图表证据)
  4. `QuizCard` / `ClozeTest` (立刻进行一次小测验，形成闭环)
  5. `DeepDivePrompt` (提供 2-3 个发散方向供用户点击)
- **适用场景**: 基础概念科普、代码语法讲解、历史事件平铺直叙。

### 1.2 左右分栏“实验室”模式 (Split-Pane Lab)
这种模式极具实战感，左侧是理论指导，右侧是实践操作，非常适合硬核技能的训练。
- **构图特征**: 左右 1:1 或 4:6 分栏布局。
- **组件排列公式**:
  - **左栏 (Theory)**: `LearningPath` (显示当前进度) + `ConceptCard` (讲解当前任务的理论)。
  - **右栏 (Practice)**: `InteractiveSandbox` (全栈代码沙盒) 或 `SmartAnnotationBoard` (作文/代码草稿板)。
- **交互流**: 用户在右栏完成实操，点击提交后，左栏的 Agent 给出反馈，并点亮左栏 `LearningPath` 的下一步。

### 1.3 沉浸式情景剧场 (Immersive Theater)
摒弃传统的说教，通过角色扮演和对话来演绎知识点，极大地降低用户的阅读疲劳。
- **构图特征**: 以对话流为核心的主体布局。
- **组件排列公式**:
  1. `KnowledgeTree` / `Timeline` (在顶部交代故事背景或时间线)
  2. `ScenarioDialogue` (核心：抛出微信群聊式的多人辩论或实战排查演练)
  3. `DeepDivePrompt` (在剧场结尾让用户选择“站队”或“加入讨论”)
- **适用场景**: 技术选型 Trade-off 探讨、历史事件多方博弈、复杂故障排查实战复盘。

### 1.4 非线性探索陈列馆 (Non-linear Exploration)
这种模式适合“字典式”或“百科式”的学习，没有强制的先后顺序，鼓励用户凭借兴趣四处点击。
- **构图特征**: 网格布局 (`Grid` / `Row`)，信息平铺。
- **组件排列公式**:
  1. `SectionNavigator` (顶部的几大核心模块入口)
  2. `KnowledgeTree` (作为中间态的面包屑导航)
  3. 多个 `ConceptCard` (平铺展示)
- **交互流**: 用户的每一次点击（`onConceptClick`）都会让页面“就地展开”新的卡片，而不是跳入下一页。

---

## 2. 网站场景示例 (Website Mapping)

为了让 Agent 能够“抄作业”，我们在 `examples/Website/` 目录下准备了几个完整的、结合了多种组件的页面级 JSON 示例。

### 2.1 异步编程科普课 (JS Async)
🔗 [示例链接](../packages/a2learn-catalog/examples/Website/js-async.json)
- **采用构图**: **瀑布流互动叙事**。
- **编排逻辑**:
  1. 先用 `Text` 抛出“回调地狱”的痛点。
  2. 接着用 `AnalogyCard` 将 Promise 比作“去餐厅拿排队小票”。
  3. 抛出 `CodeSnippet` 展示 Promise 的优雅写法。
  4. 紧跟一个 `ClozeTest` 让用户填空 `async` 和 `await` 关键字。
  5. 最后放一个 `DeepDivePrompt` 收尾。

### 2.2 React 组件设计实验室 (Agent React)
🔗 [示例链接](../packages/a2learn-catalog/examples/Website/agent-react.json)
- **采用构图**: **左右分栏“实验室”模式** 的变体（上下结合沙盒）。
- **编排逻辑**:
  1. 顶部 `LearningPath` 交代今天是“React 组件化实战”的第三步。
  2. 中间抛出 `ConceptCard` 讲解状态提升 (Lifting State Up)。
  3. 核心区放一个巨大的 `InteractiveSandbox`，语言设为 JavaScript，让用户直接跑 React 组件代码。

### 2.3 对话式学习体验 (Conversational)
🔗 [示例链接](../packages/a2learn-catalog/examples/Website/conversational.json)
- **采用构图**: **沉浸式情景剧场**。
- **编排逻辑**:
  1. 直接使用 `ScenarioDialogue` 模拟了一场关于“前端性能优化”的群聊。
  2. 面试官、小白和架构师三人“一台戏”，把虚拟 DOM、重排重绘的概念在聊天中讲透。

### 2.4 自由探索大厅 (Non-linear)
🔗 [示例链接](../packages/a2learn-catalog/examples/Website/non-linear.json)
- **采用构图**: **非线性探索陈列馆**。
- **编排逻辑**:
  1. 顶部是横向的 `SectionNavigator`，供用户在“Web3”、“AI”、“前端”之间切换。
  2. 主体区是 `KnowledgeTree`，展示了网格状的子学科入口。
  3. 这是一个典型的“课程首页”或“百科首页”的样板。

## 3. 实战业务场景编排 (Business Use Cases)

除了基础的构图模式，A2Learn 更强调**端到端的用户体验流转**。以下通过两个最具代表性的真实业务场景，展示 Agent 是如何利用组件库带领用户“打怪升级”的。

### 3.1 场景 A：学术论文导读 (Paper2UI)
**用户意图**：“这篇讲 Attention 机制的论文太难了，全是数学公式和专业术语，请你带着我读懂它。”
**Agent 编排策略**：剥洋葱式的降维打击。

* **Step 1: 建立全局名片 (破冰)**
  - `PaperAbstract` (摘要卡): 展示标题、作者，并用最通俗的语言生成一句话 TLDR（“这篇论文就是说，机器翻译不需要按顺序看词，只需要‘注意’关键的部分”）。
* **Step 2: 梳理前置知识与研究背景 (排雷)**
  - `Timeline` (时间轴): 陈列该领域之前的痛点（RNN 太慢 -> CNN 丢失长距离依赖 -> Attention 横空出世）。
  - `LiteratureReference` (文献卡): 遇到提到的重要前置论文时，就地抛出卡片。
* **Step 3: 核心机制深度解析 (攻坚)**
  - `DocumentFigure` (插图解析卡): 把论文中最核心的 Transformer 架构图裁剪下来。Agent 在图上的 `Encoder` 和 `Decoder` 位置打上热点圆圈，用户鼠标悬浮即可看到中文讲解。
  - `InteractiveFormula` (互动公式板): 把论文里吓人的 $Attention(Q, K, V)$ 拆解开，用户指着 $Q$，旁边气泡提示“这相当于你在图书馆里用来搜索的关键词”。
* **Step 4: 读后检验与巩固 (收网)**
  - `QuizCard` (测验): “在 Self-Attention 中，Q、K、V 通常来自哪里？”（检验核心概念）。
  - `DeepDivePrompt` (深挖引导): 论文讲完了，在底部给出三个发散按钮：“👨‍💻 看看 PyTorch 实现”、“🤔 这在现在的 ChatGPT 里是怎么用的？”。

### 3.2 场景 B：硬核技能闯关 (如学习正则表达式)
**用户意图**：“我想学正则表达式，但我一看到那一堆符号就头晕。”
**Agent 编排策略**：高强度的“左脑理论 + 右脑实操”的沉浸式实战营。

* **Step 1: 实验室环境初始化 (开局)**
  - 采用 **左右分栏模式**。
  - 左侧顶部：`LearningPath` (显示闯关进度：“第一关：认识元字符 -> 第二关：量词...”)。
  - 右侧占据 60% 屏幕：一个定制的 `InteractiveSandbox` (代码沙盒)，语言设为 JS，里面预置了一段测试用的文本和匹配函数。
* **Step 2: 理论引入与具象化 (引导)**
  - 左侧：下发 `ConceptCard` 解释什么是元字符 `\d`。
  - 左侧：紧跟一个 `AnalogyCard`（“把 `\d` 想象成一个只会抓取数字 0-9 的捕虫网”）。
* **Step 3: 靶场实战与智能批阅 (交火)**
  - 左侧：下发 `SmartAnnotationBoard` (或者是带判题功能的沙盒任务)，要求用户写一个正则，匹配出右侧沙盒里所有的手机号。
  - **关键交互流**：用户在右侧沙盒里试错，觉得对了就点击提交。
  - **Agent 仲裁**：用户提交的正则如果是 `\d{11}`，Agent 不仅会判定正确，还会下发一段带行高亮的 `CodeSnippet` 告诉用户更严谨的写法 `^1[3-9]\d{9}$`。
* **Step 4: 游戏化结算与晋级 (奖励)**
  - 当前关卡通关后，左侧的 `LearningPath` 自动点亮下一关。
  - 突然在屏幕中央弹出一个精美的 `Achievement` (成就徽章：“🎉 恭喜获得：数字捕手”)，极大刺激用户的多巴胺。

---

## 4. 设计原则：留白与节奏控制

Agent 在拼接这些页面时，必须遵循以下节奏控制原则：

1. **避免信息轰炸 (Information Overload)**：
   - 一个页面（Surface）内，硬核的 `ConceptCard` 不要连续超过 2 个。
   - 必须用 `AnalogyCard` (讲故事) 或 `QuizCard` (做题) 来穿插，让大脑有喘息的机会。
2. **永远提供下一步 (Always Provide Next Action)**：
   - 页面的最底端，**绝对不能是死胡同**。
   - 必须放一个 `DeepDivePrompt`，或者是一个引导进入下一章的 `LearningPath` 按钮。
3. **视觉层次分明 (Visual Hierarchy)**：
   - 重要的实操 (`InteractiveSandbox`) 应该占据页面的主要宽度。
   - 辅助的 `ResourceList` 应该放在页面最底部，作为可选的扩展阅读。
