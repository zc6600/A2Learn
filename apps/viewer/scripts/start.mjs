import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const viteArgs =
  args[0] === "gallery"
    ? ["--mode", "gallery", ...args.slice(1)]
    : [...args];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const viteBin = resolve(scriptDir, "../node_modules/.bin/vite");

const child = spawn(viteBin, viteArgs, {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
