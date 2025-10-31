# 0) プロジェクト概要（刷新）

**Name:** gh-arch-viz
**Goal:** 指定 org/team の“**メンバーだけ**”をログイン許可し、チームがアクセスできる各リポの**技術アーキテクチャ**を自動検出・一覧化・可視化。
**Stack:**

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, **shadcn/ui** + **Tailwind CSS v4**
- **Backend**: Next.js **API Routes** + **Server Actions**（可能な限り Server Components）
- **DB**: **PostgreSQL (Neon)** + **Drizzle ORM**
- **Auth**: **Better Auth**（GitHub OAuth / `read:org` + _MVP では_ `repo`）
- **Deploy**: **Vercel-ready**
- **Pkg**: **pnpm**

---

# 1) ユースケース

## リポジトリ管理
- 一覧・検索・比較（アーキ台帳）
- 詳細ドリルダウン（evidence/score）
- 集計（FW/Deploy/IaC 分布）
- 逸脱検出（任意ルール）
- 再スキャン（手動/日次）
- **Contributors 可視化**（各リポジトリの貢献者をアバターで表示）
- **同期機能**（新規・更新されたリポジトリのみ効率的にスキャン）

## メンバー管理
- 組織メンバー一覧の表示
- メンバーのロール確認（Admin/Member）
- メンバーのアクティビティ可視化（Last Active、Repository Count、Total Contributions）
- メンバー情報の同期
- チーム所属情報の表示（複数チーム対応）

## アクティビティサマリー（Daily & Weekly）
- **自動生成**: Vercel Cron Jobs による定期実行
  - Daily: 月〜金 23:00 UTC (火〜土 8:00 JST)
  - Weekly: 日 23:00 UTC (月 8:00 JST)
- **配信チャネル**: Email (Resend) + Microsoft Teams (Power Automate webhook)
- **AI要約**: Azure OpenAI による Highlights, Members, Repositories, Topics の生成
- **データソース**: GitHub API (commits, PRs, issues, contributors)
- **保存**: `activity_summaries` テーブルに Markdown 形式で保存
- **UI**: `/activity` ページで過去のサマリー閲覧可能

---

# 2) 権限とデータ取得（Better Auth 版）

- **ログイン**: Better Auth の GitHub OAuth プロバイダを利用。
- **スコープ**: チーム判定に **`read:org`** が必須。**リポ内ファイルを読む**ために MVP では **`repo`** を追加。

  - 将来は **GitHub App** 化（org へインストール、read-only）を推奨。

- **チェック**（サインイン時）

  1. `/user/memberships/orgs/{org}` → `active` か
  2. `/orgs/{org}/teams/{team_slug}/memberships/{username}` → `active|maintainer` か
     これを満たさない場合は **拒否**。

---

# 3) 環境変数

```bash
# Better Auth
BETTER_AUTH_SECRET=replace_me_long_random
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth (Better Authのプロバイダ用)
GITHUB_CLIENT_ID=iv_...
GITHUB_CLIENT_SECRET=...

# Policy
ALLOWED_GH_ORG=my-org
ALLOWED_GH_TEAM_SLUG=core-devs  # 空文字列の場合は組織メンバーシップのみチェック

# Scanner
MEMBERSHIP_CACHE_TTL_SECONDS=600
SESSION_TTL_MINUTES=120

# Database (Neon)
DATABASE_URL=postgresql://<user>:<pass>@<host>/<db>?sslmode=require

# Upstash QStash (バックグラウンドジョブ処理)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

# Resend (メール配信)
RESEND_API_KEY=re_your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Vercel Cron
CRON_SECRET=your-secure-random-string

# GitHub Bot Token (Daily/Weekly Summary用)
GITHUB_BOT_TOKEN=ghp_your-github-personal-access-token

# Azure OpenAI (AI要約生成)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Microsoft Teams Webhook
TEAMS_WEBHOOK_URL=your-teams-webhook-url
TEAMS_MENTION_USERS=user1@company.com,user2@company.com

# Activity Summary Recipients (カンマ区切り)
ACTIVITY_SUMMARY_RECIPIENTS=email1@example.com,email2@example.com
```

---

# 4) DB スキーマ（**Drizzle**）

