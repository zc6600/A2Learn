# Changelog

本文件记录 `@a2learn/embed` 的对外变更历史。

## 版本策略

本包遵循语义化版本（SemVer）：`MAJOR.MINOR.PATCH`。

- **MAJOR**：破坏性变更（Breaking Change）
- **MINOR**：向后兼容的新功能
- **PATCH**：向后兼容的修复

### 什么算 Breaking Change

满足任一条即视为 Breaking Change：

- 移除或重命名导出（例如 `createA2LearnEmbed` / `A2LearnEmbedElement`）
- 改变 `ViewerSource` / `CreateEmbedOptions` 等类型字段的含义或默认值，导致现有集成行为变化
- 改变 `postMessage` 协议的消息类型或字段（例如 `a2learn:init`、`a2learn:resize`、`a2learn:ready`）
- 默认启用更严格的 iframe `sandbox` 或 `referrerPolicy` 导致现有集成不可用

### 不算 Breaking Change

- 新增可选字段（例如新增 `themeVars?: Record<string, string>`）
- 修复 bug 且不改变对外契约

## 0.1.0

- 初始发布：提供 `createA2LearnEmbed()` 与 `<a2learn-embed>`，支持离线 `messagesUrl` 与在线 `apiBaseUrl`，并支持主题变量 `themeVars`。

