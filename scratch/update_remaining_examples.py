import json
from pathlib import Path

# ============================================================
# 1. conversational.json — JS Closures, problem-driven
# ============================================================
conversational = [
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "site-conversational",
      "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "site-conversational",
      "components": [
        {
          "id": "root",
          "component": "Column",
          "children": [
            "header",
            "background-pain",
            "scenario-chat",
            "concept",
            "mental-model-closure",
            "quiz",
            "summary-and-terms",
            "resources"
          ]
        },
        {
          "id": "header",
          "component": "Text",
          "variant": "h1",
          "text": "JavaScript 闭包深度解析：作用域、变量持久化与经典陷阱"
        },
        {
          "id": "background-pain",
          "component": "AnalogyCard",
          "title": "当函数「记住」了它不该记住的东西……",
          "analogy": "JavaScript 面试中最令候选人头疼的经典陷阱之一：\n<pre><code>for (var i = 0; i < 3; i++) {\n  setTimeout(function() {\n    console.log(i);  // 你期待 0, 1, 2 吗？\n  }, 1000);\n}</code></pre>\n实际输出：<code>3, 3, 3</code>！<br><br>为什么三个不同时刻注册的回调函数，最终都打印了同一个值？这是一个关于 <b>变量作用域</b> 与 <b>闭包（Closure）</b> 的核心问题——函数在「定义时」捕获的是变量的引用，而不是值的副本。理解这一机制，是真正掌握 JavaScript 的关键。"
        },
        {
          "id": "scenario-chat",
          "component": "ScenarioDialogue",
          "topic": "💬 代码 Review 研讨：探究闭包捕获机制与变量生命周期",
          "characters": {
            "kai": {
              "name": "Kai (前端工程师)",
              "avatar": "👨‍💻",
              "alignment": "left"
            },
            "priya": {
              "name": "Priya (JavaScript 架构师)",
              "avatar": "👩‍💼",
              "alignment": "right"
            }
          },
          "messages": [
            {
              "characterId": "kai",
              "content": "Priya，我在做 Code Review，发现同事写了一个 for 循环注册了三个 setTimeout，但最后全都打印出同一个值 3，而不是预期的 0, 1, 2。这是什么原因？"
            },
            {
              "characterId": "priya",
              "content": "这是经典的闭包陷阱。<code>var</code> 声明的变量没有块级作用域，整个 for 循环共享同一个 <code>i</code> 变量。三个回调函数都「关闭」(close over) 了同一个 <code>i</code> 的引用，等 setTimeout 触发时 for 循环早已结束，i 变成了 3。"
            },
            {
              "characterId": "kai",
              "content": "所以闭包捕获的是变量本身的引用，而不是当时的值？那如果我想让每个回调记住各自的 i，应该怎么做？"
            },
            {
              "characterId": "priya",
              "content": "两种主流修法：方案一，把 <code>var</code> 换成 <code>let</code>——let 有块级作用域，每次循环迭代都会创建一个全新的 <code>i</code> 绑定；方案二，用 IIFE（立即执行函数表达式）在每次迭代时创建一个新的局部作用域并把当前 i 值作为参数传入，强制值拷贝。"
            },
            {
              "characterId": "kai",
              "content": "所以 <code>let</code> 方案的本质，就是让每次循环迭代都产生独立的词法环境（Lexical Environment），每个闭包捕获不同的环境？"
            },
            {
              "characterId": "priya",
              "content": "完全正确！这正是<dfn title=\"函数在定义时捕获其外部词法作用域的变量引用，即使外部函数已返回，这些变量依然存活在内存中\">闭包（Closure）</dfn>的本质：函数 + 它定义时的词法环境。<code>let</code> 让每次迭代都有独立的词法环境，三个闭包各自独立，自然打印 0, 1, 2。"
            }
          ]
        },
        {
          "id": "concept",
          "component": "ConceptCard",
          "title": "闭包（Closure）：函数与其词法环境的绑定",
          "tags": ["JavaScript", "Scope", "Functions", "Closure"],
          "definition": "<b>闭包</b>是一个函数以及该函数<b>定义时所处的词法作用域</b>（Lexical Environment）的组合体。即使外部函数已经返回，内部函数仍然可以访问并操作外部函数作用域中的变量——这些变量并不会被垃圾回收，而是被「封存」在闭包中持续存活。",
          "example": "<pre><code>// 闭包经典用法：工厂函数与私有状态\nfunction makeCounter() {\n  let count = 0;  // count 被封存在闭包中\n  return {\n    increment() { count++; },\n    decrement() { count--; },\n    value()     { return count; }\n  };\n}\nconst counter = makeCounter();\ncounter.increment();\ncounter.increment();\nconsole.log(counter.value()); // 2\n// count 变量从外部无法直接访问，实现了「私有变量」</code></pre>",
          "relatedConcepts": ["词法作用域 (Lexical Scope)", "作用域链 (Scope Chain)", "IIFE", "垃圾回收 (GC)", "var vs let vs const"]
        },
        {
          "id": "mental-model-closure",
          "component": "MentalModel",
          "title": "闭包心智模型：背包与词法环境",
          "description": "理解闭包的关键：函数不只是一段可执行代码，它还携带着一个「背包」——定义时所处的词法环境（Lexical Environment）。这个背包里装着所有外部作用域的变量引用。",
          "icon": "🎒",
          "analogyTitle": "🎒 函数的「记忆背包」",
          "analogy": "把闭包想象成一位带着私人笔记本旅行的探险家：无论这位探险家走到哪里（在哪里被调用），他的笔记本（词法环境）永远随身携带。笔记本上记录的不是「出发时变量的快照」，而是「变量本身的地址」——如果变量被修改了，他下次翻开笔记本看到的是最新的值。",
          "diagramTitle": "📊 闭包词法环境绑定示意",
          "diagram": "makeCounter() 被调用\n  └─ 创建新的词法环境 { count: 0 }\n        ├─ increment 函数 → 词法环境引用\n        ├─ decrement 函数 → 词法环境引用  \n        └─ value 函数    → 词法环境引用\n\n← 三个函数共享同一个词法环境中的 count 变量引用",
          "pillarsTitle": "三大核心机制",
          "pillars": [
            {
              "title": "词法作用域 (Lexical Scope)",
              "description": "JavaScript 在函数<b>定义时</b>（而非调用时）确定作用域。内部函数能访问外部函数的所有变量，形成作用域链。",
              "icon": "📍"
            },
            {
              "title": "变量引用持久化",
              "description": "只要闭包函数存在，它捕获的外部变量就不会被垃圾回收，哪怕外部函数已执行完毕返回。",
              "icon": "🔒"
            },
            {
              "title": "私有状态封装",
              "description": "闭包是 JavaScript 实现「私有变量」的核心机制——被封装的变量无法从外部直接访问或修改，只能通过暴露的方法操作。",
              "icon": "🛡️"
            }
          ]
        },
        {
          "id": "quiz",
          "component": "QuizCard",
          "title": "🧠 闭包核心原理自测",
          "question": "下面代码的输出是什么？\n<pre><code>function outer() {\n  let x = 10;\n  function inner() {\n    x += 5;\n    return x;\n  }\n  return inner;\n}\nconst fn = outer();\nconsole.log(fn()); // 第一次调用\nconsole.log(fn()); // 第二次调用</code></pre>",
          "options": [
            {
              "id": "opt1",
              "text": "15, 15（每次调用都重新读取 x = 10）"
            },
            {
              "id": "opt2",
              "text": "15, 20（x 被持续修改，闭包共享同一个词法环境）"
            },
            {
              "id": "opt3",
              "text": "10, 10（outer() 返回后 x 被销毁，inner 无法访问）"
            },
            {
              "id": "opt4",
              "text": "undefined, undefined"
            }
          ],
          "correctOptionId": "opt2",
          "explanation": "<b>解析：</b><br>outer() 执行并返回 inner 函数，同时创建了词法环境 { x: 10 }。<br>fn 是 inner 函数 + 词法环境的闭包组合体。<br>• 第一次 fn()：x 从 10 → 15，返回 15；<br>• 第二次 fn()：x 从 15 → 20，返回 20。<br>关键：inner 捕获的是 x 的<b>引用</b>而非值的副本，所以每次修改都是持久化的。"
        },
        {
          "id": "summary-and-terms",
          "component": "AnalogyCard",
          "title": "总结：闭包是 JavaScript 函数式编程的基石",
          "analogy": "闭包是 JavaScript 中实现私有变量、函数工厂、模块化封装的核心机制。理解闭包意味着真正理解了 JavaScript 的词法作用域与函数执行模型。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p><dfn title=\"函数在定义时捕获其外部词法作用域的变量引用，即使外部函数已返回，这些变量依然存活在内存中\"><strong>闭包（Closure）</strong></dfn> 是函数与其 <dfn title=\"在函数定义时确定（而非调用时），由函数嵌套层级决定的变量可见性规则\"><strong>词法作用域（Lexical Scope）</strong></dfn> 的组合。闭包中引用的外部变量不会被 <dfn title=\"JavaScript 引擎自动管理内存，当变量不再被引用时自动释放\"><strong>垃圾回收（GC）</strong></dfn> 清理，从而实现「<dfn title=\"利用闭包将变量封装在函数内部，从外部无法直接访问或修改的封装模式\"><strong>私有变量（Private Variable）</strong></dfn>」。经典陷阱来自 <code>var</code> 的函数作用域与 <code>let</code> 的块级作用域差异——<dfn title=\"Immediately Invoked Function Expression，立即执行函数表达式，常用于在循环中创建独立词法环境\"><strong>IIFE</strong></dfn> 或 <code>let</code> 可强制为每次迭代创建独立的 <dfn title=\"JavaScript 运行时为每个函数调用创建的、记录变量绑定和作用域链的数据结构\"><strong>词法环境（Lexical Environment）</strong></dfn>。</p></div>"
        },
        {
          "id": "resources",
          "component": "ResourceList",
          "title": "推荐扩展阅读资源",
          "resources": [
            {
              "title": "MDN: 闭包（Closures）",
              "url": "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures",
              "description": "Mozilla 开发者网络的闭包权威指南（中文版），含完整代码示例与应用场景。",
              "type": "doc"
            },
            {
              "title": "JavaScript.info: 变量作用域与闭包",
              "url": "https://zh.javascript.info/closure",
              "description": "深入浅出讲解词法环境、变量捕获与闭包实现细节，含大量可运行示例。",
              "type": "article"
            }
          ]
        }
      ]
    }
  }
]

