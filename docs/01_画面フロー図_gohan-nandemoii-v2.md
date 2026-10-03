# 画面フロー図・設計仕様書 (gohan-nandemoii-v2)

> 最終更新日: 2026-10-03

本書は、`gohan-nandemoii-v2` における画面一覧、アクセス制御、画面フロー図を定義するドキュメントです。

各画面が紐づく機能要件については [02_機能要件一覧_gohan-nandemoii-v2.md](./02_機能要件一覧_gohan-nandemoii-v2.md)、関連するデータ構造やバックエンド処理については [03_データモデル定義_gohan-nandemoii-v2.md](./03_データモデル定義_gohan-nandemoii-v2.md) および [04_API仕様_gohan-nandemoii-v2.md](./04_API仕様_gohan-nandemoii-v2.md) を参照してください。

---

## 1. 画面一覧

| 画面ID    | 画面名               | URL                 | ログイン | 世帯所属 | 概要                                                   |  状態  |
| :-------- | :------------------- | :------------------ | :------: | :------: | :----------------------------------------------------- | :----: |
| **SC-01** | トップ（ごはん提案） | `/`                 |   必須   |   必須   | 今日のごはん提案およびメインダッシュボード             | 実装済 |
| **SC-02** | ログイン             | `/login`            |   不要   |   不要   | メール/パスワードおよびGoogle OAuthによるログイン認証  | 実装済 |
| **SC-03** | 新規登録             | `/register`         |   不要   |   不要   | 新規ユーザーアカウント作成                             | 実装済 |
| **SC-04** | 世帯作成             | `/household/create` |   必須   |   不要   | 新しい世帯グループの立ち上げ・作成                     | 実装済 |
| **SC-05** | 世帯参加             | `/household/join`   |   必須   |   不要   | 招待コードを使用した既存世帯への参加                   | 実装済 |
| **SC-06** | 招待コード発行       | `/household/invite` |   必須   |   必須   | 世帯メンバー招待用のコード生成・管理                   | 実装済 |
| **SC-07** | メニュー一覧         | `/menus`            |   必須   |   必須   | 登録されているレシピ・料理メニューの閲覧・管理         | 実装済 |
| **SC-08** | 履歴                 | `/history`          |   必須   |   必須   | 過去に提案・決定・食べたごはんの履歴参照               | 実装済 |
| **SC-09** | プロフィール         | `/mypage/profile`   |   必須   |   必須   | ユーザー情報・アカウント設定の変更                     | 実装済 |
| **SC-10** | パスワード再設定依頼 | `/forgot-password`  |   不要   |   不要   | パスワードリセット用メールの送信リクエスト             | 実装済 |
| **SC-11** | パスワード更新       | `/update-password`  |   必須   |   不要   | パスワード変更処理画面                                 | 実装済 |
| **SC-12** | 家族サマリー         | `/family-summary`   |   必須   |   必須   | 家族全員の今日の希望リクエスト状況・選出結果確認       | 実装済 |
| **SC-13** | 今日の希望登録       | `/my-dish`          |   必須   |   必須   | 今日食べたい料理のリクエスト登録画面                   | 実装済 |
| **SC-14** | メニュー編集         | `/menus/[id]/edit`  |   必須   |   必須   | 既存料理メニューの名称・タグ・画像等の編集             | 実装済 |
| **-**     | Authコールバック     | `/auth/callback`    |   不要   |   不要   | Google OAuth認証完了時のコールバック処理ハンドラー     | 実装済 |

---

## 2. アクセス制御と分岐（ガード条件）

画面へアクセスする際、認証状態および世帯所属状態に応じたガード・リダイレクト制御を行っています。

### 2.1. 画面（ページ）アクセス制御の実装方式

1. **Middleware による一元ガード (`middleware.ts`)**
   - **対象保護パス**: `/` (SC-01), `/mypage` (SC-09)
   - 未ログインユーザーが対象パスにアクセスした場合、自動的に **`SC-02 ログイン (/login)`** へリダイレクトされます。

2. **ページ（Server Components）単位ガード**
   - **対象パス**: `/menus` (SC-07), `/history` (SC-08)
   - 各ページコンポーネント内で個別にユーザー認証および世帯所属判定を行っています。
     - **未ログイン**: **`SC-02 ログイン (/login)`** へリダイレクト
     - **世帯未所属**: **`SC-04 世帯作成 (/household/create)`** へリダイレクト

