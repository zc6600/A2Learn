import { z } from "zod";
import {
  DynamicStringSchema,
  DynamicNumberSchema,
  DynamicBooleanSchema,
  ActionSchema,
  AccessibilityAttributesSchema,
} from "@a2ui/web_core/v0_9";
import { ComponentApi } from "@a2ui/web_core/v0_9";

const CommonProps = {
  accessibility: AccessibilityAttributesSchema.optional(),
  weight: z.number().optional(),
};

export const KnowledgeTreeApi = {
  name: "KnowledgeTree",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.optional().describe("模块标题"),
      path: z.array(z.object({
        id: z.string(),
        label: DynamicStringSchema.describe("节点名称"),
      })).describe("当前所处的层级路径（面包屑），用于展示和向上导航"),
      currentNode: z.object({
        id: z.string(),
        label: DynamicStringSchema.describe("当前节点名称"),
        description: DynamicStringSchema.optional().describe("当前节点描述"),
      }).optional().describe("当前聚焦的节点信息"),
      childrenNodes: z.array(z.object({
        id: z.string(),
        label: DynamicStringSchema.describe("子节点名称"),
        hasChildren: DynamicBooleanSchema.default(false).optional().describe("是否还有更深层级的子节点"),
      })).describe("当前节点的可选子节点列表"),
      onNodeNavigate: ActionSchema.optional().describe("点击任意节点（包括面包屑和子节点）时触发的导航操作"),
    })
    .strict(),
} satisfies ComponentApi;

export const LearningPathApi = {
  name: "LearningPath",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.describe("学习路径标题，例如 '从零开始学 React'"),
      steps: z
        .array(
          z.object({
            id: z.string(),
            title: DynamicStringSchema.describe("节点名称，例如 '认识 JSX'"),
            description: DynamicStringSchema.optional().describe("节点简短描述"),
            targetSurfaceId: z.string().optional().describe("点击该节点后要滚动到的 surface ID，与 createSurface.surfaceId 对应"),
          })
        )
        .describe("学习路径的有序节点列表，按照先后顺序排列"),
      activeStepId: z.string().describe("当前用户所处的节点 ID（游标）。前端会自动将此节点之前的标记为已完成，之后的标记为未解锁。"),
      onStepSelect: ActionSchema.optional().describe("用户点击某个节点时触发，参数为 { stepId }。前端会自动乐观更新游标状态。"),
    })
    .strict(),
} satisfies ComponentApi;

export const FlashcardApi = {
  name: "Flashcard",
  schema: z
    .object({
      ...CommonProps,
      front: DynamicStringSchema.describe("闪卡正面内容 (Markdown)"),
      back: DynamicStringSchema.describe("闪卡反面内容 (Markdown)"),
      isFlipped: DynamicBooleanSchema.default(false).optional(),
      onFeedback: ActionSchema.optional().describe("用户反馈操作 (如掌握/需强化)"),
    })
    .strict(),
} satisfies ComponentApi;

export const QuizCardApi = {
  name: "QuizCard",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.optional().describe("可选的测验集标题，例如 '随堂小测'"),
      questions: z.array(
        z.object({
          id: z.string().describe("题目唯一 ID"),
          question: DynamicStringSchema.describe("问题文本（支持 Markdown）"),
          options: z.array(DynamicStringSchema).describe("选项列表"),
          correctIndex: z.union([z.number(), z.array(z.number())]).describe("正确选项的索引，单选为数字，多选为数组"),
          explanation: DynamicStringSchema.optional().describe("答案解析（作答后展示）"),
        })
      ).describe("测验题目列表，支持单题或多题"),
    })
    .strict(),
} satisfies ComponentApi;

export const ConceptCardApi = {
  name: "ConceptCard",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.describe("概念名称"),
      tags: z.array(DynamicStringSchema).optional().describe("概念标签列表"),
      definition: DynamicStringSchema.describe("核心定义（支持 Markdown）"),
      example: DynamicStringSchema.optional().describe("相关案例或代码（支持 Markdown）"),
      relatedConcepts: z.array(DynamicStringSchema).optional().describe("关联概念名称列表"),
      onConceptClick: ActionSchema.optional().describe("点击关联概念时触发的操作"),
    })
    .strict(),
} satisfies ComponentApi;

