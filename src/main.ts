import "./style.css";
import { GestureFinisherApp } from "./core/app";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app が見つかりません");
}

const app = new GestureFinisherApp(mount);

app.init().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  mount.innerHTML = `<p class="error">初期化エラー: ${msg}</p>`;
});
