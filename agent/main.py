import argparse
import os

from .config import DEFAULT_MODEL
from .engine import run_agent


def main() -> None:
    parser = argparse.ArgumentParser(description="A2Learn Agent (A2UI direct messages)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--resource", help="Path to teaching resources (file or directory)")
    group.add_argument("--text", help="Direct text input to use as teaching resource")
    parser.add_argument("--mode", choices=["agent", "parser"], default="agent", help="Generation mode (agent loop or parser-based)")
    args = parser.parse_args()

    model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
    has_key = bool(os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY"))
    print(f"[A2Learn] OPENROUTER_MODEL: {model}")
    print(f"[A2Learn] OPENROUTER_API_KEY loaded: {'yes' if has_key else 'no'}")
    print(f"[A2Learn] Generation Mode: {args.mode}")

    result = run_agent(resource_path=args.resource, resource_text=args.text, mode=args.mode)
    print(f"[A2Learn] output_dir: {result['output_dir']}")
    print(f"[A2Learn] a2ui_messages: {result['generated_messages_path']}")
    print("[A2Learn] A2UI message generation completed.")


if __name__ == "__main__":
    main()

