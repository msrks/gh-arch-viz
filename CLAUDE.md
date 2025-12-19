# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - Runs Next.js with Turbopack for fast hot reloading
- **Production build**: `pnpm build` - Creates optimized production build with Turbopack
- **Start production**: `pnpm start` - Serves the production build
- **Linting**: `pnpm lint` - Runs ESLint to check code quality and TypeScript types
- **Database**: `pnpm db:push` - Push schema changes to database, `pnpm db:studio` - Open Drizzle Studio

## Project Architecture

This is a **Next.js 15** application using the **App Router** pattern. This is a **GitHub Architecture Visualizer** that scans organization repositories to detect technology stacks.

### Directory Structure

- `app/` - Next.js App Router pages and API routes
  - `page.tsx` - Landing page with GitHub OAuth sign-in
  - `app/page.tsx` - Protected main inventory table page
  - `repo/[name]/page.tsx` - Repository detail page with evidence
  - `insights/page.tsx` - Analytics and charts page
  - `members/page.tsx` - Organization members list
  - `activity/page.tsx` - Daily GitHub activity summaries list
  - `activity/[date]/page.tsx` - Specific date activity summary detail
  - `api/auth/[...all]/route.ts` - Better Auth handler
  - `api/inventory/scan/route.ts` - Bulk scan endpoint (enqueues to QStash)
  - `api/queue/scan-repo/route.ts` - QStash worker for background scanning
  - `api/repo/[id]/scan/route.ts` - Single repository scan
  - `api/cron/daily-summary/route.ts` - Vercel Cron scheduled daily activity summary generator
  - `api/cron/weekly-summary/route.ts` - Vercel Cron scheduled weekly activity summary generator
  - `api/activity/summaries/route.ts` - Get list of past summaries
  - `api/activity/summaries/[date]/route.ts` - Get specific date summary
- `lib/` - Core business logic and utilities
  - `auth.ts` - Better Auth configuration with GitHub OAuth
  - `github.ts` - Octokit helpers for GitHub API
  - `scan.ts` - Repository scanning pipeline
  - `qstash.ts` - Upstash QStash client for background jobs
  - `activity-summary.ts` - Daily/weekly GitHub activity summary generator
  - `email.ts` - Resend email integration for activity summaries
  - `teams.ts` - Microsoft Teams webhook integration for activity summaries
  - `infographic.ts` - Gemini 3 Pro Image infographic generator for activity summaries
  - `db/` - Drizzle ORM schema and client
  - `detectors/` - Technology detection modules (Node.js, Next.js, Docker, etc.)
  - `middleware/auth.ts` - Authentication middleware
- `components/` - React components
  - `ui/` - shadcn/ui components
  - `scan-all-button.tsx` - Client component for triggering scans

## Key Technologies

- **Next.js 15** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **shadcn/ui** component system (configured with "new-york" style)
- **Lucide React** for icons
- **Better Auth** for GitHub OAuth authentication
- **Drizzle ORM** + **PostgreSQL (Neon)** for database
- **Upstash QStash** for repository scanning background jobs
- **Vercel Cron Jobs** for scheduled daily/weekly summaries
- **Microsoft Teams** webhooks for activity summary notifications
- **Octokit** for GitHub API integration
- **Recharts** for data visualization
- **Resend** for email delivery
- **ESLint** with Next.js and TypeScript rules

## TypeScript Configuration

- Path alias `@/*` maps to project root for imports
- Strict mode enabled with Next.js plugin integration

## shadcn/ui Setup

The project is configured for shadcn/ui components with:
- Style: "new-york"
- CSS variables enabled
- Base color: neutral
- Icon library: Lucide React
- Component aliases configured for `@/components`, `@/lib/utils`, etc.

## Package Manager

This project uses **pnpm** as indicated by `pnpm-lock.yaml`. Always use `pnpm` commands for consistency.

## Core Features

### Authentication & Authorization
- GitHub OAuth via Better Auth with `read:org` and `repo` scopes
- Organization and team membership verification
- Session-based authentication with TTL checking
- If `ALLOWED_GH_TEAM_SLUG` is empty, all organization members are allowed

### Repository Scanning

**Development Mode** (`NODE_ENV=development`):
- Direct scanning with **batch parallel processing** (10 repos at a time)
- No QStash required - saves free tier quota
- Processes repositories ~10x faster than sequential
- Safe rate limit handling for GitHub API

**Production Mode** (`NODE_ENV=production`):
- Uses **Upstash QStash** for background job processing
- `/api/inventory/scan` enqueues all repositories to QStash
- `/api/queue/scan-repo` processes individual repositories with signature verification
- Avoids Vercel execution time limits

**Technology Detection**: Detects frameworks, build tools, CI/CD, deployment targets, containers, IaC, databases, etc.

### Activity Summaries (Daily & Weekly)

**Scheduled Execution**:
- Uses **Vercel Cron Jobs** (configured in `vercel.json`)
- **Daily**: Monday-Friday at 11 PM UTC (= Tuesday-Saturday 8 AM JST), cron: `0 23 * * 1-5`
- **Weekly**: Sunday at 11 PM UTC (= Monday 8 AM JST), cron: `0 23 * * 0`
- Protected by `CRON_SECRET` authentication

**Delivery Channels**:
- **Email**: Via Resend API to configured recipients
- **Microsoft Teams**: Via Power Automate webhook using Adaptive Cards with full width
- Both channels run in parallel with `Promise.all`

