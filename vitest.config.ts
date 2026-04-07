import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
