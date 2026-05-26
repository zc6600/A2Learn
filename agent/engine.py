import json
import time
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from .io import create_output_dir, export_messages, extract_text_from_path, write_json
from .llm import build_llm, build_site_plan, generate_a2ui_messages, plan_curriculum
from .validate import validate_a2ui_messages


class AgentState(TypedDict, total=False):
    resource_path: str
    resource_text: str
    curriculum: dict[str, Any]
    curriculum_path: str
    site_plan: dict[str, Any]
    site_path: str
    a2ui_messages: list[dict[str, Any]]
    output_dir: str
    generated_messages_path: str


def _log(msg: str) -> None:
    ts = time.strftime("%H:%M:%S")
    print(f"[A2Learn] [{ts}] {msg}", flush=True)


def _node_init_output(state: AgentState) -> AgentState:
    _log("🚀 Starting A2Learn agent...")
    out = create_output_dir()
    _log(f"📁 Output directory: {out.resolve()}")
    return {"output_dir": str(out.resolve())}


def _node_load_resource(state: AgentState) -> AgentState:
    if state.get("resource_text"):
        _log("📝 Using provided text as resource.")
        return {"resource_text": state["resource_text"]}
    _log(f"📂 Loading resource from: {state['resource_path']}")
    text = extract_text_from_path(state["resource_path"])
    _log(f"✅ Resource loaded ({len(text)} characters).")
    return {"resource_text": text}


def _node_plan_curriculum(state: AgentState) -> AgentState:
    _log("🧠 Step 1/3: Planning curriculum (calling LLM, please wait...)")
    llm = build_llm()
    curriculum = plan_curriculum(llm, state["resource_text"])
    _log(f"✅ Curriculum planned: {len(curriculum.get('modules', []))} modules.")
    output_dir = state.get("output_dir")
    if output_dir:
        curriculum_path = write_json(output_dir, "curriculum.json", curriculum)
        return {"curriculum": curriculum, "curriculum_path": curriculum_path}
    return {"curriculum": curriculum}


def _node_build_site(state: AgentState) -> AgentState:
    _log("🏗️  Step 2/3: Building site plan (calling LLM, please wait...)")
    llm = build_llm()
    site_plan = build_site_plan(llm, state["curriculum"])
    _log(f"✅ Site plan built: {len(site_plan.get('surfaces', []))} surfaces.")
    output_dir = state.get("output_dir")
    if output_dir:
        site_path = write_json(output_dir, "site.json", site_plan)
        return {"site_plan": site_plan, "site_path": site_path}
    return {"site_plan": site_plan}


def _node_generate_messages(state: AgentState) -> AgentState:
    _log("✨ Step 3/3: Generating A2UI messages (calling LLM, please wait...)")
    llm = build_llm()
    resource_text = state["resource_text"]
    site_plan = state.get("site_plan")
    if site_plan:
        resource_text = (
            resource_text
            + "\n\n# SITE PLAN\n"
            + json.dumps(site_plan, ensure_ascii=False)
        )
    messages = generate_a2ui_messages(llm, resource_text)
    validate_a2ui_messages(messages)
    _log(f"✅ Generated {len(messages)} A2UI messages.")
    return {"a2ui_messages": messages}


def _node_export(state: AgentState) -> AgentState:
    return export_messages(state["a2ui_messages"], output_dir=state.get("output_dir"))


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("init_output", _node_init_output)
    graph.add_node("load_resource", _node_load_resource)
    graph.add_node("plan_curriculum", _node_plan_curriculum)
    graph.add_node("build_site", _node_build_site)
    graph.add_node("generate_messages", _node_generate_messages)
    graph.add_node("export", _node_export)
    graph.set_entry_point("init_output")
    graph.add_edge("init_output", "load_resource")
    graph.add_edge("load_resource", "plan_curriculum")
    graph.add_edge("plan_curriculum", "build_site")
    graph.add_edge("build_site", "generate_messages")
    graph.add_edge("generate_messages", "export")
    graph.add_edge("export", END)
    return graph.compile()


def run_agent(resource_path: str = None, resource_text: str = None) -> AgentState:
    app = build_agent_graph()
    initial_state = {}
    if resource_path:
        initial_state["resource_path"] = resource_path
    if resource_text:
        initial_state["resource_text"] = resource_text
        
    if not resource_path and not resource_text:
        raise ValueError("Either resource_path or resource_text must be provided")
        
    return app.invoke(initial_state)
