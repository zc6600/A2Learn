# A2Learn 自定义组件库设计文档 (v1.0)

## 1. 产品设计理念：如何构建一个优秀的互动学习网站？
一个优秀的互动学习网站不仅需要提供高质量的内容，还需要通过**产品机制**与**交互设计**来激发用户的学习动力、提升记忆留存率。基于 A2UI 的 AI Agent 驱动模式，A2Learn 产品的核心设计理念包含以下三个维度：

1. **认知结构化 (Cognitive Structuring)**：
   - 学习不能是碎片化的，必须有清晰的脉络。
   - **对应组件**：`LearningPath` (学习路径图)。帮助用户建立“我在哪里、我要去哪里、我已经完成了什么”的全局观。

2. **主动回忆与即时反馈 (Active Recall & Immediate Feedback)**：
   - 被动阅读的吸收率极低。必须通过持续的互动测试，强迫大脑主动提取信息。
   - **对应组件**：
     - `Flashcard` (知识闪卡)：利用间隔重复（Spaced Repetition）原理，强化概念记忆。
     - `QuizCard` (互动测试卡)：提供单选题/多选题，并在用户作答后**立即**给出正确/错误反馈与解析，形成闭环。

3. **游戏化与正向激励 (Gamification & Positive Reinforcement)**：
   - 学习是反人性的，需要通过外部激励转化为内部动力。及时的成就反馈能促进多巴胺分泌。
   - **对应组件**：`Achievement` (成就徽章)。当用户完成一个困难的知识点或连续打卡时，Agent 动态下发一个精美的成就徽章，提升获得感。

---

## 2. 核心组件设计

### 2.0 宏观陈列与导航 (Macro Navigation)
为了让用户在进入陈列馆时不至于迷失，A2Learn 提供了三种层级的导航组件：

#### 2.0.1 KnowledgeTree (知识探索器) [✅ 已重构实现]
**产品目标**: 作为进入某个大学科的入口，摒弃传统深层嵌套树，采用“当前视角”的面包屑+子节点网格的探索模式。
- **应用场景**: 
  - **学科主页** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/KnowledgeTree/basic.json)): 展示“计算机科学”下的四大核心模块入口。
  - **百科词条探索**: 类似于维基百科的分类下钻。
- **属性**: `path` (面包屑路径), `currentNode` (当前节点介绍), `childrenNodes` (子节点入口)。
- **交互**: 点击子节点上报 `onNodeNavigate`，Agent 重新下发下一层的探索器。

#### 2.0.2 SectionNavigator (章节导航器) [✅ 已实现]
**产品目标**: 扁平的模块化导航卡片，通常用于课程目录或大纲的入口分发。
- **应用场景**: 
  - **课程大纲入口** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/SectionNavigator/basic.json)): “Web3 训练营”的核心章节卡片，带有 locked/completed 状态。
  - **学习路径选择** (🔗 [横向布局示例](../packages/a2learn-catalog/examples/Component/SectionNavigator/horizontal.json)): 让用户在前端、后端、AI中选择路线。
- **属性**: `sections` (章节列表，带图标和描述), `activeSectionId`。
- **交互**: 点击触发 `onSectionClick`，用于页面级路由切换。

### 2.0.3 PaperAbstract (论文摘要卡) [规划中/Paper2UI专属]
**产品目标**: 专门用于学术论文解析，快速结构化展示一篇论文的核心元数据与摘要。
- **应用场景**: 用户上传 PDF 或给出 arXiv 链接后，Agent 首先吐出此组件，建立论文的“名片”。
- **属性**: `title`, `authors`, `venue` (发表会议/期刊), `year`, `abstract` (核心摘要), `tldr` (Agent 生成的一句话总结)。
- **交互**: 纯展示，提供“下载 PDF”或“跳转原文”按钮。