# ============================================================
# 2. non-linear.json — CSS Grid, problem-driven
# ============================================================
non_linear = [
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "site-non-linear",
      "catalogId": "https://a2learn.ai/spec/v1/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "site-non-linear",
      "components": [
        {
          "id": "root",
          "component": "Column",
          "children": [
            "header",
            "navigator",
            "background-pain",
            "scenario-chat",
            "concept-grid-container",
            "mental-model-grid",
            "concept-grid-placement",
            "quiz",
            "summary-and-terms",
            "resources"
          ]
        },
        {
          "id": "header",
          "component": "Text",
          "variant": "h1",
          "text": "CSS Grid 布局全景解析：从一维到二维的布局思维跃迁"
        },
        {
          "id": "navigator",
          "component": "SectionNavigator",
          "title": "章节导航：",
          "activeSectionId": "intro",
          "onSectionClick": {"name": "navigate_section", "context": {}},
          "sections": [
            {"id": "intro", "title": "Grid 基础概念", "description": "容器、网格线与轨道", "icon": "📐", "status": "current"},
            {"id": "template", "title": "定义网格模板", "description": "grid-template-columns/rows 属性", "icon": "📏", "status": "available"},
            {"id": "placement", "title": "元素放置技巧", "description": "跨行跨列的高级布局", "icon": "🧩", "status": "available"},
            {"id": "challenge", "title": "实战综合挑战", "description": "用 Grid 还原复杂仪表盘 UI", "icon": "⚔️", "status": "locked"}
          ]
        },
        {
          "id": "background-pain",
          "component": "AnalogyCard",
          "title": "为什么我们需要 CSS Grid？Flexbox 还不够吗？",
          "analogy": "在 CSS Grid 出现之前，前端工程师用 <code>float</code>、<code>position: absolute</code> 乃至 <code>table</code> 布局实现复杂页面，代码脆弱且难以维护。即便 Flexbox 的出现大幅改善了一维（行或列）布局，但面对真实的产品页面，我们经常需要同时控制<b>行和列两个维度</b>：\n<pre><code>/* 想实现：左侧边栏 + 右侧两列内容区 + 底部横跨全宽的 footer */\n/* Flexbox 方案：嵌套多层 flex 容器，逻辑分散难以维护 */</code></pre>\nCSS Grid 专为<b>二维布局</b>设计，允许开发者在同一个声明中同时定义行与列的结构，让复杂布局的意图在代码中一目了然。"
        },
        {
          "id": "scenario-chat",
          "component": "ScenarioDialogue",
          "topic": "💬 UI 设计研讨：探究 Flexbox 的边界与 Grid 二维布局的突破",
          "characters": {
            "leo": {
              "name": "Leo (前端工程师)",
              "avatar": "👨‍🎨",
              "alignment": "left"
            },
            "nina": {
              "name": "Nina (CSS 架构师)",
              "avatar": "👩‍💻",
              "alignment": "right"
            }
          },
          "messages": [
            {
              "characterId": "leo",
              "content": "Nina，我在做一个仪表盘页面，左边固定侧边栏，右边是 3 列卡片区，底部有一个横跨全宽的状态栏。用 Flexbox 嵌套了好几层，代码越写越乱，有更好的方法吗？"
            },
            {
              "characterId": "nina",
              "content": "这正是 CSS Grid 诞生的使用场景！Flexbox 是一维布局工具——一次只能控制行或列。Grid 是二维的，可以在一个容器上同时定义行和列的结构，子元素精确摆放到任何网格区域。"
            },
            {
              "characterId": "leo",
              "content": "听起来很强大，那怎么定义这个布局的网格结构？"
            },
            {
              "characterId": "nina",
              "content": "用 <code>grid-template-columns</code> 和 <code>grid-template-rows</code>。比如你的需求：<code>grid-template-columns: 240px 1fr 1fr 1fr</code> 就是左边固定 240px 侧边栏 + 右边三等分内容区。底部 footer 用 <code>grid-column: 1 / -1</code> 让它从第一条网格线延伸到最后一条，自动横跨全宽。"
            },
            {
              "characterId": "leo",
              "content": "只需要这几行 CSS 就实现了？比嵌套 Flexbox 优雅太多了！所以 Grid 的核心是先在父容器声明整个二维空间的蓝图，再让子元素按需定位？"
            },
            {
              "characterId": "nina",
              "content": "完全正确！这就是 <dfn title=\"CSS Grid 的核心设计哲学：父容器声明整个页面的二维网格结构，子元素根据网格线编号或命名区域精确定位\">Grid 的布局哲学</dfn>——「先定义空间结构，再填充内容」。这与 Flexbox 的「内容决定空间」形成互补，两者结合才是现代 CSS 布局的终极方案。"
            }
          ]
        },
        {
          "id": "concept-grid-container",
          "component": "ConceptCard",
          "title": "Grid 容器与网格轨道",
          "tags": ["CSS", "Grid", "Layout", "二维布局"],
          "definition": "将元素的 <code>display</code> 设为 <code>grid</code> 或 <code>inline-grid</code>，即创建一个 <b>Grid 容器</b>。容器内的所有直接子元素自动成为 <b>Grid 项目（Grid Items）</b>。Grid 的二维空间由<b>网格线（Grid Lines）</b>划分出<b>行轨道（Row Tracks）</b>和<b>列轨道（Column Tracks）</b>，交叉形成<b>网格单元（Grid Cells）</b>。",
          "example": "<pre><code>.dashboard {\n  display: grid;\n  /* 左侧边栏240px + 右侧三等分内容区 */\n  grid-template-columns: 240px 1fr 1fr 1fr;\n  /* 顶部导航80px + 中间内容区自动填充 + 底部状态栏60px */\n  grid-template-rows: 80px auto 60px;\n  gap: 16px;  /* 网格间距 */\n}\n\n/* footer 横跨全部4列（-1 代表最后一条网格线）*/\n.footer {\n  grid-column: 1 / -1;\n}</code></pre>",
          "relatedConcepts": ["Flexbox", "fr 单位", "grid-template-areas", "gap", "网格线编号"]
        },
        {
          "id": "mental-model-grid",
          "component": "MentalModel",
          "title": "CSS Grid 心智模型：城市规划蓝图",
          "description": "CSS Grid 的设计思维是先画好整个城市的道路网格（父容器声明结构），再决定每栋建筑占据哪几个地块（子元素定位）。这与 Flexbox 的「按内容动态分配空间」形成根本差异。",
          "icon": "🏙️",
          "analogyTitle": "🏙️ 城市规划类比",
          "analogy": "<b>Flexbox 像搭积木</b>：把一块块积木沿一个方向堆放，整体排列由积木大小决定；<br><b>Grid 像城市规划</b>：先在图纸上画好道路网格（行与列的蓝图），再标注每块地皮的用途——某栋建筑占 1×2 格，某公园横跨 3 列，一切都在蓝图上一目了然，不依赖元素本身的大小。",
          "diagramTitle": "📊 Grid 二维空间坐标系",
          "diagram": "        列线1  列线2  列线3  列线4  列线5\n行线1  |  侧边栏  |  卡片1  |  卡片2  |  卡片3  |\n行线2  |  侧边栏  |  卡片4  |  卡片5  |  卡片6  |\n行线3  |      Footer (grid-column: 1 / -1)      |",
          "pillarsTitle": "三大核心属性",
          "pillars": [
            {
              "title": "grid-template-columns/rows",
              "description": "定义网格的列和行的尺寸蓝图。支持 <code>px</code>、<code>%</code>、<code>fr</code>（剩余空间分比）、<code>auto</code>、<code>minmax()</code> 等灵活单位。",
              "icon": "📐"
            },
            {
              "title": "grid-column / grid-row",
              "description": "子元素用网格线编号精确定位并跨越多个轨道：<code>grid-column: 2 / 4</code> 表示从第 2 条列线到第 4 条列线，跨越 2 列。",
              "icon": "📍"
            },
            {
              "title": "grid-template-areas",
              "description": "用命名区域定义布局蓝图，让 CSS 代码自文档化：<code>\"header header\" \"sidebar main\" \"footer footer\"</code>，可视化程度极高。",
              "icon": "🗺️"
            }
          ]
        },
        {
          "id": "concept-grid-placement",
          "component": "ConceptCard",
          "title": "Grid 元素精确放置与命名区域",
          "tags": ["CSS", "Grid", "grid-area", "grid-template-areas"],
          "definition": "CSS Grid 提供两种主流元素放置方式：<br><b>① 网格线编号</b>：用 <code>grid-column: 开始线 / 结束线</code> 精确控制元素跨越哪些列；<br><b>② 命名区域（grid-template-areas）</b>：在父容器用字符串「画出」布局图，子元素用 <code>grid-area</code> 声明自己的名字，代码极具可读性。",
          "example": "<pre><code>/* 方式二：命名区域（更直观）*/\n.layout {\n  display: grid;\n  grid-template-columns: 200px 1fr;\n  grid-template-rows: 60px auto 40px;\n  grid-template-areas:\n    \"header  header\"\n    \"sidebar main  \"\n    \"footer  footer\";\n}\n.header  { grid-area: header; }\n.sidebar { grid-area: sidebar; }\n.main    { grid-area: main; }\n.footer  { grid-area: footer; }</code></pre>",
          "relatedConcepts": ["grid-column", "grid-row", "grid-area", "span 关键字", "auto-placement"]
        },
        {
          "id": "quiz",
          "component": "QuizCard",
          "title": "🧠 CSS Grid 核心概念自测",
          "question": "以下 CSS Grid 代码中，<code>.item { grid-column: 1 / -1; }</code> 的效果是什么？\n<pre><code>.container {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n}\n.item {\n  grid-column: 1 / -1;\n}</code></pre>",
          "options": [
            {
              "id": "opt1",
              "text": "元素只占第 1 列"
            },
            {
              "id": "opt2",
              "text": "元素从第 1 列线延伸到最后一条列线，横跨全部 4 列"
            },
            {
              "id": "opt3",
              "text": "元素从倒数第 1 列线延伸到第 1 列线（反向）"
            },
            {
              "id": "opt4",
              "text": "语法错误，-1 不是合法的网格线编号"
            }
          ],
          "correctOptionId": "opt2",
          "explanation": "<b>解析：</b><br>在 CSS Grid 中，<code>-1</code> 是一个合法的<b>负数网格线编号</b>，代表从最后一条隐式网格线往前数第 1 条，即网格的最后一条列线。<br>因此 <code>grid-column: 1 / -1</code> 表示从第 1 条列线延伸到最后一条列线，效果是让元素<b>横跨所有列（full-width）</b>。这是实现「footer 横跨全宽」的标准写法，无需硬编码列数。"
        },
        {
          "id": "summary-and-terms",
          "component": "AnalogyCard",
          "title": "总结：Grid 与 Flexbox 的互补关系",
          "analogy": "CSS Grid 是二维布局的终极工具，Flexbox 是一维内容排列的最佳选择。现代前端开发的最佳实践是：用 Grid 定义页面的宏观结构（行与列的蓝图），用 Flexbox 处理组件内部的内容对齐。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p><dfn title=\"将 display 设为 grid 后创建的二维布局容器，定义所有子元素的行列空间蓝图\"><strong>Grid 容器（Grid Container）</strong></dfn>通过 <code>grid-template-columns/rows</code> 声明二维空间蓝图，其中 <dfn title=\"CSS Grid 专属的弹性比例单位，1fr 代表分配一份剩余可用空间\"><strong>fr 单位</strong></dfn>灵活分配剩余空间。<dfn title=\"CSS Grid 中划分行列的虚拟参考线，用正整数从左到右/从上到下编号，负整数从末尾反向编号\"><strong>网格线（Grid Lines）</strong></dfn>用于子元素精确定位，负数编号（如 <code>-1</code>）从末尾反向计数。<dfn title=\"在父容器用字符串图形描述布局结构，让子元素通过名字声明位置的可视化布局方式\"><strong>grid-template-areas</strong></dfn>提供极具可读性的命名区域布局方案。</p></div>"
        },
        {
          "id": "resources",
          "component": "ResourceList",
          "title": "推荐扩展阅读资源",
          "resources": [
            {
              "title": "CSS-Tricks: A Complete Guide to CSS Grid",
              "url": "https://css-tricks.com/snippets/css/complete-guide-grid/",
              "description": "业界最权威的 CSS Grid 完整参考指南，含所有属性可视化解析。",
              "type": "doc"
            },
            {
              "title": "Grid Garden — 互动学习游戏",
              "url": "https://cssgridgarden.com/",
              "description": "通过种菜游戏互动掌握 CSS Grid 的所有核心属性，寓教于乐。",
              "type": "article"
            },
            {
              "title": "MDN: CSS Grid Layout",
              "url": "https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout",
              "description": "Mozilla 开发者网络的 CSS Grid 权威文档（中文版）。",
              "type": "doc"
            }
          ]
        }
      ]
    }
  }
]

