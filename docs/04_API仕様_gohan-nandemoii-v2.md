# API・Server Actions 仕様書 (gohan-nandemoii-v2)

> 最終更新日: 2026-10-03

本書は、`gohan-nandemoii-v2` におけるバックエンドAPI（Next.js Route Handler）、Server Actions、およびLLM（Gemini 3.6 Flash）連携処理のリクエスト/レスポンス仕様・認可ルールを定義するドキュメントです。

本APIに対応する機能要件については [02\_機能要件一覧\_gohan-nandemoii-v2.md](./02_機能要件一覧_gohan-nandemoii-v2.md)、データベース構造については [03\_データモデル定義\_gohan-nandemoii-v2.md](./03_データモデル定義_gohan-nandemoii-v2.md) を参照してください。

---

## 1. 共通仕様

### 1.1 Base URL / エンドポイント体系

- **Base Path**: `/api/...` （Next.js App Router の Route Handler による同一オリジン API）
- 独立した外部 API サーバー（`https://api...`）は存在せず、すべて同一ドメイン上の Route Handler として処理されます。

### 1.2 認証方式

- **方式**: Supabase SSR (`@supabase/ssr`) による **Cookie セッション管理**
- リクエスト時の `Authorization` ヘッダーは一切使用しません。
- ブラウザの Cookie に保存された Supabase 認証セッションを `middleware.ts` および `utils/supabase/server.ts` 経由で検証・取得します。

### 1.3 共通エラーレスポンス構造

エラー発生時は、HTTP ステータスコード（400 / 401 / 403 / 404 / 500 等）とともに、以下の**単一文字列形式**の JSON でエラーメッセージを返却します。

```json
{
  "error": "エラー内容を示す日本語メッセージ"
}
```
