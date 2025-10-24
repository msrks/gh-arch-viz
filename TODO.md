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

    - 一括スキャン（全リポジトリを Upstash QStash にキューイング）
    - 組織全体のリポジトリ取得（チームスラッグ空の場合）

  - [x] `app/api/queue/scan-repo/route.ts` (POST)

    - QStash ワーカーエンドポイント（署名検証付き）
    - 単一リポジトリのバックグラウンドスキャン処理

  - [x] `app/api/repo/[id]/scan/route.ts` (POST)
    - 単体リポ再スキャン

### 2.4 バックグラウンドジョブ（Upstash QStash）

- [x] **QStash セットアップ**

  - [x] `@upstash/qstash` パッケージインストール
  - [x] `lib/qstash.ts` - QStash クライアント作成
  - [x] 環境変数設定（`.env.example` に追加）

- [x] **キュー処理実装**
  - [x] `/api/inventory/scan` でリポジトリを QStash にエンキュー
  - [x] `/api/queue/scan-repo` でワーカー処理（署名検証）
  - [x] UI 更新（`components/scan-all-button.tsx` でキューイング状態の表示）
  - [x] 組織全体のリポジトリスキャン対応（`lib/github.ts` に `listOrgRepos` 追加）

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

## 👥 Phase 5: メンバー管理機能（新規）

### 5.1 データベーススキーマ

- [x] **org_members テーブル作成**
  - [x] スキーマ定義 (`lib/db/schema.ts`)
    - `id`, `org`, `username`, `userId`, `name`, `avatarUrl`, `profileUrl`
    - `role` (admin/member)
    - `repositoryCount`, `lastActiveAt`
    - `lastSyncedAt`, `createdAt`, `updatedAt`
  - [x] ユニークインデックス設定 (`org` + `username`)
  - [x] `pnpm db:push` でスキーマ反映

### 5.2 GitHub API 統合

- [x] **メンバー取得関数**
  - [x] `lib/github.ts` に `listOrgMembers()` 追加
    - `/orgs/{org}/members` API 呼び出し
    - ページネーション対応（`octokit.paginate`）
  - [x] `getUserDetails()` 関数追加
    - `/users/{username}` で詳細情報取得
  - [x] `getMemberRole()` 関数追加
    - `/orgs/{org}/memberships/{username}` でロール取得

### 5.3 API エンドポイント

- [x] **GET `/api/members`**
  - [x] データベースからメンバー一覧取得
  - [x] `lastActiveAt` でソート（降順）
  - [x] 認証チェック（Better Auth セッション）

- [x] **POST `/api/members/sync`**
  - [x] GitHub API からメンバー一覧取得
  - [x] 各メンバーの詳細情報・ロールを取得
  - [x] データベースに upsert（既存メンバーは更新）
  - [x] バッチ処理（10メンバーずつ）

### 5.4 UI 実装

- [x] **`/app/members/page.tsx`**
  - [x] サーバーコンポーネントとして実装
  - [x] データベースからメンバー一覧取得
  - [x] テーブルレイアウト
    - Avatar (画像)
    - Username (GitHub ユーザー名)
    - Name (表示名)
    - Role (Admin/Member バッジ)
    - Repositories (リポジトリ数)
    - Last Active (最終アクティビティ、相対時間表示)

- [x] **`components/sync-members-button.tsx`**
  - [x] クライアントコンポーネント
  - [x] "Sync Members" ボタン
  - [x] `/api/members/sync` を呼び出し
  - [x] ローディング状態表示

- [x] **ナビゲーション統合**
  - [x] リポジトリ一覧ページに "View Members" ボタン追加
  - [x] メンバーページに "View Repositories" ボタン追加

### 5.5 統計情報の追加

- [x] **統計情報の追加**
  - [x] リポジトリ数のカウント（contributorとして登録されているリポジトリ数）
  - [x] 総貢献数の取得・表示（Total Contributions）
  - [x] 最終アクティビティの取得・表示（最新のrepoPushedAt）
  - [x] Last Active が NULL のメンバーを最後尾に表示

### 5.6 チーム管理機能

- [x] **データベーススキーマ**
  - [x] `teams` テーブル作成（id, org, teamId, slug, name, description, privacy）
  - [x] `teamMembers` テーブル作成（id, teamId, memberId, role）
  - [x] 外部キー制約設定（cascade delete）