### 2.0.4 DocumentFigure (文档插图与解析卡) [✅ 已实现]
**产品目标**: 专门用于展示和深度解析从学术论文、PDF 或扫描件中提取的图表/图片。这是打破“纯文本阅读”限制的核心组件。
- **应用场景**: 
  - **静态展示** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/DocumentFigure/basic.json)): 展示原图、图例以及全局 AI 解析。
  - **网络架构图热点解析** (🔗 [热点悬浮示例](../packages/a2learn-catalog/examples/Component/DocumentFigure/hotspots.json)): 论文中抛出了一个极其复杂的架构图。Agent 在图片的特定坐标（Bounding Box）上打上热点标记，用户 Hover 就能看到局部组件的白话解释。
- **工程实现思路 (提取与引用机制)**:
  1. **预处理提取 (服务端)**: 用户上传 PDF 后，后端不只是跑 OCR，必须使用版面分析模型（如 LayoutLM、Marker 或 PDFium）将 PDF 解析为结构化的 JSON/Markdown。在这个过程中，所有的图片必须被裁剪下来，上传到 OSS/S3，并赋予全局唯一的 `imageId`（如 `fig_1`、`table_2`）。
  2. **上下文注入 (Agent端)**: 提取出来的 Markdown 文本中必须包含图片的引用占位符，例如 `![Figure 1: Architecture](https://oss.url/fig_1.png)`。在给大模型（Agent）喂 Context 时，不仅要喂文本，还要把这些核心图片的 URL 作为多模态输入（Vision 模式）一并喂给大模型。
  3. **组件下发 (前端)**: 当大模型讲解到某段内容需要配图时，它可以在 JSON 协议中下发 `DocumentFigure` 组件，并带上它已经“看”过的图片 URL。
- **属性**:
  - `imageUrl`: 图片在 OSS 上的访问地址。
  - `caption`: 原文的图例说明（Figure Caption）。
  - `aiExplanation`: Agent 针对这张图给出的多模态深度解析（可选）。
  - `hotspots`: (高级) 数组对象，包含 `[{ x: 10, y: 20, label: "Encoder Block", desc: "..." }]`，用于在图片上覆盖交互式讲解气泡。
- **交互**: 
  - 支持点击放大（Lightbox）。
  - 如果带有 `hotspots`，鼠标 Hover 坐标点时弹出局部解析气泡。

### 2.1 LearningPath (学习路径图) [✅ 已实现]
**产品目标**: 帮助用户直观地看到知识点的先后顺序、当前进度以及后续计划。
- **应用场景**:
  - **课程大纲导航** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/LearningPath/basic.json)): 传统网课的左侧目录树替代品，告诉用户“你今天处于第一章第3节”。
  - **技能树指引**: “前端工程师成长路线”，让用户知道学完 HTML 后接下来该学 CSS。
  - **操作向导**: 比如“如何部署一个智能合约”的 5 个固定步骤，每完成一步自动解锁下一步。

### 2.2 Flashcard (知识闪卡) [✅ 已实现]
**产品目标**: 强化记忆，通过“正反面”切换来测试用户对概念的掌握。
- **应用场景**:
  - **医学/法学概念背诵** (🔗 [未翻转示例](../packages/a2learn-catalog/examples/Component/Flashcard/basic.json)): 正面病症名称，反面核心症状与治疗方案。
  - **间隔重复复习** (🔗 [已翻转示例](../packages/a2learn-catalog/examples/Component/Flashcard/flipped.json)): 面试八股文背诵，用户自测后点击“已掌握”或“需强化”。

### 2.3 QuizCard (互动测试卡) [✅ 已实现]
**产品目标**: 即时评估与知识巩固。当 Agent 讲解完一个概念后，立即抛出一个选择题。
- **应用场景**:
  - **单项选择题** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/QuizCard/basic.json)): “二战爆发是哪一年？”
  - **多项选择题** (🔗 [多选示例](../packages/a2learn-catalog/examples/Component/QuizCard/multi-select.json)): “下面哪些属于 JavaScript 的基础数据类型？”

### 2.4 Achievement (成就徽章) [✅ 已实现]
**产品目标**: 游戏化激励。在关键节点展示。
- **应用场景**:
  - **里程碑达成** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/Achievement/basic.json)): “恭喜学完 React 基础！”
  - **隐藏彩蛋**: 用户点击了某个生僻概念的“深挖”按钮，Agent 颁发“好奇宝宝”徽章。

