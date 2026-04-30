import { defineConfig } from "vite";

const appDir = new URL(".", import.meta.url).pathname;
const appsDir = new URL("..", import.meta.url).pathname;
const repoDir = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@a2ui/web_core/v0_9/basic_catalog",
        replacement: new URL(
          "../../third_party/A2UI/renderers/web_core/dist/src/v0_9/basic_catalog/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: "@a2ui/web_core/v0_9",
        replacement: new URL(
          "../../third_party/A2UI/renderers/web_core/dist/src/v0_9/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: "@a2ui/lit/v0_9",
        replacement: new URL(
          "../../third_party/A2UI/renderers/lit/dist/src/v0_9/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: "@a2ui/markdown-it",
        replacement: new URL(
          "../../third_party/A2UI/renderers/markdown/markdown-it/dist/src/markdown.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: "lit",
        replacement: new URL("./node_modules/lit/", import.meta.url).pathname,
      },
      {
        find: "@lit/context",
        replacement: new URL("./node_modules/@lit/context/", import.meta.url).pathname,
      },
      {
        find: /^zod$/,
        replacement: new URL("./node_modules/zod/index.js", import.meta.url).pathname,
      },
    ],
  },
  server: {
    fs: {
      allow: [appDir, appsDir, repoDir],
    },
  },
});