`/drizzle/schema.ts`

```ts
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  real,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const repoInventory = pgTable("repo_inventory", {
  id: varchar("id", { length: 32 }).primaryKey(), // cuid/cuid2 を発番側で
  org: text("org").notNull(),
  repoId: integer("repo_id").notNull(),
  repoName: text("repo_name").notNull(),
  defaultBranch: text("default_branch").notNull(),
  visibility: text("visibility").notNull(), // public/private/internal
  url: text("url").notNull(),

  primaryLanguage: text("primary_language"),
  frameworks: jsonb("frameworks").$type<string[]>().default([]),
  buildTools: jsonb("build_tools").$type<string[]>().default([]),
  packageManagers: jsonb("package_managers").$type<string[]>().default([]),
  container: jsonb("container").$type<string[]>().default([]),
  ciCd: jsonb("ci_cd").$type<string[]>().default([]),
  deployTargets: jsonb("deploy_targets").$type<string[]>().default([]),
  infraAsCode: jsonb("infra_as_code").$type<string[]>().default([]),
  databases: jsonb("databases").$type<string[]>().default([]),
  messaging: jsonb("messaging").$type<string[]>().default([]),
  testing: jsonb("testing").$type<string[]>().default([]),
  lintFormat: jsonb("lint_format").$type<string[]>().default([]),

  // Contributors information
  contributors: jsonb("contributors").$type<Array<{
    login: string;
    avatarUrl: string;
    profileUrl: string;
    contributions: number;
  }>>(),
  contributorsCount: integer("contributors_count").default(0),
  contributorsUpdatedAt: timestamp("contributors_updated_at"),

  lastScannedAt: timestamp("last_scanned_at"),
  detectionScore: real("detection_score"),
  evidence: jsonb("evidence").$type<Record<string, any>>().default({}),
  missingSignals: jsonb("missing_signals").$type<string[]>().default([]),

  policyStatus: text("policy_status"), // compliant / drift / unknown
  policyViolations: jsonb("policy_violations").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orgMembers = pgTable("org_members", {
  id: varchar("id", { length: 32 }).primaryKey(),
  org: text("org").notNull(),
  username: text("username").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url").notNull(),
  profileUrl: text("profile_url").notNull(),
  role: text("role").notNull(), // "admin" | "member"

  // Statistics (cached)
  repositoryCount: integer("repository_count").default(0),
  totalContributions: integer("total_contributions").default(0),
  lastActiveAt: timestamp("last_active_at"),

  lastSyncedAt: timestamp("last_synced_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: varchar("id", { length: 32 }).primaryKey(),
  org: text("org").notNull(),
  teamId: integer("team_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  privacy: text("privacy").notNull(), // "secret" | "closed"

  lastSyncedAt: timestamp("last_synced_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id", { length: 32 }).primaryKey(),
  teamId: varchar("team_id", { length: 32 }).notNull().references(() => teams.id, { onDelete: "cascade" }),
  memberId: varchar("member_id", { length: 32 }).notNull().references(() => orgMembers.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "maintainer" | "member"

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activitySummaries = pgTable("activity_summaries", {
  id: varchar("id", { length: 32 }).primaryKey(),
  org: text("org").notNull(),
  summaryDate: timestamp("summary_date").notNull(), // 対象日（前日 or 週の最終日）
  markdown: text("markdown").notNull(), // Markdown形式のサマリー
  sentAt: timestamp("sent_at"), // 配信日時（NULL = 未配信）
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 複合ユニークインデックス
import { uniqueIndex } from "drizzle-orm/pg-core";

export const repoInventoryUniqueIdx = uniqueIndex("repo_org_id_unique").on(
  repoInventory.org,
  repoInventory.repoId
);

export const activitySummariesUniqueIdx = uniqueIndex("activity_org_date_unique").on(
  activitySummaries.org,
  activitySummaries.summaryDate
);
```

`/drizzle/client.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
```

---

# 5) ディレクトリ構成

