# PetroFlow Development Scratchpad

> This file tracks everything that has been built, when it was built, and where we left off.
> Read this file first when resuming work on PetroFlow.

---

## Current State (Last Updated: 2026-02-22)

**Status**: Phase 1 frontend complete. Backend + Frontend both build successfully. Ready for integration testing.

**Branch**: `feat/phase2-frontend` (branched from `main`)
**Last Commit on main**: `1d2938b feat: scaffold PetroFlow reservoir engineering SaaS platform (Phase 1)` (backend only)
**Pending Commit**: All frontend files (83 TS/TSX + config + docs) on `feat/phase2-frontend`

**GitHub Repo**: https://github.com/obasi28/petroflow
**Default Branch**: `main`
**Local Path**: `C:\Users\eobasi.2NCJQ13\Desktop\Reservoir engineer app`

---

## Build Log (Chronological)

### Session 1: Project Scaffolding + Backend (Complete)

**Date**: Initial session
**What was built**:

1. **Root Config Files**
   - `.gitignore` - node_modules, __pycache__, .env, .next exclusions
   - `.env.example` - DATABASE_URL, REDIS_URL, BACKEND_SECRET_KEY, NEXTAUTH_SECRET
   - `docker-compose.dev.yml` - Services: db (timescale pg16), redis (7-alpine), backend, celery-worker, frontend
   - `Makefile` - Targets: dev-up, dev-down, migrate, seed, test-backend, test-frontend, install, lint, format

2. **Backend Core** (FastAPI)
   - `backend/pyproject.toml` - All Python dependencies
   - `backend/app/main.py` - FastAPI app with CORS, `/api/v1` router, health check
   - `backend/app/config.py` - Pydantic Settings (database_url, redis_url, etc.)
   - `backend/app/database.py` - Async SQLAlchemy with pool_size=20
   - `backend/app/dependencies.py` - CurrentUser dataclass, get_current_user from Bearer token

3. **Backend Models** (SQLAlchemy 2.0)
   - `models/user.py` - User, Team, TeamMembership, Account
   - `models/well.py` - Well with 30+ fields, tags ARRAY, custom_fields JSONB, soft delete
   - `models/production.py` - ProductionRecord with composite PK (well_id + date), TimescaleDB ready
   - `models/dca.py` - DCAAnalysis (JSONB parameters, monte_carlo_results), DCAForecastPoint
   - `models/project.py` - Project with team_id
   - `models/base.py` - Base model with UUID PK, created_at/updated_at audit mixin

4. **Backend Schemas** (Pydantic)
   - `schemas/common.py` - success_response(), paginated_response(), ApiResponse envelope
   - `schemas/well.py` - WellCreate (49 fields), WellUpdate, WellResponse
   - `schemas/production.py` - ProductionRecordCreate, ProductionBatchCreate, ProductionStatistics
   - `schemas/dca.py` - DCACreate (regex-validated model_type), DCAResponse, DCAAutoFitRequest/Response, DCAMonteCarloRequest

5. **Backend API Endpoints**
   - `endpoints/auth.py` - POST /register (auto-creates team), POST /login, GET /me
   - `endpoints/wells.py` - Full CRUD with pagination + filtering
   - `endpoints/production.py` - GET (date range), POST (batch upsert), GET /statistics
   - `endpoints/dca.py` - 281 lines. Create+fit, auto-fit, Monte Carlo via Celery
   - `endpoints/projects.py` - Full CRUD
   - `endpoints/imports.py` - File upload, CSV/Excel parsing, column auto-detect

6. **DCA Calculation Engine** (Pure Python, zero DB dependencies)
   - `engine/dca/arps.py` - Exponential, Hyperbolic, Harmonic (rate + cumulative + time_to_rate)
   - `engine/dca/modified_hyp.py` - Switch time: t_sw = (di - d_min) / (b * di * d_min)
   - `engine/dca/sedm.py` - Stretched exponential with scipy.special.gamma
   - `engine/dca/duong.py` - Fracture-dominated unconventional model
   - `engine/dca/fitting.py` - DCAFitter with bounds, TRF + differential_evolution fallback, auto_fit()
   - `engine/dca/forecasting.py` - Monthly rate/cumulative arrays, economic limit cutoff
   - `engine/dca/monte_carlo.py` - MonteCarloEUR: normal/lognormal/uniform/triangular, P10/P50/P90 (SPE convention)
   - `engine/dca/diagnostics.py` - R2, adj-R2, RMSE, NRMSE, MAE, MAPE, AIC, BIC, Durbin-Watson
   - `engine/units/converter.py` + `constants.py` - Unit conversion utilities

