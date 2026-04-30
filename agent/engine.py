from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from .io import export_messages, extract_text_from_path
from .llm import build_llm, generate_a2ui_messages
from .validate import validate_a2ui_messages


class AgentState(TypedDict, total=False):
    resource_path: str
    resource_text: str
    a2ui_messages: list[dict[str, Any]]
    output_dir: str
    generated_messages_path: str


def _node_load_resource(state: AgentState) -> AgentState:
    return {"resource_text": extract_text_from_path(state["resource_path"])}


def _node_generate_messages(state: AgentState) -> AgentState:
    llm = build_llm()
    messages = generate_a2ui_messages(llm, state["resource_text"])
    validate_a2ui_messages(messages)
    return {"a2ui_messages": messages}


def _node_export(state: AgentState) -> AgentState:
    return export_messages(state["a2ui_messages"])


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("load_resource", _node_load_resource)
    graph.add_node("generate_messages", _node_generate_messages)
    graph.add_node("export", _node_export)
    graph.set_entry_point("load_resource")
    graph.add_edge("load_resource", "generate_messages")
    graph.add_edge("generate_messages", "export")
    graph.add_edge("export", END)
    return graph.compile()


def run_agent(resource_path: str) -> AgentState:
    app = build_agent_graph()
    return app.invoke({"resource_path": resource_path})