```
app/
  layout.tsx
  page.tsx                         # Public landing (Sign in)
  app/page.tsx                     # Protected: Inventory table
  repo/[name]/page.tsx             # Repo detail
  insights/page.tsx                # Aggregations
  members/page.tsx                 # Members management
  activity/page.tsx                # Activity summaries list
  activity/[date]/page.tsx         # Activity summary detail
  api/auth/[...all]/route.ts       # Better Auth handler (API Route)
  api/inventory/route.ts           # GET inventory (filter/pagination)
  api/inventory/scan/route.ts      # POST: bulk scan (QStash enqueue)
  api/inventory/scan-new/route.ts  # POST: sync (scan new/updated repos)
  api/queue/scan-repo/route.ts     # POST: QStash worker (signature verified)
  api/repo/[id]/scan/route.ts      # POST: single scan
  api/members/route.ts             # GET members list
  api/members/sync/route.ts        # POST: sync members & teams
  api/cron/daily-summary/route.ts  # Vercel Cron: daily summary
  api/cron/weekly-summary/route.ts # Vercel Cron: weekly summary
  api/activity/summaries/route.ts  # GET: list of summaries
  api/activity/summaries/[date]/route.ts # GET: specific summary
lib/
  auth.ts                       # Better Auth init + callbacks
  github.ts                     # Octokit helpers (list repos / read files)
  scan.ts                       # Detector pipeline
  qstash.ts                     # QStash client
  activity-summary.ts           # Daily/weekly summary generator
  ai-summary.ts                 # Azure OpenAI summary enhancement
  email.ts                      # Resend email integration
  teams.ts                      # Microsoft Teams webhook integration
  db/ (schema.ts index.ts)
  detectors/ (node.ts nextjs.ts docker.ts etc.)
  middleware/auth.ts            # Authentication middleware
components/
  ui/ (shadcn)
  scan-all-button.tsx           # Client component for bulk scan
  scan-new-button.tsx           # Client component for sync (new/updated repos)
  sync-members-button.tsx       # Client component for members sync
  rescan-button.tsx             # Client component for single repo rescan
  (other components)
styles/
  globals.css (Tailwind v4)
```

---

# 6) UI（**shadcn/ui + Tailwind v4**）

- **/app**: DataTable（列：Repo / Lang / Frameworks / CI / Deploy / Container / IaC / DB / LastScan / Score / Policy）

  - 列フィルタ（Badge トグル）・フリーテキスト検索
  - 再スキャンボタン（選択行 or 全件）

- **/repo/[name]**: タイル + **Evidence Drawer**（ファイルパスと抜粋）
- **/insights**: Recharts で言語分布 / FW 分布 / Deploy 先分布など

_注: Tailwind v4 は `@tailwindcss/cli` ベース。shadcn は v1（App Router 対応）で導入。_

---

# 7) 認証（**Better Auth**）

- GitHub プロバイダで **`read:org` + `repo`** を要求（MVP）。
- サインイン時に **org** を検証（Octokit）。**team** は任意（空文字列の場合はスキップ）。
- セッションには `githubToken`, `org`, `team` と **lastVerifiedAt** を保存。
- **Middleware** または **Server Action** 前処理で TTL 検証（`MEMBERSHIP_CACHE_TTL_SECONDS` 内は再照会しない）。

**Better Auth 実装詳細（v1.x）**

```ts
// lib/auth.ts
import { Octokit } from "@octokit/rest";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["read:org", "repo"], // MVP: repo スコープ必須
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider === "github") {
        const token = account.access_token;
        const username = user.name || account.providerAccountId;

        if (!token || !username) {
          throw new Error("Missing GitHub token or username");
        }

        try {
          await verifyMembership(
            token,
            process.env.ALLOWED_GH_ORG!,
            process.env.ALLOWED_GH_TEAM_SLUG!,
            username
          );

          // Store additional session data
          return {
            ...user,
            githubToken: token,
            org: process.env.ALLOWED_GH_ORG,
            team: process.env.ALLOWED_GH_TEAM_SLUG,
            lastVerifiedAt: Date.now(),
          };
        } catch (err) {
          console.error("Membership verification failed:", err);
          throw new Error(
            "Not authorized: must be a member of the organization"
          );
        }
      }
      return user;
    },
  },
});

async function verifyMembership(
  token: string,
  org: string,
  teamSlug: string,
  username: string
): Promise<void> {
  const octokit = new Octokit({ auth: token });

  // 1) Check org membership
  try {
    const { data: orgMembership } =
      await octokit.rest.orgs.getMembershipForUser({
        org,
        username,
      });
    if (orgMembership.state !== "active") {
      throw new Error("Not an active org member");
    }
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`User ${username} is not a member of ${org}`);
    }
    throw error;
  }

  // 2) Skip team membership check if teamSlug is empty
  if (!teamSlug || teamSlug.trim() === "") {
    return; // Only org membership required
  }

  // 3) Check team membership (only if teamSlug is specified)
  try {
    const { data: teamMembership } =
      await octokit.rest.teams.getMembershipForUserInOrg({
        org,
        team_slug: teamSlug,
        username,
      });
    if (!["active", "maintainer"].includes(teamMembership.state)) {
      throw new Error("Not an active team member");
    }
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`User ${username} is not a member of team ${teamSlug}`);
    }
    throw error;
  }
}
```

