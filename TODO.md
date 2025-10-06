# gh-arch-viz 開発進捗管理

> 最終更新: 2025-10-06 ✅ **実装完了**

## 📋 プロジェクト概要

GitHub の org/team メンバー限定で、チームがアクセスできるリポジトリの技術スタックを自動検出・可視化するアプリケーション

**技術スタック**: Next.js 15 (App Router) + React 19 + Better Auth + PostgreSQL (Neon) + Drizzle ORM + shadcn/ui + Tailwind v4

---

## 🎯 Phase 1: 基盤セットアップ

### 1.1 環境構築

- [x] **依存パッケージのインストール**

  - [x] Next.js 15 / React 19 の確認（既存）
  - [x] Better Auth v1.x のインストール
  - [x] Drizzle ORM + PostgreSQL ドライバ (`drizzle-orm`, `pg`)
  - [x] Octokit (`@octokit/rest`)
  - [x] その他ユーティリティ (`cuid2`, `zod`)

- [x] **環境変数テンプレート作成**
  - [x] `.env.example` 作成
    - `AUTH_SECRET`, `AUTH_URL`
    - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
    - `ALLOWED_GH_ORG`, `ALLOWED_GH_TEAM_SLUG`（空文字列でチームチェックスキップ）
    - `DATABASE_URL` (Neon)
    - `MEMBERSHIP_CACHE_TTL_SECONDS`, `SESSION_TTL_MINUTES`

### 1.2 認証基盤（Better Auth）

- [x] **Better Auth セットアップ**

  - [x] `lib/auth.ts` 作成
    - GitHub OAuth プロバイダ設定（`read:org` + `repo` スコープ）
    - Database 接続設定（PostgreSQL）
    - SignIn callback 実装（org/team メンバーシップ検証）
    - セッションに `githubToken`, `org`, `team`, `lastVerifiedAt` を保存

- [x] **メンバーシップ検証ロジック**

  - [x] `lib/auth.ts` に `verifyMembership()` 実装
    - Org メンバーシップ確認（`/orgs/{org}/memberships/{username}`）
    - Team メンバーシップ確認（`/orgs/{org}/teams/{team_slug}/memberships/{username}`）
    - **チームスラッグが空の場合はチームチェックをスキップ**（組織メンバーシップのみ）

- [x] **API Route ハンドラー**
  - [x] `app/api/auth/[...route]/route.ts` 作成（Better Auth ハンドラー）

### 1.3 データベース（Drizzle + Neon）

- [x] **スキーマ定義**

  - [x] `lib/db/schema.ts` に `repo_inventory` テーブル追加
    - `repo_inventory` テーブル定義（SPEC の通り）
    - 複合ユニークインデックス（`org` + `repoId`）

- [x] **DB クライアント**

  - [x] `lib/db/index.ts` 作成済み（Neon HTTP + Drizzle）

- [x] **マイグレーション**
  - [x] `drizzle.config.ts` 作成済み
  - [x] `pnpm db:generate` スクリプト追加済み
  - [x] `pnpm db:migrate` スクリプト追加済み
  - [x] マイグレーション生成完了

---

## 🔧 Phase 2: コア機能実装

### 2.1 GitHub 連携ヘルパー

- [x] **Octokit ヘルパー関数**

  - [x] `lib/github.ts` 作成
    - `makeOctokit(accessToken)` - Octokit インスタンス生成
    - `listTeamRepos(octokit, org, teamSlug)` - チームリポ一覧取得
    - `getRepoTree(octokit, owner, repo, branch)` - ファイルツリー取得
    - `getText(octokit, owner, repo, path)` - ファイル内容取得
    - `checkRateLimit(octokit)` - レート制限確認

- [x] **エラーハンドリング・リトライ**
  - [x] `lib/retry.ts` 作成
    - `withRetry()` 実装（指数バックオフ、Rate Limit 対応）

### 2.2 スキャナー実装

- [x] **スキャナーコア**

  - [x] `lib/scan.ts` 作成
    - `scanOneRepo()` - メイン処理（tree 取得 →detector 実行 →DB 保存）
    - `initInventory()` - 初期在庫オブジェクト生成
    - `mergeArrays()` - detector 結果のマージ
    - `average()` - スコア平均計算

- [x] **Detector 実装（6 種類）**

  - [x] `lib/detectors/node.ts` - Node.js 検出（`package.json`, `pnpm-lock.yaml`, etc.）
  - [x] `lib/detectors/nextjs.ts` - Next.js 検出（`next.config.js`）
  - [x] `lib/detectors/docker.ts` - Docker 検出（`Dockerfile`, `docker-compose.yml`）
  - [x] `lib/detectors/github-actions.ts` - GitHub Actions 検出（`.github/workflows/*.yml`）
  - [x] `lib/detectors/vercel.ts` - Vercel 検出（`vercel.json`）
  - [x] `lib/detectors/terraform.ts` - Terraform 検出（`*.tf`）

- [x] **Evidence 収集・スコアリング**
  - [x] 各 detector に `proofs` 配列を実装（ファイルパス + 抜粋）
  - [x] スコア計算ロジック（confidence: 0-1）

### 2.3 API Routes 実装

