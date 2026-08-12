import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = ["apps/viewer/src", "packages/a2learn-catalog", "packages/viewer-kit"];
const violations = [];

async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (entry.name.endsWith(".ts")) {
      const source = await readFile(target, "utf8");
      if (/style\.textContent|document\.head\.appendChild\(style\)/.test(source)) {
        violations.push(`${target}: runtime style injection is forbidden; use a CSS module.`);
      }
    }
  }
}

for (const root of roots) await visit(root);
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
}