3. **クライアント側ガードおよび注意点（実装課題）**
   - **対象パス**: `/family-summary` (SC-12), `/my-dish` (SC-13)
   - 現在の実装ではサーバー側のリダイレクト処理が含まれず、未ログイン時はクライアント側で処理を停止（何も表示しない）状態となっています。仕様通りのセキュリティ担保のため、サーバー側ガードの追加が推奨されます。

4. **ログイン済みガード（認証済みユーザーの制限）**
   - **対象**: `SC-02 ログイン (/login)`
   - 既にログイン済みのユーザーが直接アクセスした場合、Middleware により **`SC-01 トップ (/)`** へリダイレクトされます。（※ `/register` については現時点で直接アクセス可能）

### 2.2. APIエンドポイントでの世帯未所属ガード

API（例: [`POST /api/recommend`](./04_API仕様_gohan-nandemoii-v2.md) 等）へ世帯未所属ユーザーが要求を送った場合、リダイレクトではなく **HTTP status 400 (Bad Request)** を返却します。

---

## 3. 画面フロー図 (Flowchart)

```mermaid
flowchart TD
    %% スタイル定義
    classDef implemented fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;

    %% 未ログインエリア
    subgraph PublicArea["未ログインエリア（公開画面）"]
        SC02["[SC-02] ログイン<br/>/login"]:::implemented
        SC03["[SC-03] 新規登録<br/>/register"]:::implemented
        SC10["[SC-10] パスワード再設定依頼<br/>/forgot-password"]:::implemented
        AUTH_CB["Auth Callback<br/>/auth/callback"]:::implemented
    end

    %% ログイン済・世帯未所属エリア
    subgraph AuthOnlyArea["ログイン済エリア（世帯未所属）"]
        SC04["[SC-04] 世帯作成<br/>/household/create"]:::implemented
        SC05["[SC-05] 世帯参加<br/>/household/join"]:::implemented
        SC11["[SC-11] パスワード更新<br/>/update-password"]:::implemented
    end

    %% ログイン済・世帯所属エリア
    subgraph HouseholdArea["世帯所属エリア（ログイン＆世帯所属必須）"]
        SC01["[SC-01] トップ（ごはん提案）<br/>/"]:::implemented
        SC06["[SC-06] 招待コード発行<br/>/household/invite"]:::implemented
        SC07["[SC-07] メニュー一覧<br/>/menus"]:::implemented
        SC08["[SC-08] 履歴<br/>/history"]:::implemented
        SC09["[SC-09] プロフィール<br/>/mypage/profile"]:::implemented
        SC12["[SC-12] 家族サマリー<br/>/family-summary"]:::implemented
        SC13["[SC-13] 今日の希望登録<br/>/my-dish"]:::implemented
        SC14["[SC-14] メニュー編集<br/>/menus/[id]/edit"]:::implemented
    end

    %% 判定ロジック
    CheckAuth{"認証チェック"}:::decision
    CheckHousehold{"世帯所属チェック"}:::decision

    %% エントリーポイント・ガード分岐
    Start([画面アクセス]) --> CheckAuth

    CheckAuth -->|未ログイン| SC02
    CheckAuth -->|ログイン済| CheckHousehold

    CheckHousehold -->|世帯未所属| SC04
    CheckHousehold -->|世帯所属済| SC01

    %% アカウント認証フロー
    SC02 -->|Emailログイン / Google OAuth| AUTH_CB
    AUTH_CB --> CheckHousehold
    SC02 -->|パスワード忘れ| SC10
    SC03 -->|登録完了| CheckHousehold
    SC10 -->|メールリンクアクセス| SC11

    %% 世帯セットアップフロー
    SC04 <-->|切り替え| SC05
    SC04 -->|作成完了| SC01
    SC05 -->|参加完了| SC01

    %% メイン機能間の遷移
    SC01 <--> SC12
    SC01 <--> SC13
    SC01 --> SC06
    SC01 --> SC07
    SC01 --> SC08
    SC01 --> SC09
    SC07 --> SC14