const ResourceItemSchema = z.object({
  title: DynamicStringSchema.describe("资源标题"),
  url: DynamicStringSchema.describe("资源链接"),
  description: DynamicStringSchema.optional().describe("资源简介"),
  type: z.enum(["wiki", "video", "article", "github", "doc", "other"]).default("article").optional().describe("资源类型"),
});

const TestCaseSchema = z.object({
  input: DynamicStringSchema.describe("测试输入"),
  expectedOutput: DynamicStringSchema.describe("预期输出"),
  actualOutput: DynamicStringSchema.optional().describe("实际输出"),
  status: z.enum(["pending", "passed", "failed"]).default("pending").optional().describe("测试状态"),
});

export const AchievementApi = {
  name: "Achievement",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.describe("成就名称"),
      description: DynamicStringSchema.describe("成就描述"),
      icon: DynamicStringSchema.describe("徽章图标 (Emoji 或 URL)"),
      unlockedAt: DynamicStringSchema.optional().describe("解锁时间/日期文本"),
    })
    .strict(),
} satisfies ComponentApi;

export const ResourceListApi = {
  name: "ResourceList",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.optional().describe("模块标题（如：延伸阅读）"),
      resources: z.array(ResourceItemSchema).describe("资源列表"),
    })
    .strict(),
} satisfies ComponentApi;

// [Removed InteractiveDialogApi and OnlineJudgeApi]

export const CourseOutlineApi = {
  name: "CourseOutline",
  schema: z
    .object({
      ...CommonProps,
      courseTitle: DynamicStringSchema.describe("课程大纲的总标题，如 '正则表达式从入门到精通'"),
      description: DynamicStringSchema.optional().describe("课程整体简介"),
      modules: z.array(
        z.object({
          id: z.string().describe("模块唯一 ID"),
          title: DynamicStringSchema.describe("模块标题，如 '第一章：认识元字符'"),
          description: DynamicStringSchema.optional().describe("模块的一句话简介"),
          status: z.enum(["locked", "current", "completed", "expanded"]).describe("该模块当前的状态"),
        })
      ).describe("课程大纲的模块列表"),
      onModuleSelect: ActionSchema.optional().describe("当用户点击某个模块时触发。Agent 收到后，应该在该模块下方原位生成（展开）子网页的组件内容。"),
    })
    .strict(),
} satisfies ComponentApi;

export const SectionNavigatorApi = {
  name: "SectionNavigator",
  schema: z
    .object({
      ...CommonProps,
      sections: z.array(z.object({
        id: z.string().describe("章节 ID"),
        title: DynamicStringSchema.describe("章节标题"),
        description: DynamicStringSchema.optional().describe("章节简短描述"),
        icon: DynamicStringSchema.optional().describe("章节图标 (Emoji)"),
        // Keep backward compatibility with existing examples ("current"/"pending").
        status: z
          .enum(["locked", "available", "pending", "current", "completed"])
          .default("available")
          .describe("章节状态"),
      })).describe("章节列表"),
      activeSectionId: z.string().optional().describe("当前激活的章节 ID"),
      onSectionClick: ActionSchema.optional().describe("点击章节卡片时触发的操作，用于 Agent 进行页面级路由切换"),
    })
    .strict(),
} satisfies ComponentApi;

export const ClozeTestApi = {
  name: "ClozeTest",
  schema: z
    .object({
      ...CommonProps,
      text: DynamicStringSchema.describe("包含占位符（如 ___）的文本"),
      correctAnswers: z.array(DynamicStringSchema).describe("按顺序排列的正确答案数组，用于前端闭环校验"),
      explanation: DynamicStringSchema.optional().describe("答案解析或反馈（支持 Markdown），在用户提交且回答错误时前端会自动展示"),
      onSubmit: ActionSchema.optional().describe("用户点击提交时触发，参数为 { isCorrect, userAnswers }，用于向 Agent 汇报结果"),
    })
    .strict(),
} satisfies ComponentApi;