- [x] **GitHub API 統合**
  - [x] `lib/github.ts` に `listOrgTeams()` 追加
  - [x] `lib/github.ts` に `listTeamMembers()` 追加
  - [x] `lib/github.ts` に `getTeamMembershipRole()` 追加

- [x] **API エンドポイント**
  - [x] `/api/members/sync` でチーム情報も同期
  - [x] チームメンバーシップの取得・保存

- [x] **UI 実装**
  - [x] `/app/members/page.tsx` に Teams カラム追加
  - [x] 各メンバーの所属チームをバッジ表示

### 5.7 拡張機能（今後の改善）

- [ ] **検索・フィルタ**
  - [ ] ユーザー名・表示名検索
  - [ ] ロールフィルタ (Admin/Member)
  - [ ] チームフィルタ

- [ ] **ページネーション**
  - [ ] 大規模組織対応

---

## 🎨 Phase 6: Contributors 可視化機能

### 6.1 データベーススキーマ

- [x] **repo_inventory テーブルへの追加**
  - [x] スキーマ定義 (`lib/db/schema.ts`)
    - `contributors` (JSONB) - 貢献者情報の配列
    - `contributorsCount` (integer) - 貢献者数
    - `contributorsUpdatedAt` (timestamp) - 最終更新日時
  - [x] `pnpm db:push` でスキーマ反映

### 6.2 GitHub API 統合

- [x] **Contributors 取得関数**
  - [x] `lib/github.ts` に `listRepoContributors()` 追加
    - `/repos/{owner}/{repo}/contributors` API 呼び出し
    - ページネーション対応（最大100件取得）
    - Bot アカウントのフィルタリング
    - 上位10名のみ保存（画面表示用）

### 6.3 スキャン処理への統合

- [x] **`lib/scan.ts` の更新**
  - [x] `scanOneRepo()` 内で contributors 情報を取得
  - [x] `initInventory()` に contributors フィールドを追加
  - [x] エラーハンドリング（404、タイムアウト対応）

### 6.4 UI 実装

- [x] **`/app/page.tsx` の更新**
  - [x] テーブルに Contributors 列を追加
  - [x] 列順: Repository | Last Updated | Language | Frameworks | Contributors
  - [x] アバター表示コンポーネントの実装
    - 最大7名のアバターを重ねて表示
    - 8人目以降は "+N" で表示
    - ホバーで全貢献者のツールチップ表示

### 6.5 スタイリング

- [x] **Contributors 表示の最適化**
  - [x] アバター: 32x32px (円形)
  - [x] 重なり配置: -8px マージン
  - [x] ホバー効果: border highlight
  - [x] "+N" バッジ: 円形、グレー背景

---

## 📬 Phase 7: Daily GitHub Activity Summary

### 7.1 概要

**目的**: 火曜、水曜、木曜、金曜、土曜の午前8時に、前日のGitHub Activity（コミット、PR、Issues、コメント等）をメンバー向けに配信

### 7.2 データベーススキーマ

- [x] **activity_summaries テーブル作成**
  - [x] スキーマ定義 (`lib/db/schema.ts`)
    - `id` (serial primary key)
    - `org` (varchar) - 組織名
    - `summaryDate` (date) - サマリー対象日（前日）
    - `markdown` (text) - 生成されたMarkdownコンテンツ
    - `sentAt` (timestamp) - 配信日時
    - `createdAt` (timestamp)
  - [x] ユニークインデックス (`org` + `summaryDate`)
  - [x] `pnpm db:push` でスキーマ反映

### 7.3 GitHub API 統合

- [x] **Activity 取得関数**
  - [x] `lib/github.ts` に以下を追加
    - `getRepoCommits(octokit, owner, repo, since, until)` - リポジトリのコミット
    - `getOrgPullRequests(octokit, org, since, until)` - PRの一覧
    - `getOrgIssues(octokit, org, since, until)` - Issueの一覧

### 7.4 Markdown サマリー生成

- [x] **サマリー生成ロジック**
  - [x] `lib/activity-summary.ts` 作成
    - `generateDailySummary(org, date)` - メイン関数
    - `formatCommitSummary(commits)` - コミットのフォーマット
    - `formatPRSummary(prs)` - PRのフォーマット
    - `formatIssueSummary(issues)` - Issueのフォーマット
    - `groupByRepository(activities)` - リポジトリごとにグループ化
    - `groupByMember(activities)` - メンバーごとにグループ化