### 2.5 ConceptCard (概念陈列卡) [✅ 已实现]
**产品目标**: 最基础的微观知识展具。用于严谨地陈列一个具体的硬核概念。
- **应用场景**:
  - **名词解释** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/ConceptCard/basic.json)): “什么是 DOM？”
  - **带拓展链接的进阶概念** (🔗 [高级示例](../packages/a2learn-catalog/examples/Component/ConceptCard/advanced.json)): “什么是虚拟 DOM？”，附带关联概念如 `Diff 算法` 和 `Fiber 架构`。

### 2.5.1 ResourceList (扩展阅读清单) [✅ 已实现]
**产品目标**: 在概念讲解结束时，提供结构化的外部链接陈列。
- **应用场景** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/ResourceList/basic.json)): 推荐书籍、相关 GitHub 仓库、维基百科链接。

### 2.5.2 LiteratureReference (文献引文块) [规划中/Paper2UI专属]
**产品目标**: 在讲解某段前置知识或相关工作 (Related Work) 时，提供结构化的学术引文陈列。
- **应用场景**: 论文背景知识科普，如“基于 Attention 机制 (Vaswani et al., 2017) 的变体”。
- **属性**: `citation` (引文标识如 "[1]"), `authors`, `title`, `url` (可选 arXiv 链接), `highlightQuote` (原文中相关引述)。
- **交互**: 点击引文可触发 `onReferenceClick`，让 Agent 生成对这篇被引用论文的微型解读。

### 2.5.3 InteractiveFormula (互动公式板) [规划中/Paper2UI专属]
**产品目标**: 学术论文最头疼的就是满篇的数学符号。此组件用于拆解复杂的 LaTeX 公式，实现“变量级悬浮解释”。
- **应用场景**: 机器学习论文中的损失函数、物理学推导等。
- **属性**:
  - `latex`: 核心公式。
  - `variables`: 变量字典表（例如 `{ "x_i": "输入的特征向量", "W_q": "Query 权重矩阵" }`）。
  - `derivationSteps`: (可选) 步骤推导数组，支持点击“下一步”逐步展示推导过程。
- **交互**: 用户鼠标悬浮在公式的某个字母上，弹出变量对应的白话解释。

### 2.6 InteractiveSandbox (全栈代码沙盒) [✅ 已重构实现]
**产品目标**: 真正的“动手实验室”，完全在前端闭环运行的代码编辑器与预览窗。
- **应用场景**:
  - **前端切图** (🔗 [HTML/CSS示例](../packages/a2learn-catalog/examples/Component/InteractiveSandbox/html-css.json)): Agent 下发一段 HTML/CSS 骨架，让用户修改颜色看看效果。
  - **算法验证** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/InteractiveSandbox/basic.json)): 提供一个 Python 或 JS 的函数，让用户改参数并点击运行，直接在前端看结果。

### 2.7 ClozeTest (互动填空题卡) [✅ 已重构实现]
**产品目标**: 考察用户的主动回忆（Active Recall）能力，提供一段留有空缺的文本，要求用户准确填入。
- **应用场景**:
  - **知识点填空** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/ClozeTest/basic.json)): “React 的核心优势是 ___ 和 ___。”
  - **代码补全** (🔗 [代码片段示例](../packages/a2learn-catalog/examples/Component/ClozeTest/code.json)): 给出一段核心逻辑残缺的函数，让用户填入关键的 API 方法名。

### 2.8 DragAndDropMatch (拖拽匹配板) [✅ 已重构实现]
**产品目标**: 增强题型的游戏化体验。
- **应用场景**:
  - **跨语言翻译** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/DragAndDropMatch/basic.json)): 左侧一列英文单词，右侧一列打乱的中文，要求连线。
  - **流程排序 (变体)** (🔗 [排序示例](../packages/a2learn-catalog/examples/Component/DragAndDropMatch/sorting.json)): 左侧是固定序号 1-4，右侧是打乱的算法执行步骤，要求对应匹配。

