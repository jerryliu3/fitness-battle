import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  plugins: [
    {
      name: "stub-assets",
      load(id) {
        if (/\.(png|jpg|jpeg|gif|webp)$/.test(id)) {
          return "export default 1; module.exports = 1;";
        }
      },
    },
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