export const DragAndDropMatchApi = {
  name: "DragAndDropMatch",
  schema: z
    .object({
      ...CommonProps,
      leftItems: z.array(z.object({
        id: z.string(),
        content: DynamicStringSchema.describe("左侧项目内容"),
      })).describe("左侧项目列表"),
      rightItems: z.array(z.object({
        id: z.string(),
        content: DynamicStringSchema.describe("右侧项目内容（应乱序）"),
      })).describe("右侧项目列表"),
      correctMatches: z.record(z.string()).describe("正确的匹配关系映射 {leftId: rightId}，用于前端闭环校验"),
      onMatchComplete: ActionSchema.optional().describe("用户完成连线校验时触发，参数为 { isCorrect }，用于向 Agent 汇报结果"),
    })
    .strict(),
} satisfies ComponentApi;

export const TimelineApi = {
  name: "Timeline",
  schema: z
    .object({
      ...CommonProps,
      events: z.array(z.object({
        id: z.string(),
        time: DynamicStringSchema.describe("时间点文本"),
        title: DynamicStringSchema.describe("事件标题"),
        description: DynamicStringSchema.optional().describe("事件描述"),
      })).describe("时间轴节点列表"),
      orientation: z.enum(["vertical", "horizontal"]).default("vertical").optional().describe("布局方向"),
      onEventSelect: ActionSchema.optional().describe("点击事件节点时触发"),
    })
    .strict(),
} satisfies ComponentApi;

export const CodeSnippetApi = {
  name: "CodeSnippet",
  schema: z
    .object({
      ...CommonProps,
      code: DynamicStringSchema.describe("代码内容"),
      language: DynamicStringSchema.default("plaintext").optional().describe("代码语言，如 javascript, python, css 等"),
      title: DynamicStringSchema.optional().describe("代码块标题或文件名"),
      highlightLines: z.array(z.number()).optional().describe("需要高亮显示的行号数组（从 1 开始）"),
    })
    .strict(),
} satisfies ComponentApi;

export const AnalogyCardApi = {
  name: "AnalogyCard",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.default("打个比方").describe("类比卡片的标题"),
      icon: DynamicStringSchema.default("💡").describe("类比卡片的图标 (Emoji)"),
      analogy: DynamicStringSchema.describe("类比或故事的详细内容（支持 Markdown）"),
    })
    .strict(),
} satisfies ComponentApi;

export const ScenarioDialogueApi = {
  name: "ScenarioDialogue",
  schema: z
    .object({
      ...CommonProps,
      topic: DynamicStringSchema.optional().describe("对话主题（如 '关于 Virtual DOM 的探讨'）"),
      characters: z.record(
        z.string(),
        z.object({
          name: DynamicStringSchema.describe("角色名称"),
          avatar: DynamicStringSchema.optional().describe("头像 (Emoji 或 URL)"),
          alignment: z.enum(["left", "right"]).describe("气泡对齐方向"),
        })
      ).describe("角色字典表，key 为 characterId"),
      messages: z.array(
        z.object({
          characterId: z.string().describe("发言角色的 ID"),
          content: DynamicStringSchema.describe("发言内容（支持 Markdown）"),
          delayMs: z.number().optional().describe("可选：此消息弹出前的延迟毫秒数，用于模拟真实打字停顿"),
        })
      ).describe("对话消息列表"),
    })
    .strict(),
} satisfies ComponentApi;

export const DeepDivePromptApi = {
  name: "DeepDivePrompt",
  schema: z
    .object({
      ...CommonProps,
      prompts: z.array(z.object({
        id: z.string(),
        label: DynamicStringSchema.describe("提示选项的文本，如 '举个生活中的例子'"),
        icon: DynamicStringSchema.optional().describe("提示选项的图标 (Emoji)，如 '🤔'"),
      })).describe("深挖选项列表"),
      selectedId: z.string().optional().describe("当前被用户选中的提示 ID"),
      onPromptSelect: ActionSchema.optional().describe("用户点击提示按钮时触发，Agent 收到后应在下方追加新内容"),
    })
    .strict(),
} satisfies ComponentApi;

