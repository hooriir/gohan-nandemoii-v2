# API仕様書 (gohan-nandemoii-v2)

本書は、`gohan-nandemoii-v2` におけるバックエンドAPIのエンドポイント、リクエスト/レスポンス仕様、およびアクセス権限（認可ルール）を定義するドキュメントです。

---

## 1. 共通仕様

### 1.1 Base URL
```text
https://api.gohan-nandemoii.com/v2
```

### 1.2 認証方式
* **方式**: Bearer Authentication (JWT)
* **ヘッダー**: `Authorization: Bearer <JWT_TOKEN>`

### 1.3 共通エラーレスポンス構造
エラー発生時は、以下の形式で一律レスポンスを返却します。

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "入力内容に誤りがあります。",
    "details": [
      {
        "field": "email",
        "message": "有効なメールアドレス形式で入力してください。"
      }
    ]
  }
}
```

#### 共通ステータスコード
| ステータス | 概要 | 説明 |
| :--- | :--- | :--- |
| `200 OK` | 成功 | リクエストが正常に処理された |
| `201 Created` | 作成完了 | リソースが正常に作成された |
| `204 No Content` | 削除完了 | リソースが正常に削除された |
| `400 Bad Request` | パラメータ不正 | バリデーションエラー |
| `401 Unauthorized` | 認証エラー | トークンが無効・期限切れ |
| `403 Forbidden` | 権限エラー | リソースへのアクセス権限がない |
| `404 Not Found` | 未検出 | 該当リソースが存在しない |
| `500 Internal Server Error` | サーバーエラー | システムエラー |

---

## 2. 権限（認可）レベル定義

| 権限コード | 権限名 | 説明 |
| :--- | :--- | :--- |
| `Public` | 未ログイン | 認証トークン不要（会員登録・ログイン等） |
| `Auth` | ログイン済ユーザー | 有効なJWTトークンを持つユーザー |
| `Household` | 世帯所属メンバー | 該当世帯（`household_id`）に所属しているメンバー |
| `Owner` | 世帯オーナー | 該当世帯の作成者/管理者権限を持つメンバー |

---

## 3. エンドポイント一覧

### 3.1 認証・アカウント系 (`/auth`, `/users`)

#### 3.1.1 新規会員登録
* **エンドポイント**: `POST /auth/register`
* **権限**: `Public`

##### リクエスト
```json
{
  "name": "山田太郎",
  "email": "taro@example.com",
  "password": "Password1234"
}
```

##### レスポンス (`201 Created`)
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田太郎",
    "email": "taro@example.com",
    "created_at": "2026-09-23T20:00:00Z"
  }
}
```

---

#### 3.1.2 ログイン
* **エンドポイント**: `POST /auth/login`
* **権限**: `Public`

##### リクエスト
```json
{
  "email": "taro@example.com",
  "password": "Password1234"
}
```

##### レスポンス (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "山田太郎",
    "email": "taro@example.com"
  },
  "current_household_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

---

#### 3.1.3 ログインユーザー情報取得
* **エンドポイント**: `GET /users/me`
* **権限**: `Auth`

##### レスポンス (`200 OK`)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "山田太郎",
  "email": "taro@example.com",
  "households": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "山田家",
      "role": "owner"
    }
  ]
}
```

---

### 3.2 世帯・メンバー管理 (`/households`)

#### 3.2.1 世帯新規作成
* **エンドポイント**: `POST /households`
* **権限**: `Auth`

##### リクエスト
```json
{
  "name": "山田家"
}
```

##### レスポンス (`201 Created`)
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "山田家",
  "created_at": "2026-09-23T20:30:00Z"
}
```

---

#### 3.2.2 招待コード生成
* **エンドポイント**: `POST /households/{household_id}/invitations`
* **権限**: `Household`

##### レスポンス (`201 Created`)
```json
{
  "invite_code": "GOHAN-8823-X9K2",
  "expires_at": "2026-09-24T20:30:00Z"
}
```

---

