# Gesture Finisher — 計画・設計メモ

Web カメラと MediaPipe で手を検出し、**かめはめ波**・**螺旋丸**風エフェクトを出すブラウザアプリの方針と構成をまとめる。

---

## ゴール

- **気持ちよさ優先**のジェスチャー判定（厳密な解剖学的正確さは不要）
- **Canvas 2D** で動く MVP。将来 WebGL / PixiJS に差し替えやすい **エフェクトインターフェース**を維持
- **自明な UI**：状態パネル・右側ポーズ例（SVG）・短文ヘルプで「いま何をすればいいか」が分かる

**公開デモ:** https://rsasaki0109.github.io/gesture-finisher/

---

## 技術スタック

| 領域 | 選定 |
|------|------|
| 言語 | TypeScript |
| ビルド | Vite 6 |
| 手検出 | `@mediapipe/tasks-vision`（Hand Landmarker, VIDEO モード） |
| 描画 | Canvas 2D（`Canvas2DEffect`） |
| E2E | Playwright（Chromium + フェイクカメラ） |

---

## ディレクトリとレイヤー

```
src/
  camera/     getUserMedia → video
  vision/     Hand Landmarker、ランドマーク幾何
  gesture/    状態機械（idle → charging → ready → firing）
  effects/    かめはめ波・螺旋丸（将来追加しやすい形）
  core/       アプリ組み立て・メインループ・UI
```

- **vision**: `handedness` が取れない端末向けに、**両手は画像上の x でソートしてペア**する
- **gesture**: モード **かめはめ波（両手）** / **螺旋丸（片手・スケール優先の手）** で分岐

---

## ジェスチャー設計（要点）

| 状態 | ざっくり意味 |
|------|----------------|
| idle | 待機・条件未達 |
| charging | チャージ条件を満たしてキープ中 |
| ready | 発射トリガー待ち |
| firing | 1 フレームの発火イベント（直後 idle ＋クールダウンあり） |

- **ヒステリシス**（距離の入り／出し）と **指数平滑化**でチラつき抑制
- 閾値は `src/gesture/gestureTypes.ts` の `defaultGestureConfig` で調整

---

## UI / UX

- **技切替**: かめはめ波（両手）／螺旋丸（片手）
- **状態パネル**: 日本語ラベル・チャージバー・4 ステップチップ・段階で枠色が変化
- **右パネル**: `poseIllustrations.ts` の SVG でポーズ例（外部画像なし）
- **自撮り表示**: video は CSS ミラー、座標はキャンバス側で補正

---

## ビルド・デプロイ

| 用途 | コマンド / 備考 |
|------|------------------|
| 開発 | `npm run dev` |
| 型＋本番ビルド | `npm run build` |
| Pages 用 base | CI で `VITE_BASE_PATH=/<repo名>/`（ローカルは通常 `/`） |
| 静的ホスト | `dist/` → `gh-pages` ブランチ（`deploy-pages` workflow） |

開発時のみ Vite が **COOP/COEP** を付与（MediaPipe WASM 向け）。GitHub Pages 本番は通常ヘッダなしだが、CPU フォールバック等で動作させている。

---

## テスト（ドッグフーディング）

| コマンド | 内容 |
|----------|------|
| `npm run test:e2e` | Playwright：起動・モード切替・フェイクカメラで「開始」まで |

- デフォルト URL は **`http://localhost:5174`**（5173 と他プロジェクトが衝突しやすいため）
- CI: `.github/workflows/e2e.yml`

---

## 今後の拡張案（優先度は好み）

1. **新エフェクト**（防御バリア、斬撃など）— `effects/types.ts` 準拠で追加
2. **音声**（チャージ SE / 発射 SE）— ユーザー体験の強化
3. **閾値プリセット**（子ども向け・厳しめ等）— `GestureConfig` の切替 UI
4. **パフォーマンス**— 必要になったら WebGL レンダラに差し替え
5. **オフライン E2E**— MediaPipe CDN をモックするか、ローカルモデル配信の検討

---

## 変更履歴の扱い

機能追加・バグ修正は `main` にマージし、Pages・E2E が緑になることを前提にする。

---

*最終更新: リポジトリ内のソースとワークフローに基づく。*
