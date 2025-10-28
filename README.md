# gh-arch-viz

**GitHub Architecture Visualizer** - Automatically detect and visualize your team's repository technology stacks.

## 📋 Overview

`gh-arch-viz` scans your GitHub organization's repositories and automatically detects:

- **Frameworks** (Next.js, React, etc.)
- **Build Tools** (Vite, Webpack, Turbopack, etc.)
- **Package Managers** (pnpm, npm, yarn)
- **CI/CD** (GitHub Actions, etc.)
- **Deployment Targets** (Vercel, etc.)
- **Container Technologies** (Docker, Docker Compose)
- **Infrastructure as Code** (Terraform, etc.)
- **Databases, Testing Frameworks, Linters**, and more

## ✨ Features

- **🔒 Org/Team Restricted Access** - Only members of your configured GitHub org and team can sign in
- **🤖 Automatic Detection** - Scans repository files to detect technologies with evidence-based scoring
- **🔍 Searchable Inventory** - Browse and filter all repositories by technology stack
- **📝 Evidence Tracking** - View exact files and snippets used for detection
- **📊 Visual Insights** - Charts and graphs showing technology distribution
- **👥 Member Management** - View organization members with roles, avatars, and activity
- **👤 Contributors Display** - View repository contributors with avatars and contribution counts
- **📬 Activity Summaries** - Automated daily/weekly digests of GitHub activity (commits, PRs, issues) sent via email (Resend) and Microsoft Teams every weekday morning at 8 AM JST
- **⚡ Fast Scanning** - Batch parallel processing (dev) or QStash background jobs (prod)
- **🕒 Smart Sorting** - Repositories sorted by last push date with "X days ago" display
- **🎨 Modern UI** - Built with shadcn/ui, Tailwind CSS v4, and GitHub language colors
- **🔄 Environment-aware** - Automatic dev/prod mode switching for optimal performance

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, shadcn/ui, Tailwind CSS v4
- **Backend**: Next.js Server Actions + API Routes
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Auth**: Better Auth (GitHub OAuth)
- **Visualization**: Recharts
- **Email & Teams**: Resend, Microsoft Teams (Power Automate)
- **Package Manager**: pnpm

## 📦 Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (recommend [Neon](https://neon.tech))
- GitHub OAuth App credentials
- Upstash QStash account (for repository scanning background jobs)
- Resend account (for email delivery)
- Microsoft Teams channel with Power Automate webhook (for Teams notifications)
- Vercel account (for cron jobs - included with deployment)

## 🔧 Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd gh-arch-viz
pnpm install
```

### 2. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: gh-arch-viz
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

### 3. Set up Neon PostgreSQL

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string (starts with `postgresql://`)

### 4. Set up Upstash QStash

