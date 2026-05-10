import { defineConfig } from "vite";

const appDir = new URL(".", import.meta.url).pathname;
const appsDir = new URL("..", import.meta.url).pathname;
const repoDir = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  server: {
    fs: {
      allow: [appDir, appsDir, repoDir],
    },
  },
});