7. **Backend Services & Utils**
   - `services/well_service.py`, `production_service.py`, `import_service.py`
   - `tasks/celery_app.py`, `dca_tasks.py`, `import_tasks.py`
   - `middleware/auth.py`, `middleware/tenant.py` (placeholder)
   - `utils/pagination.py`, `file_parsers.py`, `exceptions.py`

**Total backend files**: 55 Python files
**Commit**: `1d2938b` on `master` (later force-pushed to `main`)

**Issues encountered**:
- "File has not been read yet" error when writing to `__init__.py` created with `touch`. Fix: Read file first.
- GitHub PR creation failed due to orphan `main` branch with no common history. Fixed in Session 2.

---

### Session 2: Git Cleanup + Frontend Build (Complete)

**Date**: 2026-02-22
**What was built**:

1. **Git Cleanup**
   - Deleted orphan `main` branch (had empty commit from failed PR attempt)
   - Force-pushed `master` content to new `main` branch
   - Set `main` as default branch on GitHub
   - Deleted `master` and `feat/phase1-foundation` remote branches
   - Created `feat/phase2-frontend` from `main`

2. **Frontend Config** (Step 1)
   - `package.json` - Next.js 15, React 19, TypeScript, Tailwind v4, all deps
   - `tsconfig.json` - Strict mode, `@/*` path alias
   - `next.config.ts` - API proxy rewrites (/api/v1/* -> localhost:8000)
   - `postcss.config.mjs` - @tailwindcss/postcss plugin
   - `components.json` - shadcn/ui config (new-york, zinc, CSS variables)
   - `.eslintrc.json` - Next.js lint config
   - `globals.css` - Tailwind v4 @import, @theme with dark/light CSS vars, chart colors
   - `lib/utils.ts` - cn() helper + formatNumber/formatRate/formatDate/formatCumulative

3. **Core Infrastructure** (Step 2)
   - `types/api.ts` - ApiResponse<T>, PaginationMeta, ErrorDetail, AuthTokens, UserProfile
   - `types/well.ts` - Well, WellCreate, WellUpdate, WellFilters (exact match to backend schemas)
   - `types/production.ts` - ProductionRecord, ProductionBatchCreate, ProductionStatistics
   - `types/dca.ts` - DCAAnalysis, DCACreate, DCAAutoFitResult, MonteCarloResults, MODEL_LABELS, PARAMETER_UNITS
   - `lib/api-client.ts` - Fetch wrapper with JWT auto-attach, response parsing, 401 redirect
   - `lib/auth.ts` - login(), register(), logout(), getToken(), isAuthenticated(), localStorage
   - `lib/validators.ts` - Zod schemas for login, register, well create, DCA create
   - `hooks/use-wells.ts` - useWells, useWell, useCreateWell, useUpdateWell, useDeleteWell
   - `hooks/use-production.ts` - useProduction, useProductionStats, useBatchCreateProduction
   - `hooks/use-dca.ts` - useDCAAnalyses, useDCAAnalysis, useCreateDCA, useAutoFit, useRunMonteCarlo
   - `stores/ui-store.ts` - sidebar, theme, globalLoading (Zustand)
   - `stores/dca-store.ts` - selectedModel, chartScale, selectedAnalysis, autoFitResults
   - `config/query-client.ts` - TanStack QueryClient (staleTime 30s, retry 1)
   - `config/site.ts` - App name, nav items with Lucide icons

4. **shadcn/ui Components** (Step 3) - 24 components installed via CLI:
   - button, input, label, card, dialog, dropdown-menu, separator, badge, table, tabs, select, tooltip, sheet, form, sonner, skeleton, popover, checkbox, scroll-area, avatar, calendar, command, sidebar
   - Also installed: use-mobile.ts hook

5. **Layout Shell** (Step 3)
   - `app/layout.tsx` - Root with Inter + JetBrains Mono via next/font, Providers, Toaster
   - `app/page.tsx` - Redirect to /dashboard
   - `app/(auth)/layout.tsx` - Centered card layout
   - `app/(dashboard)/layout.tsx` - SidebarProvider + AppSidebar + SidebarInset + Header
   - `components/layout/app-sidebar.tsx` - Collapsible sidebar with logo, nav groups, team footer
   - `components/layout/header.tsx` - SidebarTrigger, breadcrumbs, theme toggle, user dropdown
   - `components/layout/theme-toggle.tsx` - Dark/light/system with persistence
   - `components/layout/breadcrumbs.tsx` - Auto-generated from pathname
   - `components/providers.tsx` - QueryClientProvider + ThemeProvider + TooltipProvider

6. **Auth Pages** (Step 4)
   - `app/(auth)/login/page.tsx` - Email + password form, Zod validation, JWT storage, redirect
   - `app/(auth)/register/page.tsx` - Name + email + password + confirm, auto-login after
   - `middleware.ts` - Next.js middleware (passthrough for now, client-side auth guard)
   - `components/auth/auth-guard.tsx` - Client-side isAuthenticated() check

7. **Well Management** (Step 5)
   - `app/(dashboard)/wells/page.tsx` - DataTable + search + status/type filters + pagination
   - `app/(dashboard)/wells/new/page.tsx` - Multi-section creation form
   - `app/(dashboard)/wells/[wellId]/layout.tsx` - Tab navigation (Overview/Production/DCA/Import)
   - `app/(dashboard)/wells/[wellId]/page.tsx` - Overview with stats cards
   - `components/wells/well-table.tsx` - TanStack Table with sorting, 8 columns, actions dropdown
   - `components/wells/well-form.tsx` - 6 card sections (ID, classification, location, dates, params, reservoir)
   - `components/wells/well-header.tsx` - Name, status badge, location, key metrics
   - `components/wells/well-stats-cards.tsx` - Cum oil, cum gas, peak rate, total records

8. **Production Module** (Step 6)
   - `app/(dashboard)/wells/[wellId]/production/page.tsx` - Chart + table + stats sidebar
   - `app/(dashboard)/wells/[wellId]/import/page.tsx` - Import wizard page
   - `components/charts/base-chart.tsx` - Recharts wrapper (ChartContainer, ChartGrid, axis, tooltip)
   - `components/production/production-chart.tsx` - Oil/gas/water line chart with rate/cumulative toggle
   - `components/production/production-table.tsx` - All production columns, color-coded
   - `components/production/production-stats.tsx` - Rates, cumulatives, averages panels
   - `components/production/import-wizard.tsx` - 3-step: upload (dropzone) -> column mapping -> preview

9. **DCA Workspace** (Step 7)
   - `app/(dashboard)/wells/[wellId]/dca/page.tsx` - 3-panel orchestrator (controls | chart | results)
   - `components/charts/plotly-chart.tsx` - Dynamic import wrapper (ssr:false) with dark theme
   - `components/dca/dca-chart.tsx` - Plotly.js: production scatter, fit curve, forecast dashed, econ limit
   - `components/dca/dca-controls.tsx` - Model selector (6 types), date range, forecast config, Fit/AutoFit buttons
   - `components/dca/dca-parameters-panel.tsx` - Fitted parameters table with units
   - `components/dca/dca-results-summary.tsx` - R2/RMSE/AIC/BIC, EUR, remaining reserves, MC results
   - `components/dca/dca-forecast-table.tsx` - Monthly forecast data + CSV export
   - `components/dca/dca-monte-carlo-dialog.tsx` - Configure distributions, iterations, run simulation
   - `components/dca/model-comparison-table.tsx` - Ranked by AIC with R2/RMSE/EUR

10. **Dashboard + Projects** (Step 8)
    - `app/(dashboard)/dashboard/page.tsx` - KPI cards (total/active wells, avg rate, EUR), recent wells, production chart
    - `app/(dashboard)/projects/page.tsx` - Project cards with create dialog
    - `app/(dashboard)/projects/[projectId]/page.tsx` - Project detail with filtered wells
    - `app/(dashboard)/settings/page.tsx` - Profile, preferences, team (placeholder)
    - `components/dashboard/kpi-card.tsx` - Metric + trend indicator
    - `components/dashboard/recent-wells-list.tsx` - 5 most recent wells with status badges
    - `components/dashboard/production-summary-chart.tsx` - Recharts area chart (oil/gas/water stacked)

**Total frontend files**: 83 TypeScript/TSX source files + 1 CSS + 6 config files
**Build**: `next build` succeeds with ZERO errors, 14 routes generated

---

## File Counts Summary

| Category | Count |
|----------|-------|
| Backend Python files | 55 |
| Frontend TS/TSX files | 83 |
| Frontend CSS files | 1 |
| Frontend config files | 6 |
| shadcn/ui components | 24 |
| Root config files | 4 (.gitignore, .env.example, docker-compose, Makefile) |
| Documentation | 3 (PRD.md, scratchpad.md, plan.md) |
| **Total source files** | **~145+** |

---

## Known Issues / Technical Debt

1. **No Alembic migrations created yet** - Schema exists in models but no actual migration files
2. **No database seeding** - Need sample well + production data for demo/testing
3. **Auth middleware is passthrough** - Next.js middleware doesn't check JWT (can't access localStorage server-side). Client-side AuthGuard handles it.
4. **No tests** - Backend unit tests for DCA engine needed, frontend component tests needed
5. **Plotly.js bundle size** - 2.4MB gzip. Consider plotly.js-basic-dist for production
6. **No WebSocket support** - Monte Carlo progress polling is HTTP-based, not real-time
7. **No error boundaries** - React error boundaries needed for production
8. **No loading skeletons** on some pages - Dashboard has them, but could be more thorough
9. **Import wizard** - Currently client-side CSV parsing only. Backend import endpoint needs testing.
10. **Font warning** - Fixed by switching from `<link>` to `next/font/google`

---

### Session 5: Bug Fixes & Multi-Well Analysis (2026-02-26)

**What was fixed/built**:

1. **Well Edit Page** (`wells/[wellId]/edit/page.tsx`)
   - Created new edit page that reuses `WellForm` with pre-filled values from existing well
   - Connected "Edit" button in `WellHeader` to link to `/wells/{id}/edit`
   - Fixed table "Edit" action to link to edit page instead of view
   - Added `router.back()` to Cancel button in WellForm

2. **Multi-Well Analysis Page** (`analysis/page.tsx`)
   - New `/analysis` route with well selection panel (checkbox list)
   - Filter wells by basin
   - "Well Comparison" tab: side-by-side parameters table (depth, lateral, stages, pressure, porosity, perm)
   - "Production & DCA" tab: per-well stat cards showing production stats + latest DCA results
   - Added "Multi-Well Analysis" to sidebar navigation

3. **Well Dashboard Cards** (enhanced `well-stats-cards.tsx`)
   - Added 8 production-based cards (current rate, cum oil/gas, peak rate, avg rate, water cut, GOR, history)
   - Added 4 well-metadata cards (total depth, lateral length, frac stages, initial pressure)
   - Cards now always show well property data even without production records

4. **General Dashboard** (enhanced `dashboard/page.tsx`)
   - Added secondary KPI row: Projects, Basins, Horizontal wells, Primary type
   - Added "Wells by Basin" distribution bar chart
   - Added "Wells by Status" distribution with color indicators
   - All KPIs computed client-side from wells data (reliable fallback when backend KPI endpoint returns nulls)
   - Added "New Well" shortcut button

**Build**: `next build` succeeds with ZERO errors, 21 routes generated

---

## Where to Resume

**If continuing Phase 1**:
1. Run `docker-compose -f docker-compose.dev.yml up -d` to start DB + Redis
2. Run Alembic migrations (`alembic upgrade head`)
3. Seed sample data (create a well, import production CSV)
4. Run `npm run dev` in frontend/ and test end-to-end
5. Fix any integration issues between frontend and backend

**If starting Phase 2** (Core Reservoir Engineering):
1. Create `feat/phase2-reservoir` branch from `main`
2. Build Material Balance engine: `backend/app/engine/material_balance/`
3. Build PVT engine: `backend/app/engine/pvt/`
4. Build Well Test engine: `backend/app/engine/well_test/`
5. Create corresponding frontend pages and components

---

## Quick Commands

```bash
# Navigate to project
cd "C:/Users/eobasi.2NCJQ13/Desktop/Reservoir engineer app"

# Start frontend dev server
cd frontend && npm run dev

# Build frontend (verify no errors)
cd frontend && npx next build

# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Start all services with Docker
docker-compose -f docker-compose.dev.yml up -d

# Check git status
git status && git branch

# GitHub CLI
gh repo view obasi28/petroflow
```
