#!/usr/bin/env python
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""General CLI script for the A2Learn skill.

Manages automatic cloning of the A2Learn repository, non-interactive project setup,
static showcase generation, and serving in offline or interactive mode.
"""

import argparse
import os
import shutil
import subprocess
import sys
import time

REPO_URL = "https://github.com/zc6600/A2Learn"
DEFAULT_PROJECT_DIR = os.path.expanduser("~/.a2learn/project")


def run_cmd(cmd, cwd=None, env=None, check=True, capture_output=False):
    """Utility to run shell commands."""
    print(f"[A2Learn CLI] Running: {' '.join(cmd)} in {cwd or '.'}", file=sys.stderr)
    try:
        res = subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            check=check,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.PIPE if capture_output else None,
            text=True if capture_output else False,
        )
        return res
    except subprocess.CalledProcessError as e:
        print(f"[A2Learn CLI] Command failed: {e}", file=sys.stderr)
        if capture_output:
            print(f"Stdout:\n{e.stdout}", file=sys.stderr)
            print(f"Stderr:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)


def ensure_project(project_dir):
    """Ensures the A2Learn project is cloned and fully setup."""
    os.makedirs(os.path.dirname(project_dir), exist_ok=True)

    # 1. Clone if not exists
    if not os.path.exists(project_dir):
        print(f"[A2Learn CLI] Cloning {REPO_URL} into {project_dir}...", file=sys.stderr)
        run_cmd(["git", "clone", REPO_URL, project_dir])

    # 2. Check and copy env vars if present in env to .env file
    env_file = os.path.join(project_dir, ".env")
    if not os.path.exists(env_file):
        api_key = os.getenv("OPENROUTER_API_KEY")
        model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash")
        with open(env_file, "w", encoding="utf-8") as f:
            if api_key:
                f.write(f"OPENROUTER_API_KEY={api_key}\n")
            f.write(f"OPENROUTER_MODEL={model}\n")
        print("[A2Learn CLI] Created initial .env file.", file=sys.stderr)

    # 3. Create Python Venv if not exists
    venv_dir = os.path.join(project_dir, ".venv")
    venv_python = os.path.join(venv_dir, "bin", "python")
    venv_pip = os.path.join(venv_dir, "bin", "pip")

    if not os.path.exists(venv_dir):
        print("[A2Learn CLI] Creating Python virtual environment...", file=sys.stderr)
        run_cmd(["python", "-m", "venv", ".venv"], cwd=project_dir)
        run_cmd([venv_python, "-m", "pip", "install", "--upgrade", "pip"], cwd=project_dir)
        run_cmd([venv_pip, "install", "-r", "requirements.txt"], cwd=project_dir)

    # 4. Fetch A2UI if not present
    third_party_a2ui = os.path.join(project_dir, "third_party", "a2ui")
    if not os.path.exists(third_party_a2ui):
        print("[A2Learn CLI] Ensuring A2UI is present...", file=sys.stderr)
        run_cmd(["bash", "./scripts/ensure_a2ui.sh"], cwd=project_dir)

    # 5. NPM Install if node_modules not present
    node_modules = os.path.join(project_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("[A2Learn CLI] Installing npm packages...", file=sys.stderr)
        run_cmd(["npm", "install"], cwd=project_dir)


def do_generate(project_dir, resource_path, resource_text, output_file, mode):
    """Runs the python agent to generate site messages JSON."""
    ensure_project(project_dir)

    venv_python = os.path.join(project_dir, ".venv", "bin", "python")

    cmd = [venv_python, "run_agent.py", "--mode", mode]
    if resource_text:
        cmd += ["--text", resource_text]
    else:
        # Resolve absolute path for resource if relative
        abs_resource = os.path.abspath(resource_path)
        cmd += ["--resource", abs_resource]

    # Run the generator and capture stdout to parse output location
    res = run_cmd(cmd, cwd=project_dir, capture_output=True)
    stdout_str = res.stdout

    # Parse stdout for the a2ui_messages file path
    messages_path = None
    for line in stdout_str.splitlines():
        if "[A2Learn] a2ui_messages:" in line:
            messages_path = line.split("[A2Learn] a2ui_messages:")[-1].strip()
            break

    if not messages_path or not os.path.exists(messages_path):
        print("[A2Learn CLI] Error: Could not determine generated messages path from agent output.", file=sys.stderr)
        print(f"Agent Output:\n{stdout_str}", file=sys.stderr)
        sys.exit(1)

    # Copy generated messages to the requested output destination
    shutil.copy(messages_path, output_file)
    print(f"Success! Data written to: {output_file}")


def start_offline(project_dir, resource_path, resource_text, port, mode):
    """Serves the generated showcase in static offline mode."""
    ensure_project(project_dir)

    # If inputs are provided, generate first and sync to viewer
    if resource_path or resource_text:
        venv_python = os.path.join(project_dir, ".venv", "bin", "python")
        gen_cmd = [venv_python, "run_agent.py", "--mode", mode]
        if resource_text:
            gen_cmd += ["--text", resource_text]
        else:
            gen_cmd += ["--resource", os.path.abspath(resource_path)]

        # Set sync flag
        env = os.environ.copy()
        env["A2LEARN_SYNC_VIEWER"] = "1"
        run_cmd(gen_cmd, cwd=project_dir, env=env)

    # Run Vite server
    viewer_dir = os.path.join(project_dir, "apps", "viewer")
    run_cmd(["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port)], cwd=viewer_dir)


def start_interactive(project_dir, resource_path, resource_text, viewer_port, api_port, mode):
    """Starts session API and Vite viewer for interactive mode."""
    ensure_project(project_dir)

    venv_python = os.path.join(project_dir, ".venv", "bin", "python")

    # Start FastAPI server in background
    api_cmd = [venv_python, "-m", "uvicorn", "apps.api.main:app", "--host", "127.0.0.1", "--port", str(api_port)]
    api_env = os.environ.copy()
    api_env["A2LEARN_MODE"] = mode
    if resource_path:
        api_env["A2LEARN_DEFAULT_RESOURCE_PATH"] = os.path.abspath(resource_path)
    if resource_text:
        api_env["A2LEARN_DEFAULT_RESOURCE_TEXT"] = resource_text

    print(f"[A2Learn CLI] Starting Session API on port {api_port}...", file=sys.stderr)
    api_proc = subprocess.Popen(api_cmd, cwd=project_dir, env=api_env)

    # Wait a bit for the API to boot
    time.sleep(2)

    try:
        # Start Vite dev server in the foreground
        viewer_dir = os.path.join(project_dir, "apps", "viewer")
        viewer_env = os.environ.copy()
        viewer_env["VITE_A2LEARN_API_URL"] = f"http://127.0.0.1:{api_port}"
        run_cmd(["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(viewer_port)], cwd=viewer_dir, env=viewer_env)
    finally:
        # Ensure FastAPI process is cleaned up on exit
        print("[A2Learn CLI] Terminating Session API...", file=sys.stderr)
        api_proc.terminate()
        try:
            api_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            api_proc.kill()


def main():
    parser = argparse.ArgumentParser(description="A2Learn Skill CLI Helper")
    parser.add_argument(
        "--project-dir",
        default=DEFAULT_PROJECT_DIR,
        help="Directory where A2Learn project is located or should be cloned.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # --- Subcommand: generate ---
    p_gen = subparsers.add_parser("generate", help="Generate A2UI messages JSON")
    group_input = p_gen.add_mutually_exclusive_group(required=True)
    group_input.add_argument("--file", "-f", help="Path to resource file or directory")
    group_input.add_argument("--text", "-t", help="Direct text prompt to use as resource")
    p_gen.add_argument("--output", "-o", required=True, help="Destination path for site_messages.json")
    p_gen.add_argument("--mode", choices=["agent", "parser"], default="agent", help="Generation mode (agent loop or parser-based)")

    # --- Subcommand: start-offline ---
    p_off = subparsers.add_parser("start-offline", help="Start the offline Vite viewer preview")
    p_off.add_argument("--file", "-f", help="Optional path to resource file or directory to generate first")
    p_off.add_argument("--text", "-t", help="Optional text prompt to generate first")
    p_off.add_argument("--port", "-p", type=int, default=8010, help="Vite server port (default: 8010)")
    p_off.add_argument("--mode", choices=["agent", "parser"], default="agent", help="Generation mode (agent loop or parser-based)")

    # --- Subcommand: start-interactive ---
    p_int = subparsers.add_parser("start-interactive", help="Start interactive FastAPI session backend and Vite viewer")
    p_int.add_argument("--file", "-f", help="Optional path to resource file or directory")
    p_int.add_argument("--text", "-t", help="Optional text prompt to use as initial resource")
    p_int.add_argument("--viewer-port", "--vp", type=int, default=8010, help="Vite server port (default: 8010)")
    p_int.add_argument("--api-port", "--ap", type=int, default=8008, help="FastAPI server port (default: 8008)")
    p_int.add_argument("--mode", choices=["agent", "parser"], default="agent", help="Generation mode (agent loop or parser-based)")

    args = parser.parse_args()

    project_dir = os.path.abspath(args.project_dir)

    if args.command == "generate":
        do_generate(project_dir, args.file, args.text, args.output, args.mode)
    elif args.command == "start-offline":
        start_offline(project_dir, args.file, args.text, args.port, args.mode)
    elif args.command == "start-interactive":
        start_interactive(project_dir, args.file, args.text, args.viewer_port, args.api_port, args.mode)


if __name__ == "__main__":
    main()
