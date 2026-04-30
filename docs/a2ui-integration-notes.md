# A2UI 集成知识记录

## 目标

记录 A2Learn 在后续集成 A2UI 时需要用到的关键知识点、代码路径和落地建议。

## 版本与渲染器选择

- 新项目建议优先 A2UI v0.9。
- Web 端可选渲染器：
  - `@a2ui/lit` + `@a2ui/web_core`
  - `@a2ui/react` + `@a2ui/web_core`
  - `@a2ui/angular` + `@a2ui/web_core`

## 关键代码入口（A2UI 仓库）

- Lit 示例客户端：
  - `third_party/A2UI/samples/client/lit/shell/app.ts`
  - `third_party/A2UI/samples/client/lit/shell/client.ts`
- v0.9 基础渲染器说明：
  - `third_party/A2UI/renderers/lit/README.md`
  - `third_party/A2UI/renderers/react/README.md`
- 客户端接入指南：
  - `third_party/A2UI/docs/guides/client-setup.md`
- MCP 集成指南：
  - `third_party/A2UI/docs/guides/a2ui_over_mcp.md`

## 最小接入心智模型（v0.9）

1. 客户端创建 `MessageProcessor`，传入 catalog（如 `basicCatalog`）。
2. Agent 返回 A2UI 消息流（如 `createSurface`, `updateComponents`, `updateDataModel`）。
3. 客户端 `processMessages()`，然后用 `A2uiSurface` 渲染 surface。
4. 用户触发组件动作后，客户端把 action 发送回 Agent。

## Agent 与 A2UI 的关系

- 当前实现采用 Agent 直接产出 A2UI 消息：
  - LangGraph 读取资源并触发 LLM 生成消息数组。
  - Python 对 A2UI v0.9 messages 做严格校验并导出。
  - `apps/viewer` 使用 `@a2ui/lit` 渲染 messages。

## A2Learn 当前实现代码点

- 生成器（OpenRouter + LangGraph）：`agent/main.py`、`agent/engine.py`
- 消息落盘：`outputs/<task_id>/site_messages.json`
- A2UI 前端渲染器：`apps/viewer/src/main.ts`

## MCP 方向（后续）

如果走 MCP：

- 服务端通过 `tools/call` 返回 `application/json+a2ui` 的 Embedded Resource。
- 客户端检测 MIME 后交给 A2UI 渲染器。
- action/error 通过 MCP tool 回调服务端。

## 安全注意

- 所有 Agent 输出的 UI 数据视作不可信输入。
- 需做数据校验、渲染隔离、链接白名单、CSP 等安全措施。
- 生产环境禁止把敏感凭据暴露给前端。
