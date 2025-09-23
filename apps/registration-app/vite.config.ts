import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 3001,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@sion/shared-ui": path.resolve(__dirname, "../../packages/shared-ui/src"),
      "@sion/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@sion/shared-utils": path.resolve(__dirname, "../../packages/shared-utils/src"),
    },
  },
});