---

# 8) GitHub 取得ヘルパ（**Octokit**）

`/lib/github.ts`

```ts
import { Octokit } from "@octokit/rest";

export function makeOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function listTeamRepos(
  octokit: Octokit,
  org: string,
  teamSlug: string
) {
  const repos = await octokit.paginate(octokit.rest.teams.listReposInOrg, {
    org,
    team_slug: teamSlug,
    per_page: 100,
  });
  return repos.map((r) => ({
    repoId: r.id,
    name: r.name,
    url: r.html_url,
    defaultBranch: r.default_branch!,
    visibility: r.visibility!,
  }));
}

export async function getRepoTree(
  o: Octokit,
  owner: string,
  repo: string,
  branch: string
) {
  const { data: sha } = await o.rest.repos.getBranch({ owner, repo, branch });
  const { data: tree } = await o.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha.commit.sha,
    recursive: "1" as any,
  });
  return tree.tree; // [{ path, type, sha }]
}

export async function getText(
  o: Octokit,
  owner: string,
  repo: string,
  path: string
) {
  const x = await o.rest.repos.getContent({ owner, repo, path });
  if (!Array.isArray(x.data) && "content" in x.data) {
    return Buffer.from(x.data.content!, "base64").toString("utf8");
  }
  return null;
}
```

---

# 9) スキャナ（**Server Action / API Route 両用**）

`/lib/scan.ts`（骨子）

```ts
import type { Octokit } from "@octokit/rest";
import { db } from "@/lib/drizzle/client";
import { repoInventory } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

type DetectorCtx = {
  tree: { path?: string; type?: string }[];
  read: (p: string) => Promise<string | null>;
  current: any; // 既存在庫
};

type DetectorResult = { patch?: Partial<any>; proofs?: any[]; score?: number };

export async function scanOneRepo(
  o: Octokit,
  owner: string,
  repo: string,
  meta: any
) {
  const tree = await getRepoTree(o, owner, repo, meta.defaultBranch);
  const read = (p: string) => getText(o, owner, repo, p);

  let inv = initInventory(meta); // 既存DBを読み込み→差分更新でもOK
  const detectors = [
    detectNode,
    detectPython,
    detectNextJs,
    detectDocker,
    detectGHAction,
    detectVercel /*…*/,
  ];

  const proofs: Record<string, any[]> = {};
  const scores: number[] = [];
  for (const d of detectors) {
    const r: DetectorResult = await d({ tree, read, current: inv });
    if (r.patch) inv = { ...inv, ...mergeArrays(inv, r.patch) };
    if (r.proofs?.length) proofs[d.name || "anon"] = r.proofs;
    if (typeof r.score === "number") scores.push(r.score);
  }
  inv.detectionScore = average(scores);
  inv.evidence = proofs;
  inv.lastScannedAt = new Date();

  await db
    .insert(repoInventory)
    .values(inv)
    .onConflictDoUpdate({
      target: [repoInventory.org, repoInventory.repoId],
      set: inv,
    });

  return inv;
}
```

_各 detector は `package.json`, `pyproject.toml`, `.github/workflows/_.yml`, `Dockerfile`, `vercel.json`, `_.tf` などを見て patch/score/proofs を返却。_

---

