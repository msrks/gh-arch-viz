# Next.js Starter Template

A production-ready Next.js 15 starter template with authentication, database, and modern tooling. Perfect for building full-stack web applications quickly and securely.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmsrks%2Fnextjs-starter&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,NEXT_PUBLIC_APP_URL&envDescription=Environment%20variables%20needed%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fmsrks%2Fnextjs-starter%23environment-variables)

## ✨ Features

- **🚀 Next.js 15** - Latest App Router with Turbopack for fast development
- **🔐 Authentication** - Secure email/password auth with [Better Auth](https://better-auth.com)
- **💾 Database** - PostgreSQL with [Neon](https://neon.tech) serverless database
- **🗄️ ORM** - Type-safe database queries with [Drizzle ORM](https://orm.drizzle.team)
- **🎨 Styling** - Beautiful UI with [Tailwind CSS 4](https://tailwindcss.com)
- **📱 Responsive** - Mobile-first responsive design
- **🔒 Security** - Protected routes with middleware authentication
- **⚡ Fast** - Optimized with React Server Components and streaming
- **📦 Type Safe** - Full TypeScript support throughout

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Next.js API Routes, Server Actions
- **Database:** PostgreSQL (Neon), Drizzle ORM
- **Authentication:** Better Auth
- **Deployment:** Vercel-ready
- **Package Manager:** pnpm

## 🚀 One-Click Deploy

Deploy this template to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmsrks%2Fnextjs-starter&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,NEXT_PUBLIC_APP_URL&envDescription=Environment%20variables%20needed%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fmsrks%2Fnextjs-starter%23environment-variables)

After deployment, you'll need to:
1. **Set up Neon Database** - Create a [Neon](https://neon.tech) account and get your `DATABASE_URL`
2. **Generate Auth Secret** - Create a secure secret for `BETTER_AUTH_SECRET`
3. **Update Environment Variables** - Add the variables in your Vercel dashboard
4. **Push Database Schema** - Run `pnpm drizzle-kit push` locally or in Vercel's terminal

## 🛠️ Manual Setup

### 1. Clone and Install

```bash
git clone https://github.com/msrks/nextjs-starter.git
cd nextjs-starter
pnpm install
```

### 2. Environment Setup

Copy the environment variables template:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database - Get from Neon Dashboard
DATABASE_URL="postgresql://username:password@host.neon.tech/database_name?sslmode=require"

# Authentication - Generate secure secret
BETTER_AUTH_SECRET="your-very-secure-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# App URL (Client-side) - Important for production deployment
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup

Create and push your database schema:

```bash
pnpm drizzle-kit push
```

### 4. Start Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) - you'll be redirected to sign up!

## 🔧 Environment Variables

This template requires the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string from Neon | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `BETTER_AUTH_SECRET` | Secret key for session encryption | `your-very-secure-secret-key` |
| `BETTER_AUTH_URL` | Base URL for your application (server-side) | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |
| `NEXT_PUBLIC_APP_URL` | Base URL for client-side API calls | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |

### Getting Your Environment Variables

1. **DATABASE_URL**: 
   - Create a [Neon](https://neon.tech) account
   - Create a new project
   - Copy the connection string from your dashboard

2. **BETTER_AUTH_SECRET**: 
   - Generate a secure random string (32+ characters)
   - You can use: `openssl rand -base64 32`

3. **BETTER_AUTH_URL**: 
   - Use `http://localhost:3000` for development
   - Use your actual domain for production

4. **NEXT_PUBLIC_APP_URL**: 
   - Use `http://localhost:3000` for development
   - Use your actual domain for production (e.g., `https://yourdomain.com`)
   - **Important**: This must be set correctly in production to avoid authentication issues

## 📁 Project Structure

```text
├── app/                    # Next.js App Router
│   ├── api/auth/          # Authentication API routes
│   ├── auth/              # Auth pages (sign-in, sign-up)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (protected)
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── todo-form.tsx      # Example todo form
│   ├── todo-item.tsx      # Example todo item
│   └── todo-list.tsx      # Example todo list
├── lib/                   # Utility libraries
│   ├── actions/           # Server actions
│   ├── db/                # Database configuration
│   │   ├── index.ts       # Database client
│   │   └── schema.ts      # Database schema
│   ├── auth.ts            # Auth configuration
│   ├── auth-client.ts     # Client-side auth
│   └── utils.ts           # Utilities
├── middleware.ts          # Route protection
├── drizzle.config.ts      # Drizzle configuration
└── .env.example           # Environment variables template
```

## 🗄️ Database Schema

The starter includes a complete authentication schema and example todos:

- **Users** - User accounts with email/password
- **Sessions** - Secure session management
- **Accounts** - Auth provider accounts
- **Verification** - Email verification tokens
- **Todos** - Example user-specific data

## 🔐 Authentication Features

- **Email/Password** - Secure authentication with Better Auth
- **Session Management** - HTTP-only cookies with CSRF protection
- **Route Protection** - Middleware-based route guarding
- **User-Specific Data** - All data scoped to authenticated users
- **Sign In/Up/Out** - Complete auth flow with error handling

## 🚀 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database Commands

```bash
pnpm drizzle-kit push       # Push schema changes
pnpm drizzle-kit studio     # Open Drizzle Studio
```

## 📦 Deployment

### Option 1: One-Click Deploy (Recommended)

Use the "Deploy with Vercel" button at the top of this README for instant deployment.

### Option 2: Manual Deploy

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard:
   - `DATABASE_URL` - Your Neon database connection string
   - `BETTER_AUTH_SECRET` - A secure random string
   - `BETTER_AUTH_URL` - Your production domain (e.g., `https://yourdomain.com`)
   - `NEXT_PUBLIC_APP_URL` - Your production domain (e.g., `https://yourdomain.com`)
4. Deploy!

### Post-Deployment Steps

After deployment, make sure to:

1. **Push your database schema**: Run `pnpm drizzle-kit push`
2. **Test authentication**: Try signing up/in on your live site
3. **Verify database connection**: Check that data persists correctly

## 🤝 Contributing

This is a starter template - feel free to:

- Fork and customize for your needs
- Submit improvements via pull requests
- Report issues or suggest features

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Neon Documentation](https://neon.tech/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

MIT License - feel free to use this template for your projects!

---

Built with ❤️ using modern web technologies
