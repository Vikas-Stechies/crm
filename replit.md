# replit.md

## Overview

This is a **Hotel Management System** — a full-stack web application for managing hotel bookings, occupancy tracking, and revenue analytics. It supports multiple user roles (admin, owner, manager) across multiple hotels, with features for booking CRUD, agency tracking, occupancy/revenue reporting with charts, and an admin panel for managing hotels and users.

The app is designed as a mobile-first responsive SPA with a luxury hotel aesthetic, featuring a bottom navigation bar on mobile and a sidebar on desktop.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a three-folder monorepo pattern:
- **`client/`** — React SPA (frontend)
- **`server/`** — Express API (backend)
- **`shared/`** — Shared types, schemas, and API route definitions used by both client and server

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Forms**: React Hook Form with Zod resolvers for validation
- **Charts**: Recharts for occupancy and revenue visualizations
- **Fonts**: Outfit (display/headings) and DM Sans (body text)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

Key pages: Login, Dashboard, Bookings List, Booking Detail (create/edit), Occupancy charts, Revenue charts, Admin panel.

### Backend (`server/`)
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, run with `tsx` in development
- **Authentication**: Passport.js with Local Strategy, express-session with MemoryStore
- **Password Hashing**: Node.js `crypto.scrypt` with random salt
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Session Storage**: MemoryStore (development) — connect-pg-simple is available for production PostgreSQL session storage

### Database
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-Zod validation
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (`npm run db:push`)
- **Tables**: `hotels`, `users`, `bookings`, `agencies`
- **Key relationships**: Users belong to hotels (optional for admins), bookings belong to hotels and optionally to agencies

### Shared Layer (`shared/`)
- **`schema.ts`**: Drizzle table definitions and insert schemas (Zod-based)
- **`routes.ts`**: API contract definitions with Zod schemas for request/response validation — acts as a typed API contract between frontend and backend

### Build & Deploy
- **Dev**: `npm run dev` — runs tsx on server/index.ts, Vite dev server middleware handles frontend HMR
- **Build**: `npm run build` — Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- **Production**: `npm start` — runs the built `dist/index.cjs` which serves static files from `dist/public/`
- **Type Check**: `npm run check`

### Authentication & Authorization
- Session-based auth with Passport Local Strategy
- Email used as username for login
- Three roles: `admin` (system-wide), `owner`, `manager` (hotel-scoped)
- Protected routes redirect unauthenticated users to `/auth`
- Admin users are directed to `/admin`, others to `/dashboard`

## External Dependencies

### Required Services
- **PostgreSQL Database**: Must be provisioned and connected via `DATABASE_URL` environment variable
- **Session Secret**: `SESSION_SECRET` environment variable (falls back to "secret" in dev)

### Key NPM Packages
| Package | Purpose |
|---------|---------|
| `drizzle-orm` + `drizzle-kit` | Database ORM and migration tooling |
| `express` v5 | HTTP server framework |
| `passport` + `passport-local` | Authentication |
| `express-session` + `memorystore` | Session management |
| `@tanstack/react-query` | Client-side server state management |
| `recharts` | Data visualization (charts) |
| `react-hook-form` + `@hookform/resolvers` | Form handling with Zod validation |
| `shadcn/ui` components (Radix UI) | UI component library |
| `wouter` | Client-side routing |
| `date-fns` | Date formatting and manipulation |
| `zod` + `drizzle-zod` | Schema validation |
| `lucide-react` | Icon library |
| `vaul` | Drawer component |
| `embla-carousel-react` | Carousel component |

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)