1. Create a free account at [Upstash Console](https://console.upstash.com)
2. Navigate to the **QStash** tab
3. Copy the following credentials:
   - **QSTASH_TOKEN**
   - **QSTASH_CURRENT_SIGNING_KEY**
   - **QSTASH_NEXT_SIGNING_KEY**

**Note**: QStash is used for background job processing to scan repositories without hitting Vercel's execution time limits. The free tier includes 500 requests/day.

### 5. Set up Resend for Email Delivery

1. Create a free account at [Resend](https://resend.com)
2. Navigate to **API Keys** and create a new API key
3. Copy the API key (starts with `re_`)
4. Set up a verified domain:
   - Go to **Domains** → **Add Domain**
   - Add your domain and verify DNS records (SPF, DKIM, DMARC)
   - Or use Resend's test domain (`onboarding@resend.dev`) for development

**Note**: Resend free tier includes 100 emails/day and 3,000 emails/month.

### 6. Set up Microsoft Teams Webhook (Optional)

1. Create a Power Automate workflow:
   - Go to [Power Automate](https://make.powerautomate.com/)
   - Create a new **Instant cloud flow** with **When a HTTP request is received** trigger
   - Add action: **Post adaptive card in a chat or channel** (Microsoft Teams)
   - Configure to post to your desired Teams channel
   - Get the HTTP POST URL from the trigger
2. Copy the webhook URL from Power Automate

**Note**: This enables posting activity summaries to Microsoft Teams alongside email notifications.

### 7. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="<generate-a-long-random-string>"
BETTER_AUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID="<your-github-oauth-client-id>"
GITHUB_CLIENT_SECRET="<your-github-oauth-client-secret>"

# GitHub Organization & Team
ALLOWED_GH_ORG="<your-org-name>"
ALLOWED_GH_TEAM_SLUG="<your-team-slug>"  # Leave empty "" to allow all org members

# Upstash QStash
QSTASH_TOKEN="<your-qstash-token>"
QSTASH_CURRENT_SIGNING_KEY="<your-current-signing-key>"
QSTASH_NEXT_SIGNING_KEY="<your-next-signing-key>"

# Resend (Email Delivery)
RESEND_API_KEY="<your-resend-api-key>"
RESEND_FROM_EMAIL="noreply@your-domain.com"  # Your verified sender email

# Daily Activity Summary Recipients (Optional)
ACTIVITY_SUMMARY_RECIPIENTS="email1@example.com,email2@example.com"  # Comma-separated

# Microsoft Teams Webhook (Optional)
TEAMS_WEBHOOK_URL="<your-power-automate-webhook-url>"
TEAMS_MENTION_USERS="user1@company.com,user2@company.com"  # UPNs to mention

# Vercel Cron Secret (generate a random string)
CRON_SECRET="<generate-a-long-random-string>"
```

**Notes**:
- To find your team slug, go to your GitHub org → Teams → click on your team. The URL will be `github.com/orgs/YOUR_ORG/teams/YOUR_TEAM_SLUG`.
- Leave `ALLOWED_GH_TEAM_SLUG=""` (empty string) to allow all organization members to access the app.
- For `RESEND_FROM_EMAIL`, use a verified domain email or `onboarding@resend.dev` for testing
- `ACTIVITY_SUMMARY_RECIPIENTS` should be a comma-separated list of email addresses to receive daily summaries
- `TEAMS_WEBHOOK_URL` is the Power Automate webhook URL for posting to Teams (optional)
- `TEAMS_MENTION_USERS` should be comma-separated UPNs (user@domain.com) to mention in Teams posts (optional)
- `CRON_SECRET` is used to authenticate Vercel Cron requests - generate with `openssl rand -base64 32`

### 8. Set up Vercel Cron Jobs (Optional)

If you want to enable automated daily GitHub activity summaries:

1. Create `vercel.json` in the project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 23 * * 1-5"
    },
    {
      "path": "/api/cron/weekly-summary",
      "schedule": "0 23 * * 0"
    }
  ]
}
```

2. Cron expressions:
   - Daily: `0 23 * * 1-5` runs Monday-Friday at 11 PM UTC (= Tuesday-Saturday 8 AM JST)
   - Weekly: `0 23 * * 0` runs Sunday at 11 PM UTC (= Monday 8 AM JST)

3. Deploy to Vercel - cron jobs are automatically configured

**Note**: Vercel Cron Jobs are available on all plans including Hobby (free). They run with a 10-second execution limit on Hobby plans.

### 9. Run database migrations

```bash
pnpm db:push
```

### 10. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### First Time Setup

1. **Sign in with GitHub**

   - Click "Sign in with GitHub" on the landing page
   - Authorize the app with `read:org` and `repo` scopes
   - Only members of your configured org/team will be allowed access

2. **Scan Repositories**

   - Click "Scan All Repositories" on the inventory page
   - The app will enqueue all repositories for background scanning via QStash
   - Refresh the page after a few minutes to see scan results

3. **Browse Inventory**

   - View the table of all scanned repositories
   - Click on a repository name to see detailed detection results
   - View "Evidence" to see which files were used for detection

4. **View Members**

   - Click "View Members" to see organization members
   - Click "Sync Members" to fetch latest member data from GitHub
   - View member roles (Admin/Member), avatars, and activity

5. **View Insights**
   - Click "View Insights" to see charts and graphs
   - Analyze technology distribution across your organization

6. **View Activity Summaries**
   - Click "Activity" to see daily and weekly GitHub activity summaries
   - Automatically generated every weekday at 8 AM JST
   - Delivered via email and Microsoft Teams (if configured)
   - View past summaries with detailed breakdowns by repository and member

### Rescanning

- **Single Repository**: Navigate to repo detail page and click "Rescan"
- **All Repositories**: On the inventory page, click "Scan All Repositories"

## 🔒 Security & Permissions

### Required GitHub Scopes

- `read:org` - To verify organization and team membership
- `repo` - To read repository files for technology detection

### Access Control

- Only users who are active members of both:
  1. The configured GitHub organization (`ALLOWED_GH_ORG`)
  2. The configured team within that org (`ALLOWED_GH_TEAM_SLUG`)
- Membership is verified on each sign-in
- Session TTL can be configured via `SESSION_TTL_MINUTES`

### Recommendations

- **Production**: Consider implementing a GitHub App for better security
- **Tokens**: Access tokens are session-based
- **Rate Limits**: App respects GitHub API rate limits (5000 req/hour)

## 🚀 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm db:generate  # Generate Drizzle migrations
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio
```

### Development vs Production Behavior

**Development Mode** (`pnpm dev`, `NODE_ENV=development`):
- Repository scans run **directly** (no QStash)
- **Batch parallel processing**: 10 repositories at a time
- Faster than sequential, safer than full parallel
- No need for ngrok or tunnel services
- Saves QStash free tier quota (500 messages/day)

**Production Mode** (Vercel, `NODE_ENV=production`):
- Repository scans use **Upstash QStash** for background processing
- Each repository is queued individually
- No Vercel execution time limit issues
- Automatic retries and dead letter queue

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env`
4. Update `BETTER_AUTH_URL` and GitHub OAuth callback URL to your production domain
5. Deploy
6. Run `pnpm db:push` to sync database schema

### Environment Variables for Production

Make sure to set these in your hosting platform:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (use a strong random string)
- `BETTER_AUTH_URL` (your production URL)
- `NEXT_PUBLIC_APP_URL` (your production URL)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ALLOWED_GH_ORG`
- `ALLOWED_GH_TEAM_SLUG` (leave empty to allow all org members)
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ACTIVITY_SUMMARY_RECIPIENTS` (optional, for email summaries)
- `TEAMS_WEBHOOK_URL` (optional, for Teams notifications)
- `TEAMS_MENTION_USERS` (optional, for Teams mentions)
- `CRON_SECRET`

## 🐛 Troubleshooting

### "Not authorized: must be a member of the organization"

- Verify that your GitHub user is a member of the configured org and team
- Check that `ALLOWED_GH_ORG` and `ALLOWED_GH_TEAM_SLUG` are correct
- Ensure the team is not set to "Secret" visibility (must be "Visible")

### GitHub API Rate Limit

- Authenticated requests have a limit of 5000/hour
- The app includes retry logic with exponential backoff
- Development mode uses batch parallel processing (10 repos at a time) to avoid hitting rate limits
- Production mode uses QStash for distributed processing

### QStash Background Jobs Not Processing

- Verify that `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` are correctly set
- Ensure your `NEXT_PUBLIC_APP_URL` or `BETTER_AUTH_URL` is publicly accessible (QStash needs to call your `/api/queue/scan-repo` endpoint)
- Check QStash dashboard for failed jobs and error messages
- **Note**: In development mode (`pnpm dev`), QStash is **not used** - scans run directly to save quota

### Vercel Cron Jobs Not Running

- Verify that `vercel.json` exists in the project root with correct cron configuration
- Ensure `CRON_SECRET` environment variable is set in Vercel project settings
- Check Vercel Logs → Cron for execution history and errors
- Cron jobs only run in production deployments, not in development or preview
- Hobby plan cron jobs have a 10-second execution limit

## 🗺 Roadmap

- [x] **Background Jobs**: Upstash QStash integration for scalable scanning
- [x] **Organization-wide Scanning**: Support for scanning all org repos (not just team repos)
- [x] **Activity Summaries**: Automated daily/weekly GitHub activity digests
- [x] **Email Delivery**: Activity summaries sent via Resend
- [x] **Microsoft Teams Integration**: Post activity summaries to Teams channels via Power Automate webhooks
- [ ] **Policy Engine**: Define and enforce technology standards
- [ ] **Scheduled Scans**: Automatic daily/weekly rescans via QStash
- [ ] **GitHub App**: Replace OAuth with GitHub App for better security
- [ ] **Notifications**: Alert on policy violations
- [ ] **Export**: CSV/JSON export of inventory
- [ ] **More Detectors**: Python, Go, Rust, Kubernetes, AWS, GCP
- [ ] **Custom Rules**: User-defined detection patterns
- [ ] **Historical Tracking**: Track technology changes over time
- [ ] **Progress Tracking**: Real-time scan progress UI

## 📝 License

MIT

## 🙏 Credits

Built with:

- [Next.js](https://nextjs.org)
- [Better Auth](https://www.better-auth.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)
- [Octokit](https://github.com/octokit/octokit.js)
- [Resend](https://resend.com)

---

**Questions or issues?** Please open an issue on GitHub.
