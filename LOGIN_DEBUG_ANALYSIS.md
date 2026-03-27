# ログインできない問題 - 分析レポート

## ログインフロー概要

```
1. ユーザーが /auth/login で「LINEでログイン」をクリック
2. /api/auth/line にリダイレクト → LINE認証画面へ
3. LINE認証完了後、LINEが /api/auth/line-callback?code=xxx&state=xxx にリダイレクト
4. サーバーがLINE APIでトークン交換→プロフィール取得→DB保存→JWT発行
5. サーバーが /?line_token=JWT にリダイレクト
6. クライアントが line_token を検出→loginWithToken()→/api/auth/me を呼ぶ
7. 成功なら /(tabs)/profile へ遷移
```

## 失敗しうる箇所と原因

### A. LINE認証画面に到達しない
- **原因**: LINE_CHANNEL_ID が空、または /api/auth/line が 500 エラー
- **確認**: https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line に直接アクセス
  - リダイレクトされればOK → LINE の認証画面へ飛ぶ
  - 500 エラーなら環境変数未設定

### B. LINE認証後に line_error が返る（ログイン画面にエラー表示）
- **invalid_state**: 認証セッションが切れた。もう一度お試し
- **token_failed**: LINE のトークン交換失敗。LINE_CHANNEL_SECRET または LINE_CALLBACK_URL の不一致
- **profile_failed**: プロフィール取得失敗
- **server_error**: サーバー内の例外（DB接続、その他）

### C. line_token が返るが loginWithToken が失敗（me_failed）
- **原因**: /api/auth/me が 401 を返す
  - JWT の検証失敗（SESSION_SECRET の不一致は通常ない）
  - ユーザーがDBに存在しない（稀）
  - Authorization ヘッダーが正しく送られていない

### D. line_token が返るがログイン画面に戻される（エラー表示なし）
- **原因**: returnTo が /auth/login だった（修正済み）
- または: 認証ガードが先にリダイレクトしている

### E. URL に line_token が含まれない
- **原因**: サーバーが /?line_token=xxx ではなく別のURLにリダイレクトしている
  - FRONTEND_URL が誤っていると別ドメインに飛ぶ可能性
  - FRONTEND_URL が空なら相対パス "/?line_token=xxx" → 同一オリジンでOK

## 必要な環境変数（Vercel）

| 変数 | 必須 | 説明 |
|------|------|------|
| LINE_CHANNEL_ID | ✓ | LINE Developers の Channel ID |
| LINE_CHANNEL_SECRET | ✓ | LINE Developers の Channel Secret |
| LINE_CALLBACK_URL | ✓ | https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line-callback |
| FRONTEND_URL | - | 空でOK（同一オリジン） |
| SESSION_SECRET | ✓ | JWT 署名用。未設定の場合はデフォルト使用 |
| DATABASE_URL | ✓ | Neon PostgreSQL 接続文字列 |
| EXPO_PUBLIC_DOMAIN | ✓ | ビルド用。https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev |

## LINE Developers のコールバックURL

**完全一致**で登録すること:
```
https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line-callback
```
- 末尾スラッシュなし
- https 必須
- スペース・改行なし

## デバッグ手順

1. **設定確認**: https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/status
   - line.configured: true か確認
   - line.callbackUrl が正しいか確認

2. **LINE認証開始**: https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line
   - LINE の認証画面へ飛ぶか確認

3. **Vercel Functions ログ**: デプロイ後、LINE ログインを試し、Vercel ダッシュボード → Deployments → 最新 → Functions でログを確認
   - "LINE callback error" が出力されていればサーバー側の例外

4. **ブラウザの Network タブ**: LINE ログイン試行後、/api/auth/me のリクエストを確認
   - 401 ならトークン検証失敗
   - 200 なら成功（クライアント側の処理が怪しい）
