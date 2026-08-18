"""Viewer-Powered Benchmark HTML Previewer & Interactive Workbench.

Directly loads and uses A2Learn Production WebComponents & Lit Engine
without redundant or handwritten component rendering implementations.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .evaluators.overall import BenchmarkScorecard
from .evaluators.schema_evaluator import parse_raw_llm_json


VIEWER_ARENA_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN" data-a2learn-theme="learning-default">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A2Learn · AI 交互教学评测工作台</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  __A2LEARN_BUNDLE_INJECTIONS__
  <style>
    :root {
      --bg-page: #f9f9f9;
      --bg-surface: #ffffff;
      --bg-subtle: #f5f5f5;
      --border-color: #e5e5e5;
      --border-strong: #d4d4d8;
      --text-primary: #0d0d0d;
      --text-secondary: #52525b;
      --text-muted: #71717a;
      --accent-primary: #171717;
      --accent-badge: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      --accent-emerald: #059669;
      --accent-rose: #e11d48;
      --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
      --a2learn-shell-radius: 16px;
      --a2learn-control-radius: 10px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background-color: var(--bg-page);
      color: var(--text-primary);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Control Bar */
    header.arena-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-color);
      padding: 0.85rem 1.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .brand-badge {
      background: var(--accent-badge);
      color: #fff;
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.3rem 0.65rem;
      border-radius: 8px;
      letter-spacing: 0.04em;
    }
    .brand-title {
      font-size: 1.05rem;
      font-weight: 750;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .controls-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .task-selector-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .task-selector {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 550;
      outline: none;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: border-color 0.15s ease;
    }
    .task-selector:hover, .task-selector:focus {
      border-color: var(--accent-primary);
    }

    .model-tabs {
      display: flex;
      background: #ededf0;
      padding: 0.25rem;
      border-radius: 10px;
      gap: 0.25rem;
    }

    .model-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 0.825rem;
      font-weight: 600;
      padding: 0.4rem 0.9rem;
      border-radius: 7px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .model-tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.6);
    }

    .model-tab-btn.active {
      background: #18181b;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    .tab-score-badge {
      background: rgba(0, 0, 0, 0.08);
      color: var(--text-secondary);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .model-tab-btn.active .tab-score-badge {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
    }

    /* Scorecard Ribbon */
    .scorecard-ribbon {
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.85rem;
    }

    .metric-group {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .metric-chip {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--text-secondary);
      font-size: 0.825rem;
    }

    .metric-value {
      font-weight: 700;
      color: var(--text-primary);
    }
    .metric-value.highlight {
      color: var(--accent-emerald);
      font-size: 0.95rem;
    }

    /* Main Viewer Surface Container aligned with A2Learn Website */
    main.viewer-container {
      flex: 1;
      max-width: 880px;
      width: 100%;
      margin: 1.75rem auto 3.5rem;
      padding: 0 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .viewer-error-box {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 12px;
      padding: 1.5rem;
      color: #be123c;
      text-align: center;
      font-size: 0.9rem;
    }

    /* Raw JSON Modal */
    .raw-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .raw-modal-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      width: 100%;
      max-width: 880px;
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.15);
    }
    .raw-modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-surface);
    }
    .raw-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      background: #18181b;
      font-family: var(--font-mono);
      font-size: 0.825rem;
      color: #7dd3fc;
      white-space: pre-wrap;
    }
    .btn-secondary {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary:hover {
      background: var(--bg-subtle);
      border-color: var(--border-strong);
    }
  </style>
</head>
<body>

  <!-- Top Control Bar -->
  <header class="arena-header">
    <div class="brand-section">
      <span class="brand-badge">A2UI ARENA</span>
      <h1 class="brand-title">A2Learn 教学质量交互评测工作台</h1>
    </div>

    <div class="controls-section">
      <div class="task-selector-group">
        <label for="taskSelect">评测任务:</label>
        <select id="taskSelect" class="task-selector" onchange="onTaskChange(this.value)">
          <!-- Populated by JS -->
        </select>
      </div>

      <div id="modelTabsContainer" class="model-tabs">
        <!-- Populated by JS -->
      </div>

      <button class="btn-secondary" onclick="openRawModal()">🔍 查看原始 JSON</button>
    </div>
  </header>

  <!-- Scorecard Ribbon -->
  <div class="scorecard-ribbon">
    <div class="metric-group">
      <div class="metric-chip">综合教学分: <span id="mPedagogy" class="metric-value highlight">--</span></div>
      <div class="metric-chip">阐释清晰度: <span id="mClarity" class="metric-value">--</span></div>
      <div class="metric-chip">问题驱动性: <span id="mProblem" class="metric-value">--</span></div>
      <div class="metric-chip">认知负荷控制: <span id="mJargon" class="metric-value">--</span></div>
      <div class="metric-chip">整体连贯度: <span id="mCoherence" class="metric-value">--</span></div>
    </div>
    <div class="metric-group">
      <div class="metric-chip">事实吻合度: <span id="mFacts" class="metric-value">--</span></div>
      <div class="metric-chip">权威外链: <span id="mUrls" class="metric-value">--</span></div>
      <div class="metric-chip">生成耗时: <span id="mLatency" class="metric-value">--</span></div>
    </div>
  </div>

  <!-- Main Viewer Content Root (Rendered by A2Learn Production WebComponents Engine) -->
  <main id="viewerRoot" class="viewer-container">
    <div class="viewer-state">正在加载 A2Learn 原生渲染引擎...</div>
  </main>

  <!-- Raw JSON Modal -->
  <div id="rawModal" class="raw-modal" onclick="if(event.target === this) closeRawModal()">
    <div class="raw-modal-box">
      <div class="raw-modal-header">
        <h3 style="font-size: 1rem; color: #fff;">A2UI 协议消息 Payload</h3>
        <button class="btn-secondary" onclick="closeRawModal()">关闭</button>
      </div>
      <pre id="rawJsonContent" class="raw-modal-body"></pre>
    </div>
  </div>

  <!-- Scripts at the bottom of body so DOM is fully ready -->
  __A2LEARN_BUNDLE_SCRIPT__

  <script>
    const BENCHMARK_DATA = __ARENA_DATA_PLACEHOLDER__;

    let currentTaskId = Object.keys(BENCHMARK_DATA.tasks)[0] || "";
    let currentModel = "";

    function initArena() {
      const taskSelect = document.getElementById("taskSelect");
      taskSelect.innerHTML = "";
      Object.keys(BENCHMARK_DATA.tasks).forEach(tId => {
        const opt = document.createElement("option");
        opt.value = tId;
        opt.textContent = BENCHMARK_DATA.tasks[tId].title || tId;
        taskSelect.appendChild(opt);
      });

      if (currentTaskId) {
        taskSelect.value = currentTaskId;
        renderModelTabsForTask(currentTaskId);
      }
    }

    function onTaskChange(newTaskId) {
      currentTaskId = newTaskId;
      renderModelTabsForTask(newTaskId);
    }

    function renderModelTabsForTask(tId) {
      const tabsContainer = document.getElementById("modelTabsContainer");
      tabsContainer.innerHTML = "";
      const models = BENCHMARK_DATA.tasks[tId]?.models || {};
      const modelKeys = Object.keys(models);
      
      if (!currentModel || !models[currentModel]) {
        currentModel = modelKeys[0] || "";
      }

      modelKeys.forEach((mKey, idx) => {
        const mData = models[mKey];
        const btn = document.createElement("button");
        btn.className = `model-tab-btn ${mKey === currentModel ? 'active' : ''}`;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        const score = mData?.pedagogy?.overall_pedagogy_score || '--';
        btn.innerHTML = `${medal} ${mKey.split('/')[1] || mKey} <span class="tab-score-badge">${score}分</span>`;
        btn.onclick = () => selectModel(mKey);
        tabsContainer.appendChild(btn);
      });

      renderCurrentModelView();
    }

    function selectModel(mKey) {
      currentModel = mKey;
      const btns = document.querySelectorAll(".model-tab-btn");
      btns.forEach(b => {
        if (b.textContent.includes(mKey.split('/')[1] || mKey)) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
      renderCurrentModelView();
    }

    function renderCurrentModelView() {
      const taskData = BENCHMARK_DATA.tasks[currentTaskId];
      const modelData = taskData?.models[currentModel];
      if (!modelData) return;

      // 1. Update Score Ribbon
      const p = modelData.pedagogy || {};
      document.getElementById("mPedagogy").textContent = (p.overall_pedagogy_score || '--') + ' / 100';
      document.getElementById("mClarity").textContent = p.explanatory_clarity || '--';
      document.getElementById("mProblem").textContent = p.problem_driven || '--';
      document.getElementById("mJargon").textContent = p.cognitive_load_and_jargon || '--';
      document.getElementById("mCoherence").textContent = p.structural_coherence || '--';
      document.getElementById("mFacts").textContent = (modelData.verifiable_facts?.score || 100) + ' / 100';
      document.getElementById("mUrls").textContent = (modelData.verifiable_facts?.valid_urls_count || 0) + ' 个';
      document.getElementById("mLatency").textContent = (modelData.latency_seconds || '--') + 's';

      // 2. Render Components into Viewer Root using A2Learn Production Engine
      const root = document.getElementById("viewerRoot");
      root.innerHTML = "";

      const rawPayload = modelData.raw_payload;

      const tryRender = () => {
        if (window.A2LearnBenchmarkRenderer && typeof window.A2LearnBenchmarkRenderer.renderBenchmarkA2UISurface === 'function') {
          if (rawPayload && (Object.keys(rawPayload).length > 0 || (Array.isArray(rawPayload) && rawPayload.length > 0))) {
            window.A2LearnBenchmarkRenderer.renderBenchmarkA2UISurface(root, rawPayload);
            return true;
          }
        }
        return false;
      };

      if (!tryRender()) {
        setTimeout(tryRender, 100);
      }
    }

    function openRawModal() {
      const taskData = BENCHMARK_DATA.tasks[currentTaskId];
      const modelData = taskData?.models[currentModel];
      document.getElementById("rawJsonContent").textContent = JSON.stringify(modelData?.raw_payload || {}, null, 2);
      document.getElementById("rawModal").style.display = "flex";
    }

    function closeRawModal() {
      document.getElementById("rawModal").style.display = "none";
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initArena);
    } else {
      initArena();
    }
  </script>
</body>
</html>
"""