export const SmartAnnotationBoardApi = {
  name: "SmartAnnotationBoard",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.describe("组件标题，如 '请翻译这段话' 或 '请简述你的方案'"),
      prompt: DynamicStringSchema.optional().describe("具体要求或提示"),
      userContent: DynamicStringSchema.optional().describe("用户提交的文本内容（用于 Agent 恢复状态）"),
      status: z.enum(["idle", "reviewing", "reviewed"]).default("idle").optional().describe("处理状态"),
      feedback: z.object({
        score: z.number().optional().describe("可选评分 (0-100)"),
        overallComment: DynamicStringSchema.optional().describe("可选的总体评价（支持 Markdown）"),
        inlineAnnotations: z.array(z.object({
          quote: DynamicStringSchema.describe("原文本中被批注的片段"),
          comment: DynamicStringSchema.describe("Agent 针对该片段的批注建议"),
          type: z.enum(["good", "error", "suggestion"]).describe("批注类型：好句、错误、建议"),
        })).optional().describe("行内批注列表"),
      }).optional().describe("Agent 提供的处理结果，仅在 reviewed 状态下下发"),
      onSubmit: ActionSchema.optional().describe("用户点击提交时触发，参数为 { content }，发给 Agent 进行分析"),
    })
    .strict(),
} satisfies ComponentApi;

export const DocumentFigureApi = {
  name: "DocumentFigure",
  schema: z
    .object({
      ...CommonProps,
      imageUrl: DynamicStringSchema.describe("图片在 OSS 或公网的访问地址"),
      caption: DynamicStringSchema.optional().describe("原文的图例说明（Figure Caption）"),
      aiExplanation: DynamicStringSchema.optional().describe("Agent 针对这张图给出的多模态深度解析（支持 Markdown）"),
      hotspots: z.array(z.object({
        id: z.string().describe("热点唯一标识"),
        x: z.number().describe("热点中心点 X 坐标百分比 (0-100)"),
        y: z.number().describe("热点中心点 Y 坐标百分比 (0-100)"),
        label: DynamicStringSchema.describe("热点标题，如 'Encoder Block'"),
        description: DynamicStringSchema.optional().describe("热点的详细解释"),
      })).optional().describe("用于在图片上覆盖交互式讲解气泡的坐标数组"),
      onHotspotClick: ActionSchema.optional().describe("点击某个热点时触发，可用于 Agent 补充讲解"),
    })
    .strict(),
} satisfies ComponentApi;

export const InteractiveSandboxApi = {
  name: "InteractiveSandbox",
  schema: z
    .object({
      ...CommonProps,
      title: DynamicStringSchema.optional().describe("沙盒标题"),
      description: DynamicStringSchema.optional().describe("沙盒说明/提示"),
      code: DynamicStringSchema.describe("初始代码或配置内容"),
      language: z.enum(["html", "javascript", "css", "python"]).default("html").optional().describe("代码语言"),
      output: DynamicStringSchema.optional().describe("执行输出或渲染结果"),
      status: z.enum(["idle", "running", "success", "error"]).default("idle").optional().describe("执行状态"),
      onRunCode: ActionSchema.optional().describe("点击运行按钮时触发的操作（用于 Agent 收集行为）"),
      runLocally: DynamicBooleanSchema.default(true).optional().describe("是否在前端直接通过 iframe 渲染代码或利用 Pyodide 执行 Python"),
      testCases: z.array(
        z.object({
          input: DynamicStringSchema.describe("测试输入描述，例如 'fibonacci(10)'"),
          expectedOutput: DynamicStringSchema.describe("期望输出，例如 '55'"),
        })
      ).optional().describe("可选：如果提供此字段，沙盒将变成评测模式 (OJ 模式)"),
      onStatusChange: ActionSchema.optional().describe("状态改变时触发"),
    })
    .strict(),
} satisfies ComponentApi;
