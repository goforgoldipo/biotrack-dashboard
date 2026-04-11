import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
  test: {
    globals:     true,
    environment: "jsdom",
    setupFiles:  "./src/__tests__/setup.js",
    coverage: {
      provider:   "v8",
      include:    ["src/**/*.jsx", "src/**/*.js"],
      exclude:    ["src/__tests__/**"],
      reporter:   ["text", "html"],
    },
  },
});
