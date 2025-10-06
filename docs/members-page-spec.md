# Organization Members Page Specification

## 概要

組織（Organization）のメンバー一覧を表示するページを実装する。

## 目的

- 組織に所属する全メンバーを一覧表示
- メンバーの基本情報とアクティビティを可視化
- メンバーの検索・フィルタリング機能

## ページ構成

### URL
- `/members` - 組織メンバー一覧ページ

### レイアウト
- ヘッダー: "Organization Members" + メンバー数
- テーブル形式でメンバー一覧を表示

## 表示項目

### テーブル列

1. **Avatar** (アバター画像)
   - GitHub プロフィール画像
   - サイズ: 40px x 40px (円形)

2. **Username** (ユーザー名)
   - GitHub ユーザー名
   - クリックで GitHub プロフィールページに遷移
   - フォーマット: `@username`

3. **Name** (表示名)
   - GitHub の表示名（フルネーム）
   - 未設定の場合は "-"

4. **Role** (ロール)
   - `Admin` / `Member`
   - Badge で色分け表示
     - Admin: primary (青)
     - Member: secondary (グレー)

5. **Repositories** (リポジトリ数)
   - メンバーがコントリビュートしているリポジトリ数
   - 組織内のリポジトリのみカウント

6. **Last Active** (最終アクティビティ)
   - 組織内リポジトリへの最終コミット日時
   - 相対時間表示 ("2 days ago"形式)

## データ取得

### GitHub API

#### 1. メンバー一覧の取得
```typescript
GET /orgs/{org}/members
```

レスポンス:
```typescript
{
  login: string;        // ユーザー名
  id: number;
  avatar_url: string;   // アバター画像URL
  html_url: string;     // GitHub プロフィールURL
  type: string;         // "User"
  site_admin: boolean;
}
```

#### 2. メンバーの詳細情報取得
```typescript
GET /users/{username}
```

レスポンス:
```typescript
{
  name: string;         // 表示名
  company: string;
  blog: string;
  location: string;
  email: string;
  bio: string;
}
```

#### 3. メンバーのロール取得
```typescript
GET /orgs/{org}/memberships/{username}
```

レスポンス:
```typescript
{
  role: "admin" | "member";
  state: "active" | "pending";
}
```

#### 4. メンバーのコントリビューション（オプション）
組織内リポジトリへのコミット情報を取得
- 実装が複雑な場合は初期バージョンでは省略可能
- 代替案: リポジトリ一覧から各メンバーのコミット情報を集計

## データベーススキーマ

### `org_members` テーブル（新規作成）

```typescript
{
  id: string (cuid2);                    // Primary Key
  org: string;                           // 組織名
  username: string;                      // GitHub ユーザー名
  userId: number;                        // GitHub User ID
  name: string | null;                   // 表示名
  avatarUrl: string;                     // アバター画像URL
  profileUrl: string;                    // GitHub プロフィールURL
  role: "admin" | "member";              // ロール

  // 統計情報（キャッシュ）
  repositoryCount: number;               // コントリビュートしているリポジトリ数
  lastActiveAt: timestamp | null;        // 最終アクティビティ日時

  // メタデータ
  lastSyncedAt: timestamp;               // 最終同期日時
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### インデックス
```typescript
uniqueIndex("org_username_unique").on(table.org, table.username)
```

## API エンドポイント

### 1. メンバー一覧取得
```
GET /api/members
```

クエリパラメータ:
- `role`: "admin" | "member" (オプション)
- `search`: 検索キーワード (username or name)

レスポンス:
```typescript
{
  members: Member[];
  total: number;
}
```

### 2. メンバー情報の同期
```
POST /api/members/sync
```

処理内容:
- GitHub API から組織メンバー一覧を取得
- 各メンバーの詳細情報・ロールを取得
- データベースに保存（upsert）

**開発環境**: 直接同期処理
**本番環境**: QStash でバックグラウンド処理

## UI コンポーネント

### `/app/members/page.tsx`
- サーバーコンポーネント
- データベースからメンバー一覧を取得
- テーブルレイアウト

### `components/sync-members-button.tsx`
- クライアントコンポーネント
- "Sync Members" ボタン
- `/api/members/sync` を呼び出し

## ソート・フィルタリング

### デフォルトソート
- `role` (Admin -> Member)
- `username` (A-Z)

### フィルタ（将来拡張）
- ロールフィルタ (Admin / Member)
- 検索（ユーザー名・表示名）

## セキュリティ

- 認証必須: Better Auth セッション検証
- 組織メンバーシップ確認
- GitHub API トークン: ユーザーの OAuth トークンを使用

## 実装優先度

### Phase 1 (MVP)
- [x] データベーススキーマ作成
- [ ] GitHub API 統合 (`lib/github.ts` に関数追加)
- [ ] `/api/members/sync` エンドポイント
- [ ] `/app/members/page.tsx` ページ
- [ ] 基本的なテーブル表示 (Avatar, Username, Name, Role)

### Phase 2 (拡張)
- [ ] リポジトリ数のカウント
- [ ] 最終アクティビティの取得
- [ ] 検索・フィルタリング機能
- [ ] ページネーション

### Phase 3 (高度な機能)
- [ ] メンバー詳細ページ
- [ ] コントリビューションチャート
- [ ] Team 所属情報

## 注意事項

- GitHub API レート制限に注意（組織メンバー数 × 2リクエスト程度）
- 大規模組織の場合はページネーション必須
- キャッシュ戦略: 1日1回の同期で十分（リアルタイム性不要）
