# Agent Pipeline 设计文档（OpenRouter + LangGraph）

## 目标

在最短路径内实现：

- 输入教学资源（文件或目录）
- AI 进行一次性理解与生成
- 使用 A2UI 框架渲染并产出可访问教学网站 URL

## 处理流程

1. 资源读取：扫描文件/目录，提取文本内容。
2. 课程规划：LLM 生成课程标题、受众、章节结构。
3. 站点内容生成：LLM 生成每章讲解、要点、练习与测验。
4. A2UI 消息转换：将结构化结果转为 A2UI v0.9 messages。
5. A2UI 渲染：通过 `@a2ui/lit` + `@a2ui/web_core` 渲染页面。
6. 本地发布：Vite 启动 viewer 并返回 URL。

## LangGraph 状态图（线性图）

- `load_resource` -> `plan_curriculum` -> `build_site` -> `export_messages`

状态字段：

- `resource_path`: 输入路径
- `resource_text`: 解析后的资源文本
- `course_json`: 课程结构化数据
- `a2ui_messages`: A2UI 消息数组
- `output_dir`: 输出目录

## OpenRouter 配置

- 环境变量：
  - `OPENROUTER_API_KEY`（必填，若希望真实 LLM 生成）
  - `OPENROUTER_MODEL`（可选，默认一个通用模型）
- 通过 `langchain_openai.ChatOpenAI` 配置：
  - `base_url=https://openrouter.ai/api/v1`
  - `api_key=$OPENROUTER_API_KEY`

## 失败与降级策略

- 若无 API Key 或调用失败，启用本地 fallback 生成最小课程结构，确保始终能产出网站。
- 限制读取体量，避免超大资源导致提示词过长。

## 输出结构（当前实现）

- `outputs/<task_id>/site.json`
- `outputs/<task_id>/site_messages.json`
- `apps/viewer/public/generated/site_messages.json`
- 预览 URL：`http://127.0.0.1:<port>`

## 下一步演进

- 将 HTML 生成层替换为 A2UI v0.9 渲染层。
- 增加聊天增量修改接口（编辑章节、替换练习、更新难度）。
- 增加 Deep Mode（无预设目标的自主迭代）。
