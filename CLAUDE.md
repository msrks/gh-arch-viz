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
  - `api/activity/summaries/route.ts` - Get list of past summaries
  - `api/activity/summaries/[date]/route.ts` - Get specific date summary
- `lib/` - Core business logic and utilities
  - `auth.ts` - Better Auth configuration with GitHub OAuth
  - `github.ts` - Octokit helpers for GitHub API
  - `scan.ts` - Repository scanning pipeline
  - `qstash.ts` - Upstash QStash client for background jobs
  - `activity-summary.ts` - Daily GitHub activity summary generator
  - `email.ts` - Resend email integration for activity summaries
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
- **Vercel Cron Jobs** for scheduled daily summaries
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

### Daily Activity Summary

**Scheduled Execution**:
- Uses **Vercel Cron Jobs** (configured in `vercel.json`)
- Runs Monday-Friday at 11 PM UTC (= Tuesday-Saturday 8 AM JST)
- Cron expression: `0 23 * * 1-5`
- Protected by `CRON_SECRET` authentication

**Why Vercel Cron over QStash?**:
- Simpler setup (no additional service)
- Free on all Vercel plans
- Sufficient for lightweight daily tasks
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
- **Daily Summaries**: Scheduled via Vercel Cron Jobs (`0 23 * * 1-5` UTC = 8 AM JST Tue-Sat) to generate daily GitHub activity summaries

## Performance Considerations

- **Sequential**: 168 repos × 3 sec = ~8.4 minutes
- **Batch (10 parallel)**: 17 batches × 3 sec = ~51 seconds (development mode)
- **QStash**: Distributed processing, no local timeout limits (production mode)

## Daily Activity Summary Feature

### Overview
Automated daily GitHub activity digest sent via email every weekday morning at 8 AM JST (Tuesday-Saturday).

### Architecture
- **Scheduled Job**: Vercel Cron Jobs (configured in `vercel.json`)
- **Endpoint**: `/api/cron/daily-summary` (GET with Bearer token authentication)
- **Data Collection**: GitHub API calls to fetch commits, PRs, issues from previous day
- **Storage**: Markdown summaries stored in `activity_summaries` table
- **Email Delivery**: Resend API for sending formatted HTML emails

### Data Sources
- Organization events via GitHub API
- Repository commits (filtered by date range)
- Pull requests (opened, merged, closed)
- Issues (opened, closed, commented)
- Contributor activity aggregated by member

### Summary Format
Markdown document with sections:
1. **Overview**: Total commits, PRs, issues, active members
2. **Top Contributors**: Ranked by activity volume
3. **Repository Activity**: Grouped by repository with detailed breakdown
4. **Highlights**: Notable events (milestones, releases, etc.)

Markdown is converted to HTML for email delivery using `marked` or `@react-email/components`.

### Configuration

**Email (Resend)**:
- `RESEND_API_KEY` - Required for sending emails (from Resend console)
- `RESEND_FROM_EMAIL` - Verified sender email address (e.g., `noreply@your-domain.com`)
- `ACTIVITY_SUMMARY_RECIPIENTS` - Comma-separated list of recipient emails
- Resend free tier: 100 emails/day, 3,000 emails/month

**Vercel Cron**:
- `CRON_SECRET` - Random string for authenticating cron requests (generate with `openssl rand -base64 32`)
- `vercel.json` configuration:
```json
{
  "crons": [{
    "path": "/api/cron/daily-summary",
    "schedule": "0 23 * * 1-5"
  }]
}
```
- Cron expression: `0 23 * * 1-5` (Mon-Fri 11 PM UTC = Tue-Sat 8 AM JST)
- Execution limit: 10 seconds on Hobby plan, 60 seconds on Pro

### Future Integrations
- **Microsoft Teams**: Planned for Phase 8 using Incoming Webhooks and Adaptive Cards
- Configuration will use `TEAMS_WEBHOOK_URL` environment variable