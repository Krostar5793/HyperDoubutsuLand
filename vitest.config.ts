import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // server-only はテスト環境では何もしない
      "server-only": path.resolve(__dirname, "src/test/empty.ts"),
    },
  },
});