- [x] **権限検証ミドルウェア**

  - [x] `lib/middleware/auth.ts` 作成
    - セッション検証
    - TTL チェック（`lastVerifiedAt`）
    - 必要に応じて org/team 再検証

- [x] **API エンドポイント**

  - [x] `app/api/inventory/route.ts` (GET)

    - クエリパラメータでフィルタ（`fw`, `deploy`, `lang`, etc.）
    - ページネーション対応

  - [x] `app/api/inventory/scan/route.ts` (POST)

    - 一括スキャン（全件 or 選択リポ）
    - バックグラウンドジョブ or 並列処理（簡易実装）

  - [x] `app/api/repo/[id]/scan/route.ts` (POST)
    - 単体リポ再スキャン

---

## 🎨 Phase 3: UI/UX 実装

### 3.1 レイアウト・共通コンポーネント

- [x] **shadcn/ui コンポーネント追加**
  - [x] `Table` コンポーネント（既存）
  - [x] `Badge` コンポーネント（既存）
  - [x] `Button` コンポーネント（既存）
  - [x] `Sheet` (Drawer) コンポーネント
  - [x] `Card` コンポーネント
  - [x] `Input` コンポーネント（既存）

### 3.2 画面実装

- [x] **ランディングページ（`/`）**

  - [x] `app/page.tsx` 作成
    - GitHub Sign In ボタン
    - プロジェクト説明

- [x] **メインテーブル（`/app`）**

  - [x] `app/app/page.tsx` 作成
    - Protected route (認証チェック)
    - インベントリテーブル表示
    - 一括スキャンボタン

- [x] **リポジトリ詳細（`/repo/[name]`）**

  - [x] `app/repo/[name]/page.tsx` 作成
    - メタ情報タイル表示
    - 各カテゴリ（Frameworks, CI/CD, Deploy, etc.）を Badge 表示
    - Evidence Sheet (Drawer) 実装

- [x] **集計・チャート（`/insights`）**
  - [x] `app/insights/page.tsx` 作成
    - Recharts で言語/FW/Deploy/CI/Container 分布
    - Summary 統計

---

## 🚀 Phase 4: デプロイ・運用準備

### 4.1 デプロイ設定

- [x] **pnpm スクリプト整備**
  - [x] `package.json` に追加済み
    - `"db:generate": "drizzle-kit generate"`
    - `"db:migrate": "drizzle-kit migrate"`
    - `"db:push": "drizzle-kit push"`

### 4.2 ドキュメント作成

- [x] **README.md 作成**
  - [x] プロジェクト概要
  - [x] セットアップ手順
    - GitHub OAuth App 作成方法
    - Neon DB セットアップ
    - 環境変数設定
  - [x] 使用方法
  - [x] 開発コマンド
  - [x] デプロイ手順
  - [x] トラブルシューティングガイド
  - [x] ロードマップ

---

## 🔍 テスト・品質保証

- [ ] **手動テスト項目**

  - [ ] GitHub OAuth フロー（成功・失敗ケース）
  - [ ] org/team 非所属ユーザーの拒否
  - [ ] リポジトリスキャン（各 detector の動作確認）
  - [ ] フィルタ・検索機能
  - [ ] Evidence 表示
  - [ ] 再スキャン（単体/一括）

- [ ] **エッジケース確認**
  - [ ] レート制限到達時の挙動
  - [ ] トークン有効期限切れ
  - [ ] TTL 再検証フロー
  - [ ] 空リポジトリ・アーカイブ済みリポ

---

## 📝 実装メモ・備考

### 依存関係の注意点

- **Better Auth v1.x**: 最新版を使用（v2.x は仕様が異なる可能性あり）
- **Tailwind v4**: `@tailwindcss/cli` ベース。従来の `postcss.config` と異なる
- **shadcn/ui**: App Router 対応版（v1 系）を使用

### 認証ロジックの修正（2025-10-06）

- **チームチェックのスキップ機能**: `ALLOWED_GH_TEAM_SLUG=""`の場合、チームメンバーシップ確認をスキップ
- **組織メンバーシップのみ**: 指定された組織のメンバーであれば誰でもアクセス可能
- **実装場所**: `lib/auth.ts`の`verifyMembership()`関数に条件分岐を追加

### 実装優先度

**MVP（最小限）**: Phase 1 全て + Phase 2 全て + Phase 3.2（メインテーブルのみ）
**完全版**: 全フェーズ

### セキュリティチェックリスト

- [ ] `repo` スコープは読み取り専用として使用
- [ ] `.env.local` を `.gitignore` に追加
- [ ] セッション TTL 適切に設定
- [ ] CSP ヘッダー設定（Next.js config）

---

## 🎬 次のアクション

現在のステータス: **Phase 2 完了 → Phase 3 開始**

**完了済み**:

- ✅ Phase 1: 基盤セットアップ（環境構築・認証・DB）
- ✅ Phase 2: コア機能（GitHub 連携・スキャナー・API）

**次のステップ**:

1. Phase 3.1: shadcn/ui コンポーネント追加
2. Phase 3.2: 画面実装（ランディング・メインテーブル・詳細）
3. Phase 3.3: コンポーネント実装（Table・Drawer・Charts）
4. Phase 4: デプロイ・ドキュメント

---

**進捗率**: 約 50/100 項目完了 (50%)