### 2.9 Timeline (互动时间轴) [✅ 已实现]
**产品目标**: 以结构化的方式展示历史事件、发展史或流程步骤。
- **应用场景**:
  - **技术演进史** (🔗 [基础纵向示例](../packages/a2learn-catalog/examples/Component/Timeline/basic.json)): Web 前端框架发展史。
  - **业务生命周期** (🔗 [横向流程示例](../packages/a2learn-catalog/examples/Component/Timeline/horizontal.json)): 比如“一个需求的生命周期”（评审 -> 设计 -> 开发 -> 测试）。

### 2.10 AnalogyCard (类比卡片) [✅ 已实现]
**产品目标**: 提供生动的故事或类比来解释复杂的硬核知识。视觉上与严肃的 `ConceptCard` 拉开差异，设计更活泼。
- **应用场景**:
  - **通俗比喻** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/AnalogyCard/basic.json)): “把 API 想象成餐厅里的服务员”。
  - **去中心化概念** (🔗 [区块链示例](../packages/a2learn-catalog/examples/Component/AnalogyCard/blockchain.json)): “把区块链想象成全班共用的公开账本”。

### 2.11 ScenarioDialogue (情景对话模拟器) [✅ 已实现]
**产品目标**: 摒弃传统的“平铺直叙”大段文字，采用“双人或多人聊天气泡”的形式（类似微信对话）来演绎抽象的知识点。
- **应用场景**:
  - **小白 vs 大神 (科普场景)** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/ScenarioDialogue/basic.json))：三人群聊，探讨前端框架之争。
  - **历史人物跨时空对谈** (🔗 [历史对谈示例](../packages/a2learn-catalog/examples/Component/ScenarioDialogue/history.json))：牛顿和爱因斯坦跨时空辩论“绝对时空 vs 相对时空”。

### 2.12 DeepDivePrompt (深挖提示器) [✅ 已实现]
**产品目标**: 作为 AI 互动引导的灵魂组件，放在知识点讲解结尾，提供几个引导性的问题按钮，鼓励用户“继续深挖”。
- **应用场景**:
  - **未点击状态** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/DeepDivePrompt/basic.json)): 展示 3 个可点的提示词按钮。
  - **已点击状态** (🔗 [选中示例](../packages/a2learn-catalog/examples/Component/DeepDivePrompt/selected.json)): 用户点击后按钮变为高亮不可用状态。

### 2.13 CodeSnippet (代码展示块) [✅ 已实现]
**产品目标**: 纯粹用于静态展示优美代码块的组件，带语法高亮。
- **应用场景**:
  - **静态展示** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/CodeSnippet/basic.json)): 简单的 Python 代码展示。
  - **代码高亮与讲解** (🔗 [行高亮示例](../packages/a2learn-catalog/examples/Component/CodeSnippet/highlighted.json)): 在 React 组件代码中，把涉及到 Hooks 的第 4 行和第 7 行高亮显示，方便 Agent 在正文中结合讲解。

### 2.14 SmartAnnotationBoard (智能批注输入板) [✅ 已重构实现]
**产品目标**: 用于收集用户的开放式主观输入，并利用 Agent 提供结构化的行内批注、反馈与评分。
- **应用场景**:
  - **主观题输入** (🔗 [基础示例](../packages/a2learn-catalog/examples/Component/SmartAnnotationBoard/basic.json)): 提示用户“请用英文描述你最喜欢的一部电影”。
  - **代码 Review 反馈** (🔗 [批改反馈示例](../packages/a2learn-catalog/examples/Component/SmartAnnotationBoard/feedback.json)): 用户提交了一段 JavaScript 代码，Agent 将其设为只读，并在第 3 行（`i < n`）划了黄色波浪线，Hover 提示“这里可以优化为 `i <= Math.sqrt(n)`”。

## 3. 技术规范
- **Namespace**: `a2learn`
- **Catalog ID**: `https://a2learn.ai/spec/v1/catalog.json`
- **样式规范**: 继承全局主题变量，同时引入 `--a2learn-learning-path-accent` 等自定义变量。