# ============================================================
# 3. biophysics-ai.json — update ScenarioDialogue to peer-researcher style
#    + add summary-and-terms before resources
# ============================================================
# Load current file and patch just what needs changing
import json as _json

bio_path = Path("skill/references/examples/biophysics-ai.json")
bio_content = _json.loads(bio_path.read_text(encoding="utf-8"))

update_msg = bio_content[1]
components = update_msg["updateComponents"]["components"]

# Find and update the ScenarioDialogue component
for comp in components:
    if comp.get("id") == "scenario-dialogue":
        comp["topic"] = "🔬 AI 结构生物学研讨：探究 AlphaFold 的工程突破与科学影响"
        comp["characters"] = {
            "wei": {
                "name": "Wei (计算生物学博士生)",
                "avatar": "🧑‍🔬",
                "alignment": "left"
            },
            "chen": {
                "name": "Dr. Chen (结构生物物理学家)",
                "avatar": "👩‍🔬",
                "alignment": "right"
            }
        }
        comp["messages"] = [
            {
                "characterId": "wei",
                "content": "Dr. Chen，AlphaFold2 到底在哪个层面「解决」了蛋白质折叠问题？我担心这个说法被过度解读了——它真的在物理层面模拟了折叠过程吗？"
            },
            {
                "characterId": "chen",
                "content": "这个问题问得很好。准确说，AlphaFold2 并没有模拟折叠的动力学过程——它完全绕过了这个问题。它的核心洞见是「进化就是最好的物理模拟器」：通过分析数千条同源序列的协同突变模式，直接学到了哪些残基对在三维空间中靠近，再用等变神经网络把这些约束映射到原子坐标。"
            },
            {
                "characterId": "wei",
                "content": "所以它本质上是把蛋白质折叠问题转化成了一个「统计学习协同进化信号」的问题，而不是求解热力学方程？"
            },
            {
                "characterId": "chen",
                "content": "正是。而且这个重新表述非常有效——CASP14 中 GDT_TS 均分 92.4，中位 Cα RMSD 约 0.96 Å，在绝大多数蛋白质上已经达到了实验级别的精度。以前解析一个结构可能需要数年、数百万美元，现在几秒、几乎免费。"
            },
            {
                "characterId": "wei",
                "content": "AlphaFold3 放弃了 Structure Module 改用 Diffusion，这个架构选择的动机是什么？Diffusion 在这里有什么天然优势？"
            },
            {
                "characterId": "chen",
                "content": "Structure Module 用刚体变换建模，对蛋白质主链折叠很好，但面对小分子配体的化学键自由度、RNA 的柔性、金属离子的配位几何时，单一刚体假设就显得捉襟见肘了。Diffusion 在原子坐标的连续空间中直接生成，天然支持任意类型的原子混合体系，这才是它能统一预测蛋白质-DNA-RNA-小分子复合物的根本原因。"
            },
            {
                "characterId": "wei",
                "content": "对药物发现来说，这意味着可以直接预测候选分子与靶点的结合构象。传统虚拟筛选需要专业对接软件，现在 AlphaFold3 就能搞定？"
            },
            {
                "characterId": "chen",
                "content": "在 PoseBusters 基准上，AlphaFold3 的配体对接精度已经超过 Glide 和 AutoDock Vina 约 50%。当然，它预测的是热力学上的平均构象，不能完全替代 MD 模拟。但作为虚拟筛选的第一步，速度和精度已经非常实用——像 Insilico Medicine 已经把 AI 预测结构用于临床三期管线了。"
            }
        ]
        break