**Why Vercel Cron over QStash?**:
- Simpler setup (no additional service)
- Free on all Vercel plans
- Sufficient for lightweight scheduled tasks
- Direct integration with Vercel Logs

### Technology Detectors
Located in `lib/detectors/`:
- `node.ts` - Node.js, package managers (pnpm, npm, yarn)
- `nextjs.ts` - Next.js framework
- `docker.ts` - Docker and Docker Compose
- `github-actions.ts` - GitHub Actions workflows
- `vercel.ts` - Vercel deployment configuration
- `terraform.ts` - Terraform infrastructure as code

### Database Schema
- `repo_inventory` table stores scanned repository data
- Includes detected technologies, evidence (file paths + snippets), detection scores
- `org_members` table stores organization member information
- `teams` and `team_members` tables for team management
- `activity_summaries` table stores daily GitHub activity summaries (markdown format)
- Uses Drizzle ORM with PostgreSQL (Neon)

## Important Notes

- **Development vs Production**: The app automatically switches between direct scanning (dev) and QStash (prod) based on `NODE_ENV`
- **QStash Requirements**: For production only - ensure `NEXT_PUBLIC_APP_URL` or `BETTER_AUTH_URL` is publicly accessible
- **Local Development**: No tunnel needed - scans run directly with batch parallelism
- **Rate Limits**: GitHub API allows 5000 requests/hour for authenticated users
- **Batch Size**: Configurable in `/api/inventory/scan/route.ts` (default: 10 repos per batch)
- **Security**: All QStash endpoints use signature verification; Vercel Cron endpoints use `CRON_SECRET` authentication
- **Activity Summaries**: Daily (`0 23 * * 1-5` UTC) and Weekly (`0 23 * * 0` UTC) summaries via Vercel Cron Jobs, sent to both email and Microsoft Teams

## Performance Considerations

- **Sequential**: 168 repos × 3 sec = ~8.4 minutes
- **Batch (10 parallel)**: 17 batches × 3 sec = ~51 seconds (development mode)
- **QStash**: Distributed processing, no local timeout limits (production mode)

## Activity Summary Feature

### Overview
Automated GitHub activity digests sent via **email** and **Microsoft Teams** every weekday morning at 8 AM JST (Tuesday-Saturday for daily, Monday for weekly).

### Architecture
- **Scheduled Jobs**: Vercel Cron Jobs (configured in `vercel.json`)
- **Endpoints**:
  - `/api/cron/daily-summary` - Last 24 hours of activity
  - `/api/cron/weekly-summary` - Last 7 days of activity
- **Data Collection**: GitHub API calls to fetch commits, PRs, issues
- **Storage**: Markdown summaries stored in `activity_summaries` table
- **Delivery**: Parallel email (Resend) and Teams (Power Automate webhook) with `Promise.all`

### Data Sources
- Organization events via GitHub API
- Repository commits (filtered by rolling time windows)
- Pull requests (opened, merged, closed)
- Issues (opened, closed, commented)
- Contributor activity aggregated by member

### Summary Format
Markdown document with AI-enhanced sections:
1. **📊 Overview**: Total commits, PRs, issues, active members
2. **🏆 Top Contributors**: Ranked by activity volume (omits 0 values)
3. **🎯 Highlights**: AI-generated key insights
4. **👥 Members**: AI-generated member activity summary
5. **📦 Repositories**: AI-generated repository highlights
6. **💡 Topics**: AI-generated thematic summary

Weekly summaries show commit counts only (no individual logs to reduce length).

### Configuration

**Email (Resend)**:
- `RESEND_API_KEY` - Required for sending emails (from Resend console)
- `RESEND_FROM_EMAIL` - Verified sender email address (e.g., `noreply@your-domain.com`)
- `ACTIVITY_SUMMARY_RECIPIENTS` - Comma-separated list of recipient emails
- Resend free tier: 100 emails/day, 3,000 emails/month

**Microsoft Teams (Power Automate)**:
- `TEAMS_WEBHOOK_URL` - Power Automate webhook URL for posting to Teams channel
- `TEAMS_MENTION_USERS` - Comma-separated list of UPNs (user@domain.com) to mention in posts
- Uses Adaptive Cards v1.4 with full width (`msteams.width = "Full"`)
- Mentions appear as `<at>user0</at>` tags at the top of the card

**Vercel Cron**:
- `CRON_SECRET` - Random string for authenticating cron requests (generate with `openssl rand -base64 32`)
- `vercel.json` configuration:
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
- Cron expressions:
  - Daily: `0 23 * * 1-5` (Mon-Fri 11 PM UTC = Tue-Sat 8 AM JST)
  - Weekly: `0 23 * * 0` (Sun 11 PM UTC = Mon 8 AM JST)
- Execution limit: 10 seconds on Hobby plan, 60 seconds on Pro

**AI Enhancement (Azure OpenAI)**:
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Deployment name (e.g., gpt-4o)
- Generates contextual insights for Highlights, Members, Repositories, and Topics sections

**Infographic Generation (Gemini 3 Pro Image)**:
- `AI_GATEWAY_API_KEY` - Required for generating infographics with Gemini 3 Pro Image
- Infographics are generated automatically for daily and weekly summaries
- Images are embedded inline at the top of email summaries
- Uses the Vercel AI SDK with `google/gemini-3-pro-image` model
- Displays overview metrics, top contributors, and repository activity
- If not configured, infographic generation is skipped gracefully