import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: resolve(__dirname, "src/electron/main/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "[name].js"
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: resolve(__dirname, "src/electron/preload/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "[name].js"
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/electron/renderer"),
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/electron/renderer/index.html")
      }
    }
  }
});
