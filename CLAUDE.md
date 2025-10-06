# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - Runs Next.js with Turbopack for fast hot reloading
- **Production build**: `pnpm build` - Creates optimized production build with Turbopack
- **Start production**: `pnpm start` - Serves the production build
- **Linting**: `pnpm lint` - Runs ESLint to check code quality and TypeScript types

## Project Architecture

This is a **Next.js 15** application using the **App Router** pattern with the following structure:

- `app/` - Contains all application routes and layouts using App Router
  - `layout.tsx` - Root layout with Geist font setup and global styles
  - `page.tsx` - Home page component
  - `globals.css` - Global Tailwind CSS styles
- `lib/` - Utility functions
  - `utils.ts` - Contains `cn()` utility for Tailwind class merging
- `components.json` - **shadcn/ui** configuration for component generation

## Key Technologies

- **Next.js 15** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **shadcn/ui** component system (configured with "new-york" style)
- **Lucide React** for icons
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