# 10) API（**Next.js API Routes**）と **Server Actions**

- **GET `/api/inventory`**: ページング/フィルタ（クエリ: `fw=Next.js&deploy=Vercel` など）
- **POST `/api/inventory/scan`**: 全件 or 選択リポ再スキャン（**Upstash QStash** でバックグラウンドキューイング）
- **POST `/api/queue/scan-repo`**: QStash からコールされる単一リポスキャンハンドラー（署名検証済み）
- **POST `/api/repo/[id]/scan`**: 単体再スキャン

**バックグラウンドジョブ処理（環境別）**:

**開発環境** (`NODE_ENV=development`):
- `/api/inventory/scan` は直接スキャンを実行（QStash不使用）
- バッチ並列処理：10リポジトリずつ並列スキャン
- GitHub APIレート制限を考慮した安全な並列度
- QStash無料枠を節約しつつ高速処理（順次処理の約1/10の時間）
- ngrok等のトンネル不要

**本番環境** (`NODE_ENV=production`, Upstash QStash):
- `/api/inventory/scan` は全リポジトリを QStash キューに投入し即座にレスポンス
- QStash が各リポジトリを順次 `/api/queue/scan-repo` エンドポイントに送信
- Vercel の実行時間制限（Pro: 15秒、Enterprise: 900秒）を回避
- リトライ機能・Dead Letter Queue を QStash が自動処理

**認可**:

- すべての API/Action で **Better Auth のセッション**を検証
- **org/team** がセッションの値と一致するか再確認
- トークンの **lastVerifiedAt** が TTL 超過なら **org/team 再検証**
- QStash エンドポイントは **署名検証**（`verifySignatureAppRouter`）で保護

---

# 11) UI 実装要点

- **DataTable**: shadcn の Table + コマンドバー（検索）/ Badge フィルタ / 列の show/hide
- **Evidence Drawer**: ファイルパス → 数行抜粋（**本文保存はしない**方針。必要最小の抜粋のみ）
- **Charts**: Recharts（言語・FW・Deploy など）
- **Export**: CSV/JSON（現在のフィルタを反映）

---

# 12) ポリシー（任意）

- 例）「Node は pnpm + ESLint + Prettier 必須」「IaC は Terraform 推奨」
- `rules.ts` に Rule 配列を定義し、在庫に対して `when(inv)` を評価 → `policyStatus` / `policyViolations` を更新。

---

# 13) 受け入れ基準（このスタック）

- ✅ Better Auth + GitHub OAuth（`read:org`+`repo`）でログインし、**org/team 非所属は拒否**
- ✅ Neon(Postgres) + Drizzle に **RepoInventory** が保存・更新
- ✅ 一覧/詳細/集計が動作し、**evidence（パス＋抜粋）**と **score** を表示
- ✅ 再スキャン（単体/一括）可能、**TTL 再検証**で membership を適切に再確認
- ✅ Tailwind v4 + shadcn/ui でモダン UI
- ✅ pnpm でスクリプト実行・Vercel へデプロイ可能

---

# 14) エラーハンドリング・レート制限対策

**GitHub API レート制限**

- **認証済み**: 5000 req/hour
- **検索 API**: 30 req/min
- **戦略**: レート制限ヘッダーを確認し、`X-RateLimit-Remaining` が低い場合は遅延またはキュー待機

```ts
// lib/github.ts に追加
export async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rest.rateLimit.get();
  return {
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
    limit: data.rate.limit,
  };
}

// スキャン前にチェック
const rate = await checkRateLimit(octokit);
if (rate.remaining < 100) {
  throw new Error(`Rate limit low: ${rate.remaining} requests remaining`);
}
```

**リトライ戦略**

```ts
// lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;
      if (err.status === 403 || err.status === 429) {
        // Rate limit or abuse detection
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
        continue;
      }
      throw err; // その他のエラーは即座に throw
    }
  }
  throw new Error("Retry failed");
}
```

**セキュリティ考慮事項**

- トークンは **セッションストレージのみ**（DB に保存しない場合は考慮）
- `repo` スコープは **読み取り専用**として使用（書き込み操作は一切行わない）
- 環境変数は `.env.local` で管理、**Git にコミットしない**
- CSP ヘッダーで XSS 対策
- CSRF 対策は Better Auth が自動処理