# Find resources component and insert summary-and-terms before it
resources_idx = next(i for i, c in enumerate(components) if c.get("id") == "resources")
summary_component = {
    "id": "summary-and-terms",
    "component": "AnalogyCard",
    "title": "总结：AI 驱动的结构生物学革命",
    "analogy": "AlphaFold 系列将蛋白质结构解析从「多年实验」压缩至「秒级计算」，彻底改变了结构生物学、药物发现与合成生物学的研究范式。2024 年诺贝尔化学奖的授予，标志着 AI 生物物理学获得科学界最高认可。<hr><div class=\"terms-section\"><h5 class=\"terms-section-title\">📌 术语总结</h5><p>现代 AI 结构生物学体系以 <dfn title=\"2021年 DeepMind 发表的蛋白质结构预测系统，通过 Evoformer 提取协同进化信号并用 SE(3) 等变网络生成原子坐标\"><strong>AlphaFold2</strong></dfn> 为核心，其 <dfn title=\"AlphaFold2 的核心注意力网络，同时在 MSA 矩阵与残基对矩阵上交替执行注意力计算，捕获协同进化几何特征\"><strong>Evoformer</strong></dfn> 处理 <dfn title=\"来自数据库的多条同源蛋白质序列比对矩阵，协同突变信号提供强烈的三维空间约束\"><strong>多序列比对（MSA）</strong></dfn>信号。2024年的 <dfn title=\"采用去噪扩散概率模型直接在原子坐标空间生成结构，统一预测蛋白质-DNA-RNA-小分子复合物\"><strong>AlphaFold3</strong></dfn> 以 <dfn title=\"从噪声逐步去噪生成数据的生成模型，在 AlphaFold3 中用于在三维原子坐标空间直接生成多分子复合物结构\"><strong>Diffusion 模型</strong></dfn>替代 Structure Module，实现了多模态复合物的统一预测。蛋白质语言模型 <dfn title=\"Meta AI 基于 650亿参数 ESM-2 语言模型构建的结构预测系统，无需 MSA 即可单序列预测，速度比 AlphaFold2 快 60 倍\"><strong>ESMFold</strong></dfn> 则以每秒数十条的速度驱动宏基因组大规模结构注释。</p></div>"
}
components.insert(resources_idx, summary_component)

# Update root children to include summary-and-terms
root = next(c for c in components if c.get("id") == "root")
root_children = root["children"]
if "summary-and-terms" not in root_children:
    res_idx = root_children.index("resources")
    root_children.insert(res_idx, "summary-and-terms")

# ============================================================
# Write all files
# ============================================================
files_map = {
    "conversational": conversational,
    "non-linear": non_linear,
    "biophysics-ai": bio_content
}

for name, data in files_map.items():
    for base in [
        f"packages/a2learn-catalog/examples/Website/{name}.json",
        f"skill/references/examples/{name}.json",
        f"apps/viewer/public/examples/{name}.json"
    ]:
        p = Path(base)
        p.write_text(_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"UPDATED: {p}")

print("ALL_UPDATES_SUCCESS")
