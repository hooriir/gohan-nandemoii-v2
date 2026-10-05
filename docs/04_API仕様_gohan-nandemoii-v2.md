# API・Server Actions 仕様書 (gohan-nandemoii-v2)

> 最終更新日: 2026-10-05

本書は、`gohan-nandemoii-v2` におけるバックエンドAPI（Next.js Route Handler）、Server Actions、およびLLM（Gemini 3.6 Flash）連携処理のリクエスト/レスポンス仕様・認可ルールを定義するドキュメントです。

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

```
{
  "error": "エラー内容を示す日本語メッセージ"
}

```

※ `code` や `details` などのネストされたフィールドは存在しません。

## 2. 権限（認可）レベル定義

| 権限コード         | 名称               | 説明                                                                        |
| ------------------ | ------------------ | --------------------------------------------------------------------------- |
| `Public`           | 未ログイン         | 認証セッション不要                                                          |
| `Authenticated`    | ログイン済ユーザー | 有効な Supabase Cookie セッションを保有しているユーザー                     |
| `Household Member` | 世帯所属メンバー   | 有効なセッションを持ち、かつ該当世帯 (`householdId`) に所属しているユーザー |

※ データベース上の `isOwner` フラグ等はレスポンスとして返却されますが、APIレベルでの権限制限は `Household Member` までとなります。

## 3. Route Handler (REST API) 一覧

### 3.1 世帯・メンバー管理 (`/api/household`)

#### 3.1.1 世帯新規作成

- **エンドポイント**: `POST /api/household`

- **権限**: `Authenticated`

##### リクエスト (`application/json`)

```
{
  "name": "山田家"
}

```

##### レスポンス (`200 OK`)

```
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "山田家",
  "inviteCode": "GOHAN12345",
  "createdAt": "2026-09-23T20:30:00.000Z"
}

```

#### 3.1.2 所属世帯・メンバー情報取得

- **エンドポイント**: `GET /api/household/me`

- **権限**: `Authenticated`

##### レスポンス (`200 OK`)

```
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "山田家",
  "inviteCode": "GOHAN12345",
  "message": "今夜はカレーの気分！",
  "isOwner": true,
  "members": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "山田太郎",
      "email": "taro@example.com"
    }
  ]
}

```

#### 3.1.3 世帯メッセージ（ひとこと）更新

- **エンドポイント**: `PATCH /api/household/message`

- **権限**: `Household Member`

##### リクエスト (`application/json`)

```
{
  "message": "今夜の夕飯は何にする？"
}

```

##### レスポンス (`200 OK`)

```
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "message": "今夜の夕飯は何にする？"
}

```

#### 3.1.4 招待コードの再生成 / 更新

- **エンドポイント**: `POST /api/household/invite`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
{
  "inviteCode": "NEWCODE9876"
}

```

#### 3.1.5 招待コードによる世帯参加

- **エンドポイント**: `POST /api/household/join`

- **権限**: `Authenticated`

##### リクエスト (`application/json`)

```
{
  "inviteCode": "GOHAN12345"
}

```

##### レスポンス (`200 OK`)

```
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "山田家"
}

```

### 3.2 マスタ・タグ関連 (`/api/tags`)

#### 3.2.1 タグ一覧取得

- **エンドポイント**: `GET /api/tags`

- **権限**: `Authenticated`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "tag-1",
    "name": "時短"
  },
  {
    "id": "tag-2",
    "name": "ガッツリ"
  }
]

```

### 3.3 食事リクエスト管理 (`/api/meal-requests`)

#### 3.3.1 リクエスト一覧取得

- **エンドポイント**: `GET /api/meal-requests`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "req-101",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "comment": "久々に食べたい！",
    "createdAt": "2026-09-23T10:00:00.000Z",
    "user": {
      "name": "山田太郎"
    },
    "dish": {
      "name": "ハンバーグ"
    }
  }
]

```

#### 3.3.2 リクエスト作成

- **エンドポイント**: `POST /api/meal-requests`

- **権限**: `Household Member`

##### リクエスト (`application/json`)

```
{
  "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "comment": "今夜のおかずにどうかな？"
}

```

##### レスポンス (`200 OK`)

```
{
  "id": "req-102",
  "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "comment": "今夜のおかずにどうかな？",
  "createdAt": "2026-09-23T11:00:00.000Z"
}

```

#### 3.3.3 自分のリクエスト取得

- **エンドポイント**: `GET /api/meal-requests/me`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "req-102",
    "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "comment": "今夜のおかずにどうかな？",
    "createdAt": "2026-09-23T11:00:00.000Z"
  }
]

```

#### 3.3.4 今日のリクエスト取得

- **エンドポイント**: `GET /api/meal-requests/today`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "req-102",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "comment": "今夜のおかずにどうかな？",
    "createdAt": "2026-09-23T11:00:00.000Z"
  }
]

```

### 3.4 提案・履歴ログ管理 (`/api/dish-show-log`)

#### 3.4.1 提案表示ログ/決定履歴の登録

- **エンドポイント**: `POST /api/dish-show-log`

- **権限**: `Household Member`

##### リクエスト (`application/json`)

```
{
  "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "action": "SELECTED"
}