---

# 15) pnpm スクリプト（例）

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "scan:all": "tsx scripts/scan-all.ts"
  }
}
```

---

# 16) 初期実装チェックリスト（AI エージェント向け）

## Phase 1: 基盤セットアップ

1. ✅ **環境構築**

   - Next.js 15 + React 19 + TypeScript (App Router)
   - pnpm でパッケージ管理
   - Tailwind v4 + shadcn/ui (new-york style)

2. ✅ **認証基盤**

   - Better Auth v1.x インストール・設定
   - GitHub OAuth プロバイダ（`read:org` + `repo` スコープ）
   - org/team メンバーシップ検証ロジック
   - セッション管理・TTL チェック

3. ✅ **データベース**
   - Drizzle ORM + PostgreSQL (Neon)
   - スキーマ定義（repo_inventory テーブル + 複合ユニークインデックス）
   - マイグレーション実行

## Phase 2: コア機能

4. ✅ **GitHub 連携**

   - Octokit ヘルパー関数（list repos / tree / file content）
   - レート制限チェック・リトライ機能
   - エラーハンドリング

5. ✅ **スキャナー実装**

   - 基本 Detector 6 種類：
     - Node.js (package.json)
     - Next.js (next.config.js)
     - Docker (Dockerfile)
     - GitHub Actions (.github/workflows)
     - Vercel (vercel.json)
     - Terraform (\*.tf)
   - Evidence 収集・スコアリング

6. ✅ **API 実装**
   - `GET /api/inventory` (一覧・フィルタ・ページング)
   - `POST /api/inventory/scan` (一括スキャン)
   - `POST /api/repo/[id]/scan` (単体スキャン)
   - 権限・TTL 検証ミドルウェア

## Phase 3: UI/UX

7. ✅ **画面実装**

   - `/app` - ランディングページ（Sign in）
   - `/app/app` - メインテーブル（在庫一覧）
   - `/app/repo/[name]` - 詳細ページ（Evidence Drawer）
   - `/app/insights` - 集計・チャート

8. ✅ **コンポーネント**
   - InventoryTable (shadcn Table + フィルタ)
   - EvidenceDrawer (ファイルパス・抜粋表示)
   - Charts (Recharts: 言語/FW/Deploy 分布)

## Phase 4: デプロイ・運用

9. ✅ **デプロイ準備**

   - 環境変数設定（.env.example 作成）
   - Vercel 設定ファイル
   - README（セットアップ手順）

10. ✅ **ドキュメント**
    - OAuth App 作成手順
    - トラブルシューティング
    - アーキテクチャ図（任意）

## Phase 5-8: 追加機能

11. ✅ **メンバー管理** (Phase 5)
    - 組織メンバー・チーム情報の同期
    - 統計情報（Repository Count, Total Contributions, Last Active）
    - UI: `/members` ページ

12. ✅ **Contributors 可視化** (Phase 6)
    - リポジトリ貢献者のアバター表示
    - 重ね表示（最大7名 + "+N"）
    - ホバーでツールチップ

13. ✅ **Activity Summary** (Phase 7-8)
    - 日次・週次の GitHub アクティビティ集計
    - AI要約生成 (Azure OpenAI)
    - Email配信 (Resend) + Teams配信 (Power Automate)
    - Vercel Cron Jobs による自動実行
    - UI: `/activity` ページ

---

# 17) Activity Summary 詳細仕様

## 概要

組織の GitHub アクティビティ（commits, PRs, issues）を自動収集し、AI要約付きの Markdown サマリーを生成。Email と Microsoft Teams に配信する。

## アーキテクチャ

### データ収集
- **GitHub API**: Octokit を使用
- **対象データ**:
  - Commits: 全リポジトリから時間範囲でフィルタ
  - Pull Requests: 組織全体から検索API経由
  - Issues: 組織全体から検索API経由
- **時間範囲**:
  - Daily: 前日00:00〜23:59 (JST)
  - Weekly: 月曜00:00〜日曜23:59 (JST)

### サマリー生成
1. **ベースMarkdown生成** (`lib/activity-summary.ts`)
   - 📊 Overview: 総計（commits, PRs, issues, active members）
   - 🏆 Top Contributors: アクティビティ上位者（値が0のものは非表示）

2. **AI要約** (`lib/ai-summary.ts`)
   - Azure OpenAI (gpt-4o) を使用
   - 4つのセクションを生成:
     - 🎯 ハイライト: 重要な成果・マイルストーン
     - 👥 メンバー: 各メンバーの貢献内容
     - 📦 リポジトリ: 活発なリポジトリの詳細
     - 💡 トピック: テーマ別分析
   - 日本語プロンプトで簡潔な箇条書き生成

3. **データベース保存**
   - `activity_summaries` テーブルに Markdown 保存
   - `org` + `summaryDate` でユニーク制約

### 配信

#### Email (Resend)
- **From**: `RESEND_FROM_EMAIL`
- **To**: `ACTIVITY_SUMMARY_RECIPIENTS` (カンマ区切り)
- **Subject**: "GitHub Daily Summary - YYYY-MM-DD" / "GitHub Weekly Summary - MMM DD - MMM DD, YYYY"
- **Body**: Markdown → HTML 変換 (marked)

#### Microsoft Teams (Power Automate)
- **Webhook**: `TEAMS_WEBHOOK_URL`
- **Format**: Adaptive Cards v1.4
- **Width**: Full (`msteams.width = "Full"`)
- **Mentions**: `TEAMS_MENTION_USERS` (カンマ区切りUPN)
  - `<at>user0</at>` タグで表示
  - `entities` 配列でマッピング
- **Content**:
  - Overview を Facts 形式で表示
  - Top Contributors をテキストブロックで表示
  - 詳細は Activity ページへのリンク

#### 並列配信
```ts
await Promise.all([
  sendDailySummary(...),  // Resend
  sendDailySummaryToTeams(...)  // Teams
]);
```

### スケジュール実行 (Vercel Cron)

**設定** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 23 * * 1-5"  // Mon-Fri 23:00 UTC = Tue-Sat 8:00 JST
    },
    {
      "path": "/api/cron/weekly-summary",
      "schedule": "0 23 * * 0"  // Sun 23:00 UTC = Mon 8:00 JST
    }
  ]
}
```

