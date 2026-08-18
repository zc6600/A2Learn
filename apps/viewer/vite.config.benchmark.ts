import { defineConfig } from "vite";

const appDir = new URL(".", import.meta.url).pathname;
const appsDir = new URL("..", import.meta.url).pathname;
const repoDir = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  base: "./",
  server: {
    fs: {
      allow: [appDir, appsDir, repoDir],
    },
  },
  build: {
    lib: {
      entry: "src/benchmark-arena.ts",
      name: "A2LearnBenchmarkRenderer",
      fileName: (format) => `a2learn-viewer-runtime.${format}.js`,
      formats: ["iife", "es"],
    },
    outDir: "../../reports/benchmark/assets",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