```

##### レスポンス (`200 OK`)

```
{
  "id": "log-555",
  "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "action": "SELECTED",
  "createdAt": "2026-09-23T12:00:00.000Z"
}

```

#### 3.4.2 提案・表示履歴一覧取得

- **エンドポイント**: `GET /api/dish-show-log`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "log-555",
    "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "action": "SELECTED",
    "createdAt": "2026-09-23T12:00:00.000Z",
    "dish": {
      "name": "カレーライス"
    }
  }
]

```

#### 3.4.3 今日の表示・選択ログ取得

- **エンドポイント**: `GET /api/dish-show-log/today`

- **権限**: `Household Member`

##### レスポンス (`200 OK`)

```
[
  {
    "id": "log-555",
    "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "action": "SELECTED",
    "createdAt": "2026-09-23T12:00:00.000Z"
  }
]

```

## 4. AI (Gemini 3.6 Flash) 連携 API（最重要機能）

本アプリケーションのコア機能である AI ごはん提案・調停機能のエンドポイントです。公式 SDK (`@google/genai`) を用いて `gemini-3.6-flash` モデルを呼び出します。

### 4.1 AI 通常ごはん提案 (`POST /api/recommend`)

- **エンドポイント**: `POST /api/recommend`

- **権限**: `Household Member`

- **概要**: 世帯に登録された料理データ、直近の食事履歴、ユーザーの気分・条件プロンプトをもとに、最適な料理をAIが選定・提案理由を添えて返却します。

#### リクエスト (`application/json`)

```
{
  "mood": "さっぱりしたものが食べたい",
  "cookingTime": 30
}

```

#### レスポンス (`200 OK`)

```
{
  "dishId": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "dishName": "豚しゃぶサラダ",
  "reason": "蒸し暑い日にぴったりで、調理時間も20分程度と短いためお勧めです。"
}

```

### 4.2 AI 家族調停・ごはん提案 (`POST /api/recommend/mediate`)

- **エンドポイント**: `POST /api/recommend/mediate`

- **権限**: `Household Member`

- **概要**: 今日の家族からのリクエスト（複数人からの異なる要望など）を集約し、全員が納得できる「折衷案・調停提案」を AI が生成します。

#### リクエスト (`application/json`)

```
{
  "requests": [
    { "userName": "パパ", "dishName": "ガッツリ肉料理" },
    { "userName": "ママ", "dishName": "野菜多めでヘルシーなもの" }
  ]
}

```

#### レスポンス (`200 OK`)

```
{
  "dishId": "c3d4e5f6-a7b8-9c0d-1e2f-3456789abcde",
  "dishName": "豚肉とたっぷり野菜の蒸し鍋",
  "reason": "パパの「肉を食べたい」要望とママの「ヘルシーに野菜を摂りたい」要望を両立できる最高の折衷案です。"
}

```

### 4.3 LLM（Gemini 3.6 Flash）連携の実装詳細仕様

1. **使用パッケージ / モデル**:
   - SDK: `@google/genai`

   - Model: `gemini-3.6-flash`

2. **構造化出力 (JSON Schema)**:
   - レスポンスの決定論的なフォーマット維持のため、`responseSchema` オプションを指定して `Type.OBJECT` 形式（`dishId`, `dishName`, `reason`）の出力をモデルに強制します。

3. **プロンプト構造**:
   - システム指示として「世帯の登録料理一覧（IDと名前のペア）」および「直近選択された料理」をプロンプト内に埋め込み、**必ず世帯内に存在する `dishId` を選択**するように指示します。

4. **フォールバック処理・エラーハンドリング**:
   - `GEMINI_API_KEY` 未設定時、または AI API 呼び出し制限・通信エラーが発生した場合は、世帯内の全料理からランダムで1件を選択し、定型文（「AI接続エラーのためランダム提案です」等）の `reason` を付与したフォールバックレスポンスを返却します（システム全体のダウンを防ぎます）。

## 5. Server Actions 仕様

REST API 形式をとらず、Next.js の Server Actions（`app/actions.ts` 等）で直接実装されているデータ操作仕様です。

### 5.1 認証関連 (`registerUser`)

- **関数**: `registerUser(formData)`

- **説明**: Supabase Auth SDK を直呼び出しし、新規ユーザーのサインアップ処理および初期プロフィールの登録を実施します。

### 5.2 メニュー (Dish) CRUD 操作

メニュー管理は Prisma 経由でデータベースを直接更新する Server Actions で実装されています。

| 関数名       | 処理内容         | 引数 / 形式                        |
| ------------ | ---------------- | ---------------------------------- |
| `createDish` | メニュー新規登録 | `(formData: FormData)`             |
| `updateDish` | メニュー情報更新 | `(id: string, formData: FormData)` |
| `deleteDish` | メニュー削除     | `(id: string)`                     |

※ 画面側（`app/menus/[id]/edit/page.tsx` 等）から直接これら Server Actions を呼び出します。また、メニュー一覧表示については API を経由せず Server Component 内で直接 Prisma Client を用いて取得します。
