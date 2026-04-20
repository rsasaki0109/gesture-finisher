# Gesture Finisher

Web カメラで両手を検出し、チャージして「かめはめ波」風のビームを発射するブラウザ向けミニアプリです。

**デモ（GitHub Pages）:**  
https://rsasaki0109.github.io/gesture-finisher/

> 初回は MediaPipe のモデルと WASM の読み込みがあり、数秒かかることがあります。カメラ許可が必要です。

## できること

- カメラ映像から **MediaPipe Hand Landmarker** で両手をトラッキング
- **チャージ**: 両手を近づける → **ready** までキープ
- **発射**: カメラに向かって手を押し出す（スケール変化・両手が少し離れる）でトリガー
- **Canvas 2D** でビーム＋パーティクル（最低約 0.6 秒は表示）

## 必要環境

- Node.js 20 系推奨
- モダンブラウザ（WebRTC / WebGL 利用想定）
- **HTTPS または localhost**（`getUserMedia` のため）

## ローカル開発

```bash
npm install
npm run dev
```

ブラウザで表示された URL（例: `http://localhost:5173`）を開き、「開始」でカメラを許可します。

## ビルド

```bash
npm run build
npm run preview
```

GitHub Pages 向けは `base` にリポジトリ名が入ります。CI では `VITE_BASE_PATH=/<repo>/` でビルドしています。

## ディレクトリ構成（概要）

| パス | 役割 |
|------|------|
| `src/camera/` | `getUserMedia` と video 要素 |
| `src/vision/` | Hand Landmarker とランドマーク幾何 |
| `src/gesture/` | 状態機械（idle → charging → ready → firing） |
| `src/effects/` | かめはめ波風エフェクト |
| `src/core/` | メインループと UI |

## 挙動の調整

`src/gesture/gestureTypes.ts` の `defaultGestureConfig` で、チャージ距離・ready までの時間・発射感度などを変えられます。

## デプロイ（GitHub Pages）

`main` へ push すると GitHub Actions が `gh-pages` ブランチへデプロイします。

リポジトリの **Settings → Pages** で、**Branch: `gh-pages` / `/ (root)`** を選んでください。

## ライセンス

個人利用・学習用途を想定しています。MediaPipe 等の第三者ライセンスは各パッケージに従います。