def generate_viewer_arena_html(
    scorecards: list[BenchmarkScorecard],
    task_outputs: dict[str, dict[str, Any]] | None = None,
) -> str:
    """Compile benchmark results and full A2UI component payloads into an interactive Viewer Arena."""
    arena_data: dict[str, Any] = {"tasks": {}}

    for sc in scorecards:
        t_id = sc.task_id
        if t_id not in arena_data["tasks"]:
            arena_data["tasks"][t_id] = {
                "title": t_id.replace("_", " ").title(),
                "models": {},
            }

        # Extract raw payload from task_outputs or scorecard directly
        raw_out = (task_outputs or {}).get(t_id, {}).get(sc.model) or getattr(sc, "raw_output", None)
        raw_payload = {}
        if raw_out:
            try:
                parsed = parse_raw_llm_json(raw_out) if isinstance(raw_out, str) else raw_out
                raw_payload = parsed
            except Exception:
                raw_payload = {"raw_text": str(raw_out)}

        arena_data["tasks"][t_id]["models"][sc.model] = {
            "model": sc.model,
            "latency_seconds": sc.latency_seconds,
            "pedagogy": {
                "explanatory_clarity": sc.pedagogy_judge.explanatory_clarity,
                "problem_driven": sc.pedagogy_judge.problem_driven,
                "cognitive_load_and_jargon": sc.pedagogy_judge.cognitive_load_and_jargon,
                "structural_coherence": sc.pedagogy_judge.structural_coherence,
                "overall_pedagogy_score": sc.pedagogy_judge.overall_pedagogy_score,
                "strengths": sc.pedagogy_judge.strengths,
                "flaws": sc.pedagogy_judge.flaws,
            },
            "verifiable_facts": {
                "score": sc.verifiable_facts.score,
                "valid_urls_count": sc.verifiable_facts.valid_urls_count,
                "matched_facts": sc.verifiable_facts.matched_facts,
                "total_facts": sc.verifiable_facts.total_facts,
            },
            "raw_payload": raw_payload,
        }

    # Sort models per task by pedagogy score descending
    for t_id in arena_data["tasks"]:
        models_dict = arena_data["tasks"][t_id]["models"]
        sorted_models = dict(sorted(models_dict.items(), key=lambda x: x[1]["pedagogy"]["overall_pedagogy_score"], reverse=True))
        arena_data["tasks"][t_id]["models"] = sorted_models

    json_blob = json.dumps(arena_data, ensure_ascii=False)
    html_content = VIEWER_ARENA_TEMPLATE.replace("__ARENA_DATA_PLACEHOLDER__", json_blob)

    # Link compiled production A2Learn IIFE runtime bundle
    html_content = html_content.replace("__A2LEARN_BUNDLE_INJECTIONS__", '<link rel="stylesheet" href="./assets/style.css">')
    html_content = html_content.replace("__A2LEARN_BUNDLE_SCRIPT__", '<script src="./assets/a2learn-viewer-runtime.iife.js"></script>')
    return html_content


def save_viewer_arena_html(
    scorecards: list[BenchmarkScorecard],
    reports_dir: str | Path | None = None,
    run_id: str | None = None,
    task_outputs: dict[str, dict[str, Any]] | None = None,
) -> str:
    """Save the interactive Viewer Arena HTML file."""
    out_dir = Path(reports_dir) if reports_dir else Path("reports/benchmark")
    out_dir.mkdir(parents=True, exist_ok=True)

    rid = run_id or "latest"
    html_str = generate_viewer_arena_html(scorecards, task_outputs=task_outputs)

    preview_path = out_dir / f"{rid}_preview.html"
    preview_path.write_text(html_str, encoding="utf-8")

    latest_path = out_dir / "latest_preview.html"
    latest_path.write_text(html_str, encoding="utf-8")

    return str(latest_path.resolve())