#### 3.2.3 招待コードによる世帯参加
* **エンドポイント**: `POST /households/join`
* **権限**: `Auth`

##### リクエスト
```json
{
  "invite_code": "GOHAN-8823-X9K2"
}
```

##### レスポンス (`200 OK`)
```json
{
  "household_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "山田家",
  "joined_at": "2026-09-23T20:35:00Z"
}
```

---

### 3.3 メニュー管理 (`/households/{household_id}/menus`)

#### 3.3.1 メニュー一覧取得
* **エンドポイント**: `GET /households/{household_id}/menus`
* **権限**: `Household`

##### レスポンス (`200 OK`)
```json
{
  "menus": [
    {
      "id": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
      "name": "カレーライス",
      "description": "中辛のカレールーを使用",
      "created_at": "2026-09-20T10:00:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8b9c-0d1e-23456789abcd",
      "name": "ハンバーグ",
      "description": "和風おろしソース",
      "created_at": "2026-09-21T11:00:00Z"
    }
  ]
}
```

---

#### 3.3.2 メニュー新規登録
* **エンドポイント**: `POST /households/{household_id}/menus`
* **権限**: `Household`

##### リクエスト
```json
{
  "name": "生姜焼き",
  "description": "豚ロース肉使用"
}
```

##### レスポンス (`201 Created`)
```json
{
  "id": "c3d4e5f6-a7b8-9c0d-1e2f-3456789abcde",
  "name": "生姜焼き",
  "description": "豚ロース肉使用",
  "created_at": "2026-09-23T20:40:00Z"
}
```

---

#### 3.3.3 メニュー更新
* **エンドポイント**: `PUT /households/{household_id}/menus/{menu_id}`
* **権限**: `Household`

##### リクエスト
```json
{
  "name": "特製生姜焼き",
  "description": "玉ねぎ多め"
}
```

##### レスポンス (`200 OK`)
```json
{
  "id": "c3d4e5f6-a7b8-9c0d-1e2f-3456789abcde",
  "name": "特製生姜焼き",
  "description": "玉ねぎ多め",
  "updated_at": "2026-09-23T20:45:00Z"
}
```

---

#### 3.3.4 メニュー削除
* **エンドポイント**: `DELETE /households/{household_id}/menus/{menu_id}`
* **権限**: `Household`

##### レスポンス (`204 No Content`)
*(ボディなし)*

---

### 3.4 提案・食事履歴 (`/households/{household_id}/meals`)

#### 3.4.1 今日のメニューガチャ（ランダム提案）
* **エンドポイント**: `GET /households/{household_id}/meals/suggest`
* **権限**: `Household`

##### レスポンス (`200 OK`)
```json
{
  "suggested_menu": {
    "id": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
    "name": "カレーライス",
    "description": "中辛のカレールーを使用",
    "last_served_date": "2026-09-10"
  }
}
```

---

#### 3.4.2 食事履歴の記録
* **エンドポイント**: `POST /households/{household_id}/meals`
* **権限**: `Household`

##### リクエスト
```json
{
  "menu_id": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "served_date": "2026-09-23",
  "meal_type": "dinner"
}
```

##### レスポンス (`201 Created`)
```json
{
  "id": "d4e5f6a7-b8c9-0d1e-2f3a-456789abcdef",
  "household_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "menu_id": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
  "served_date": "2026-09-23",
  "meal_type": "dinner",
  "created_at": "2026-09-23T20:50:00Z"
}
```

---

#### 3.4.3 食事履歴一覧取得
* **エンドポイント**: `GET /households/{household_id}/meals?limit=20`
* **権限**: `Household`

##### レスポンス (`200 OK`)
```json
{
  "histories": [
    {
      "id": "d4e5f6a7-b8c9-0d1e-2f3a-456789abcdef",
      "served_date": "2026-09-23",
      "meal_type": "dinner",
      "menu": {
        "id": "71a2d1b8-3e4f-4d2a-928d-123456789abc",
        "name": "カレーライス"
      }
    }
  ]
}
```