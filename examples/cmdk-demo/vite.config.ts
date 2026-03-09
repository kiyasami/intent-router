import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@intent-router/core": path.resolve(__dirname, "../../packages/core/src"),
    },
  },
  root: "./",
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});
