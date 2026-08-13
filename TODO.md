# TODO

## 自动分页演示模式：待修复交互

自动分页、全屏展示和超长内容滚动已经实现，但以下交互在 macOS 实际预览中未能稳定工作，本轮暂停继续修复：

- 右键（包括触控板辅助点击与 Control+点击）无法可靠触发“下一页”。
- `LearningPath` 的全屏跳转已改为让稳定存在的 `surface-container` 进入全屏，因此跨 surface 重渲染会保留全屏状态；仍需在真实浏览器中回归验证。

后续需要在真实 macOS 浏览器中使用开发者工具检查事件路径、分页页码和 hash 路由变化，再决定是保留右键手势还是改为键盘/显式按钮导航。

## Paper2UI：PDF 图表自动提取与视觉热点定位流水线 (DocumentFigure Pipeline)

- **目标**：实现用户上传 PDF 学术论文后，系统自动解析提取高清插图/架构图，并由 Vision 大模型自动估算关键模块坐标生成 `DocumentFigure`。
- **关键链路**：
  1. 后端集成 `PyMuPDF / pdfplumber` 实现嵌入式图片秒级切分并存储到静态资源目录；
  2. 多模态 Vision 模型（如 Gemini 1.5 Pro / GPT-4o）识别核心模块并输出 `(x, y)` 百分比热点坐标与白话解析；
  3. 组装为标准 `DocumentFigure` A2UI 消息下发。