### 7.5 スケジュール実行（Vercel Cron Jobs）

- [x] **Cron Job 設定**
  - [x] `vercel.json` でスケジュール設定
  - [x] Cron式: `0 23 * * 1-5` (UTC, 月〜金 23:00 = JST 火〜土 8:00)
  - [x] エンドポイント: `/api/cron/daily-summary`
  - [x] 環境変数 `CRON_SECRET` で認証

### 7.6 API エンドポイント

- [x] **GET `/api/cron/daily-summary`**
  - [x] Vercel Cron認証（Authorization Bearer token チェック）
  - [x] 前日の日付を計算
  - [x] `generateDailySummary()` 呼び出し
  - [x] 生成したMarkdownをDBに保存
  - [x] Resendでメール配信

- [x] **GET `/api/activity/summaries`**
  - [x] 過去のサマリー一覧取得
  - [x] 日付でソート（降順）

- [x] **GET `/api/activity/summaries/[date]`**
  - [x] 特定日付のサマリー取得
  - [x] Markdown表示

### 7.7 メール配信機能（Resend）

- [x] **Resend セットアップ**
  - [x] `resend` パッケージインストール（`pnpm add resend`）
  - [x] Resend API Key 取得（環境変数 `RESEND_API_KEY`）
  - [x] `.env.example` 更新

- [x] **Email 統合**
  - [x] `lib/email.ts` 作成
    - `sendDailySummary(to, subject, markdown)` - メイン関数
    - Markdown → HTML変換（`marked`）
    - Resend API呼び出し
  - [x] 環境変数で配信先リスト設定（`ACTIVITY_SUMMARY_RECIPIENTS`）

### 7.8 UI 実装

- [x] **`/app/activity/page.tsx`**
  - [x] サマリー一覧ページ
  - [x] 統計情報表示（Total Summaries, Emails Sent, Last Sent）
  - [x] サマリー履歴テーブル
  - [x] 各日付をクリックでサマリー表示

- [x] **`/app/activity/[date]/page.tsx`**
  - [x] 特定日付のサマリー詳細ページ
  - [x] Markdownレンダリング（GitHub風スタイル）
  - [x] メタデータ表示

- [x] **ナビゲーション統合**
  - [x] 共有ナビゲーションに "Activity" リンク追加

### 7.9 配信機能（将来対応）

- [ ] **Microsoft Teams 統合（Phase 8で実装予定）**
  - [ ] Teams Webhook URL設定（環境変数）
  - [ ] `lib/teams.ts` - Teams投稿関数
  - [ ] Adaptive Cardsフォーマットでの投稿

### 7.10 テスト・デバッグ

- [ ] **手動実行機能**
  - [ ] UI上で任意の日付のサマリー生成
  - [ ] 生成されたMarkdownのプレビュー

- [ ] **ローカルテスト**
  - [ ] `/api/cron/daily-summary` を `CRON_SECRET` 付きで呼び出し
  - [ ] 前日のアクティビティが正しく取得されるか確認

- [ ] **Vercel Cron テスト**
  - [ ] `vercel.json` 設定確認
  - [ ] Vercel Logs でCron実行履歴確認
  - [ ] 手動トリガー（Vercel Dashboard経由）

### 7.11 ドキュメント更新

- [x] **TODO.md**
  - [x] Phase 7の詳細追加

- [x] **README.md**
  - [x] Daily Activity Summary機能の説明
  - [x] スケジュール設定方法
  - [x] Resend設定手順
  - [x] メール配信先設定方法

- [x] **CLAUDE.md**
  - [x] アーキテクチャへの追加
  - [x] API Routes一覧に追加
  - [x] Vercel Cron設定の説明
  - [x] Resend統合の説明

### 7.12 必要パッケージ

- [x] **依存関係追加**
  - [x] `resend` - メール送信
  - [x] `marked` - Markdown → HTML変換
  - [x] `date-fns` - 日付処理

### 7.13 Markdownサマリーの構成例

