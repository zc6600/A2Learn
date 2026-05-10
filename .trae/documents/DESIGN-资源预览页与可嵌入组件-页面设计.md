# 页面设计文档（桌面优先）

## 全局设计规范
### Layout
- 框架：页面主体使用 CSS Grid（12 列），内容区最大宽度 1200px；两侧留白自适应。
- 间距：8px 基准（8/16/24/32）。卡片/区块之间默认 16px。
- 响应式：
  - Desktop ≥ 1024：左右分栏（表单/预览、设置/摘要）。
  - Tablet 768–1023：分栏变窄，关键区块仍双列。
  - Mobile ≤ 767：单列堆叠（可选支持）。

### Meta Information
- 默认 Title：资源预览 Viewer
- Description：将资源转为可分享预览页，并支持嵌入。
- Open Graph：`og:title`、`og:description`、`og:type=website`（预览页可带 `og:image` 可选）。

### Global Styles（Design Tokens）
- 背景：`--bg: #0B0F14`（暗） / `#F6F7F9`（亮），默认跟随系统。
- 卡片：圆角 12px；边框 `rgba(255,255,255,0.08)`（暗）/ `rgba(0,0,0,0.08)`（亮）。
- 字体：系统字体栈；标题 20/16/14，正文 14，辅助 12。
- 主色：`--brand: #4F46E5`（可配置）。
- 按钮：Primary/Secondary/Ghost；hover 提升亮度+阴影；disabled 40% 透明。
- 链接：下划线仅在 hover；外链图标提示。

---

## Page 1：集成向导页（/）
### Page Structure
- 顶部：导航栏（Logo/产品名、右侧“设置”入口）。
- 主体：两列布局
  - 左列（配置区）：模式选择 + 参数表单 + 生成结果
  - 右列（测试区）：内嵌预览（iframe/SDK 容器）+ 调试信息

### Sections & Components
1) 导航栏（Sticky）
- 左：产品名“Preview Embed”
- 右：按钮“外观与访问设置”跳转 `/settings`

2) 模式选择卡片
- 单选：
  - 离线 messages URL
  - 在线 API
- 每项下方一行说明（需要 CORS / 需要 endpoint+resourceId）

3) 参数配置表单
- 离线模式字段：
  - `messagesUrl`（必填，URL 校验）
- 在线模式字段：
  - `apiEndpoint`（必填）
  - `resourceId`（必填）
  - `headers`（可选，键值对编辑器；提示“不要放长期密钥到 URL”）
- 表单底部：按钮
  - “生成预览链接”
  - “生成嵌入代码”

4) 生成结果区
- 预览链接（只读输入框 + 复制按钮）
- iframe 代码块（可选参数：width/height、响应式、主题）
- JS SDK 代码块（示例：`createPreviewEmbed(...)`）

5) 在线测试区
- Tab：
  - “iframe 预览”
  - “SDK 预览”
- 预览容器：固定最小高度 520px；加载 skeleton
- 调试信息面板（折叠）：展示请求耗时、错误码、CORS 提示文案

---

## Page 2：资源预览页（/preview）
### Page Structure
- 顶部轻量工具条（可隐藏，嵌入时默认隐藏）：标题、刷新、复制链接。
- 内容区：消息流（卡片列表/时间线）。

### Sections & Components
1) 数据加载层
- 参数来源优先级：
  1) JS SDK 注入（运行时）
  2) URL query（分享链接）
- 加载策略：先展示骨架屏；请求完成后渲染。

2) 消息渲染器（MessageRenderer）
- text：等宽/比例字体切换（可选）；长文本折叠“展开/收起”。
- image：自适应宽度，点击新窗口打开。
- file/link：展示文件名/URL、mime（若有）、“下载/打开”按钮。

3) 状态与错误
- 空态：提示“无可预览内容”。
- 错误态：
  - 网络失败：显示“重试”
  - 401/403：提示“鉴权失败（建议使用 SDK 运行时注入 token）”
  - CORS：提示需要在源站开启允许域名
  - 数据格式：提示返回 JSON 不符合契约

4) iframe 自适应
- 使用 `postMessage` 向父页面发送高度变化事件（仅对允许的父 origin 生效）。

---

## Page 3：外观与访问设置页（/settings）
### Page Structure
- 左侧：设置表单（主题/布局/访问策略提示）
- 右侧：实时预览缩略（小型预览组件）+ 集成摘要

### Sections & Components
1) 主题设置
- 品牌色选择器（brandColor）
- 字体选择（系统/自定义）
- 暗色模式：system/light/dark
- 密度：comfortable/compact

2) 访问策略（可选能力提示）
- 有效期：下拉（1 天/7 天/30 天/不限）
- 嵌入域名白名单：多行输入（提示“前端校验为主，真正限制需服务端支持”）

3) 集成摘要
- 以清单形式展示：
  - 离线 URL 的 CORS/缓存要求
  - 在线 API 的 endpoint/auth 建议
  - 推荐的嵌入方式（iframe/SDK）
- 每项带“复制示例”按钮
