import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 4173 },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("scratch-blocks") || id.includes("/blockly@")) {
            return "scratch-blocks";
          }
          if (id.includes("pixi.js")) return "pixi";
          if (id.includes("react-dom") || id.includes("react-router")) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
});