**認証**: `CRON_SECRET` による Bearer token チェック

**実行フロー**:
1. Cron が API エンドポイントを呼び出し
2. 認証チェック (`CRON_SECRET`)
3. GitHub Bot Token で Octokit 初期化
4. アクティビティデータ収集
5. AI要約生成
6. DB保存
7. Email + Teams 並列配信
8. `sentAt` タイムスタンプ更新

## 環境変数

```bash
# GitHub Bot Token (Activity Summary用)
GITHUB_BOT_TOKEN=ghp_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@example.com
ACTIVITY_SUMMARY_RECIPIENTS=user1@example.com,user2@example.com

# Microsoft Teams
TEAMS_WEBHOOK_URL=https://...
TEAMS_MENTION_USERS=user1@company.com,user2@company.com

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Vercel Cron
CRON_SECRET=...  # openssl rand -base64 32
```

## UI

### `/activity` - サマリー一覧
- 過去のサマリー一覧（日付でソート）
- 統計情報（Total Summaries, Emails Sent, Last Sent）
- 日付クリックで詳細ページへ

### `/activity/[date]` - サマリー詳細
- Markdown レンダリング（GitHub風スタイル）
- メタデータ（組織名、日付、配信日時）

## 制限事項

- **Vercel Cron 実行時間**: Hobby 10秒, Pro 60秒
- **GitHub API Rate Limit**: 5000 req/hour (認証済み)
- **Resend 無料枠**: 100 emails/day, 3000/month
- **Azure OpenAI**: トークン数・レート制限に注意

---

## 実装優先順位

**MVP（最小限）**: Phase 1-4
**拡張版**: Phase 1-6
**完全版**: Phase 1-8 (全機能)

---

## プロジェクト完成度

✅ **Phase 1-8 全て完了**

主要機能:
- リポジトリスキャン・技術スタック検出
- メンバー・チーム管理
- Contributors 可視化
- Daily/Weekly Activity Summary (AI要約付き)
- Email + Teams 配信
