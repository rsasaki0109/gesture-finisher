import { defineConfig } from "vite";

/**
 * GitHub Pages のプロジェクトサイトは /リポジトリ名/ がルート。
 * CI では VITE_BASE_PATH を渡す。ローカル dev は "/" のまま。
 */
const base = process.env.VITE_BASE_PATH ?? "/";

/** MediaPipe WASM がスレッドを使う場合に備え、隔離コンテキストを有効化 */
export default defineConfig({
  base,
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
