import json
from pathlib import Path

website_dir = Path("packages/a2learn-catalog/examples/Website")

# 1. Ensure hash-table.json is present and up to date
site_messages_path = Path("apps/viewer/public/generated/site_messages.json")
if site_messages_path.exists():
    hash_table_messages = json.loads(site_messages_path.read_text(encoding="utf-8"))
    (website_dir / "hash-table.json").write_text(
        json.dumps(hash_table_messages, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("ENRICHED: hash-table.json")

# 2. Update agent-react.json diagram to use visual flow arrow nodes
agent_react_path = website_dir / "agent-react.json"
if agent_react_path.exists():
    data = json.loads(agent_react_path.read_text(encoding="utf-8"))
    for msg in data:
        if "updateComponents" in msg:
            for comp in msg["updateComponents"]["components"]:
                if comp.get("id") == "mental-model-react":
                    comp["diagramTitle"] = "📊 ReAct 循环执行节点流动演推"
                    comp["diagram"] = (
                        "LLM 推理规划: Thought (确定工具与步骤)\n"
                        "执行工具: Action -> 搜索引擎 / 代码计算器 / API 接口\n"
                        "观察环境反馈: Observation -> 抓取结果输入上下文 ➔ 开启下一轮 Thought"
                    )
    agent_react_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("ENRICHED: agent-react.json")

# 3. Update js-async.json diagram to use visual flow arrow nodes
js_async_path = website_dir / "js-async.json"
if js_async_path.exists():
    data = json.loads(js_async_path.read_text(encoding="utf-8"))
    for msg in data:
        if "updateComponents" in msg:
            for comp in msg["updateComponents"]["components"]:
                if comp.get("id") == "mental-model-event-loop":
                    comp["diagramTitle"] = "📊 JS 单线程与 Event Loop 节点流动演推"
                    comp["diagram"] = (
                        "同步主逻辑: Call Stack 压栈 ➔ 遇异步移交 Web APIs\n"
                        "异步完成: Web APIs ➔ Microtask / Macrotask 队列\n"
                        "轮询调度: Event Loop ➔ Stack 清空时清空微任务并取宏任务"
                    )
    js_async_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("ENRICHED: js-async.json")

print("COMPLETED_ENRICHING_ALL_EXAMPLES")