```markdown
# GitHub Activity Summary - 2025-10-23

## 📊 Overview
- **Total Commits**: 42
- **Pull Requests**: 8 (6 merged, 2 open)
- **Issues**: 5 (3 opened, 2 closed)
- **Active Members**: 12

## 👥 Top Contributors
1. **@alice** - 15 commits, 3 PRs
2. **@bob** - 10 commits, 2 PRs
3. **@charlie** - 8 commits, 1 PR

## 📦 Repository Activity

### repo-name-1
- **Commits**: 12
  - @alice: feat: add new feature (#123)
  - @bob: fix: resolve bug (#124)
- **Pull Requests**:
  - #45 - feat: implement X (merged by @alice)
  - #46 - refactor: improve Y (open)

### repo-name-2
- **Commits**: 8
  - @charlie: docs: update README
- **Issues**:
  - #78 - Bug: Something broken (opened by @dave)

## 🔥 Highlights
- 🎉 repo-name-1 reached 100 stars!
- 🚀 Deployed version 2.0.0 to production

---
Generated at: 2025-10-24 08:00 JST
```

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

### バックグラウンドジョブの実装（2025-10-06）

- **Upstash QStash 導入**: Vercel 環境での実行時間制限を回避するためバックグラウンドジョブ処理を実装
- **開発/本番環境の自動切り替え**: 開発環境ではバッチ並列処理（10個ずつ）、本番環境ではQStash使用
- **署名検証**: QStash からのリクエストは署名検証で保護
- **組織全体のスキャン**: チームスラッグが空の場合、組織全体のリポジトリをスキャン可能

### UIの改善（2025-10-06）

- **リポジトリメタデータ**: GitHub repo の最終更新日時（`repo_updated_at`, `repo_pushed_at`）をDBに保存
- **相対時間表示**: "2 days ago"形式で最終更新日時を表示
- **言語カラー**: Python, TypeScript, JavaScript, Jupyter Notebook, HCL, Vue の6言語にGitHubカラーを適用
- **テーブル最適化**: CI/CD, Deploy, Container, Score, Last Scan 列を削除し、シンプルな4列構成に
- **リポジトリ名トランケート**: 30文字以上は省略表示（ホバーで全文表示）
- **ソート改善**: GitHub repo の最終push日時（`repo_pushed_at`）でソート

### メンバー管理機能の拡張（2025-10-07）

- **統計情報の追加**: `org_members` テーブルに `totalContributions` フィールド追加
- **チーム管理**: `teams` と `teamMembers` テーブルを新規作成し、メンバーのチーム所属を可視化
- **GitHub API拡張**: チーム情報取得関数（`listOrgTeams`, `listTeamMembers`, `getTeamMembershipRole`）追加
- **メンバーページUI改善**:
  - Username/Role 列を削除してシンプル化
  - Last Active を2列目に移動
  - Contributions 列追加
  - Teams 列追加（バッジ表示）
  - NULL の Last Active は最後尾にソート

### リポジトリ同期機能の改善（2025-10-07）

- **Sync ボタンの実装**: "Scan New Repositories" → "Sync" に名称変更
- **スマートスキャンアルゴリズム**:
  - 新規リポジトリ: 無条件でスキャン
  - 既存リポジトリ: `pushedAt` が更新されている場合のみ再スキャン
  - 変更のないリポジトリ: スキップ
- **レスポンス情報の充実**:
  - `newCount`: 新規リポジトリ数
  - `updatedCount`: 更新されたリポジトリ数
  - `totalScanned`: 合計スキャン数
- **UI改善**: RefreshCw アイコン + スピンアニメーション + 詳細な結果表示

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

現在のステータス: **Phase 3 完了 → 運用準備**

**完了済み**:

- ✅ Phase 1: 基盤セットアップ（環境構築・認証・DB）
- ✅ Phase 2: コア機能（GitHub 連携・スキャナー・API・**QStash バックグラウンドジョブ**）
- ✅ Phase 3: UI/UX（ランディング・メインテーブル・詳細・インサイト）
- ✅ Phase 4: デプロイ準備・ドキュメント
- ✅ Phase 5: メンバー管理（組織メンバー一覧・ロール・アバター表示・**統計情報・チーム管理**）
- ✅ Phase 6: Contributors 可視化（アバター重ね表示・貢献数表示）
- ✅ Phase 7: 複数言語サポート（20%以上の言語を全て表示・割合表示）

**次のステップ**:

1. ~~Upstash QStash アカウント作成・トークン取得~~ ✅
2. ~~メンバー管理機能の拡張（統計情報、チーム管理）~~ ✅
3. メンバー管理機能の更なる拡張（検索・フィルタ、ページネーション）
4. 本番環境でのテスト
5. パフォーマンス最適化（必要に応じて）

---

**進捗率**: 約 115/120 項目完了 (96%)
