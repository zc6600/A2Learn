"""Generation pipeline subpackage for course and page generation."""

from .action_response import build_action_response
from .engine import AgentState, build_agent_graph, run_agent, run_parser_mode
from .llm import (
    build_llm,
    build_page_editor_llm,
    build_site_plan,
    generate_a2ui_messages,
    generate_a2ui_messages_per_surface,
    generate_structured_json,
    plan_curriculum,
    repair_a2ui_messages,
)
from .parser import parse_json_to_a2ui
from .profile import GenerationProfile, load_reference_examples, normalize_generation_profile

__all__ = [
    "build_action_response",
    "AgentState",
    "build_agent_graph",
    "run_agent",
    "run_parser_mode",
    "build_llm",
    "build_page_editor_llm",
    "build_site_plan",
    "generate_a2ui_messages",
    "generate_a2ui_messages_per_surface",
    "generate_structured_json",
    "plan_curriculum",
    "repair_a2ui_messages",
    "parse_json_to_a2ui",
    "GenerationProfile",
    "load_reference_examples",
    "normalize_generation_profile",
]
