# vite-app（レガシー Web プロトタイプ）

このディレクトリは **mock データ中心の旧 Web UI** です。本番の RawStock クライアントは **Expo（`app/`）** を正とします。

## 方針

- 新機能・API 連携は **`app/` + `server/routes.ts`** に実装する。
- `vite-app/` は LP や静的デモが必要な場合のみ保守し、可能なら Expo Web（`npm run web`）へ寄せる。
- データ取得は `../lib/query-client`（Expo 側）と同じ API オリジン（`EXPO_PUBLIC_API_URL`）を指すよう統一する。

## 開発

```bash
cd vite-app && npm install && npm run dev
```

API は別ターミナルで `npm run server:dev`（既定ポート 5001）を起動する。
