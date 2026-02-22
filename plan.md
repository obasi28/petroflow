# PetroFlow Development Plan & Recovery Guide

> This document tracks the full development roadmap, what's done, what's next, and how to recover from crashes or context loss.

---

## Master Roadmap

### Phase 1: Foundation + DCA MVP [IN PROGRESS - 90% Complete]

| Step | Description | Status | Key Files |
|------|-------------|--------|-----------|
| 1.1 | Git init, Docker Compose, Makefile, .env | DONE | docker-compose.dev.yml, Makefile |
| 1.2 | Backend: FastAPI, config, database, Alembic setup | DONE | backend/app/main.py, config.py, database.py |
| 1.3 | Backend: Models (user, well, production, DCA, project) | DONE | backend/app/models/*.py |
| 1.4 | Backend: Schemas (Pydantic validation) | DONE | backend/app/schemas/*.py |
| 1.5 | Backend: API endpoints (auth, wells, production, DCA, projects, imports) | DONE | backend/app/api/v1/endpoints/*.py |
| 1.6 | Backend: DCA engine (6 models, fitting, forecasting, Monte Carlo, diagnostics) | DONE | backend/app/engine/dca/*.py |
| 1.7 | Backend: Services, tasks, middleware, utils | DONE | backend/app/services/*.py, tasks/*.py |
| 1.8 | Frontend: Next.js init, Tailwind v4, shadcn/ui config | DONE | frontend/package.json, globals.css, etc. |
| 1.9 | Frontend: Types, API client, auth, hooks, stores | DONE | frontend/src/types/*.ts, lib/*.ts, hooks/*.ts |
| 1.10 | Frontend: Layout shell (sidebar, header, breadcrumbs, theme) | DONE | frontend/src/components/layout/*.tsx |
| 1.11 | Frontend: Auth pages (login, register) | DONE | frontend/src/app/(auth)/*.tsx |
| 1.12 | Frontend: Well management (list, create, detail, tabs) | DONE | frontend/src/app/(dashboard)/wells/*.tsx |
| 1.13 | Frontend: Production module (charts, table, import wizard) | DONE | frontend/src/components/production/*.tsx |
| 1.14 | Frontend: DCA workspace (Plotly chart, controls, results, Monte Carlo) | DONE | frontend/src/components/dca/*.tsx |
| 1.15 | Frontend: Dashboard + Projects | DONE | frontend/src/app/(dashboard)/dashboard/*.tsx |
| 1.16 | Alembic migrations | TODO | backend/alembic/versions/ |
| 1.17 | Database seeding (sample data) | TODO | infrastructure/scripts/seed-data.sh |
| 1.18 | Integration testing (frontend <-> backend) | TODO | -- |
| 1.19 | Unit tests (DCA engine) | TODO | backend/tests/ |
| 1.20 | Error boundaries + loading states polish | TODO | -- |

### Phase 2: Core Reservoir Engineering [NOT STARTED]

| Module | Description | Key Files to Create |
|--------|-------------|-------------------|
| Material Balance | Schilthuis, Havlena-Odeh, drive mechanisms | `engine/material_balance/{schilthuis,havlena_odeh,tank_model}.py` |
| PVT Analysis | Standing, Vasquez-Beggs, Lee-Gonzalez, Z-factor | `engine/pvt/{standing,vasquez_beggs,lee_gonzalez,z_factor}.py` |
| Well Test | Drawdown, Horner, MDH, Bourdet derivative | `engine/well_test/{drawdown,buildup,derivative}.py` |
| Production Analytics | Rate normalization, WOR/GOR diagnostics | `components/analytics/*.tsx` |
| New DB Tables | pressure_records, pvt_data, material_balance_analyses | `models/pressure.py, pvt.py, material_balance.py` |

### Phase 3: Advanced Analysis [NOT STARTED]

| Module | Description |
|--------|-------------|
| Type Curves | Fetkovich, Blasingame, Agarwal-Gardner, NPI, FMB |
| Nodal Analysis | IPR + VLP intersection, multiphase correlations |
| IPR Models | Vogel, Fetkovich, Jones, composite |
| Water Influx | Van Everdingen-Hurst, Carter-Tracy, Fetkovich aquifer |
| Volumetrics | Deterministic + MC probabilistic OOIP/OGIP |

### Phase 4: Simulation & Economics [NOT STARTED]

| Module | Description |
|--------|-------------|
| Simulation | 1D/2D finite difference (IMPES), Buckley-Leverett, rel perm |
| Economics | DCF (NPV, IRR), price decks, OPEX, sensitivity analysis |

### Phase 5: AI/ML & Polish [NOT STARTED]

| Module | Description |
|--------|-------------|
| PINNs | Physics-informed neural networks (PyTorch) |
| LLM Integration | Natural language queries, report generation |
| MCP Server | Expose tools for AI agents |
| Collaboration | WebSocket presence, CRDT editing |
| Reporting | PDF generation (reportlab/weasyprint) |

---

## Recovery Procedures

### If the Computer Crashes / Session Ends

1. **Open terminal**, navigate to project:
   ```bash
   cd "C:/Users/eobasi.2NCJQ13/Desktop/Reservoir engineer app"
   ```

2. **Check git state**:
   ```bash
   git status
   git branch
   git log --oneline -5
   ```

3. **Read this file** and `scratchpad.md` to understand current state

4. **If uncommitted changes exist**, commit them:
   ```bash
   git add -A
   git commit -m "WIP: save progress before resuming"
   ```

5. **Verify frontend builds**:
   ```bash
   cd frontend && npx next build
   ```

6. **Resume from the last incomplete step** in the roadmap above

### If npm install Fails

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### If Build Fails After Crash

1. Check the error output from `npx next build`
2. Most likely causes:
   - Missing import (unused variable warnings are OK, unused imports cause errors)
   - Empty interface extending another (use `type X = Partial<Y>` instead)
   - SSR issue with Plotly (must use `dynamic(() => import('react-plotly.js'), { ssr: false })`)
3. Fix the specific error and rebuild

### If Git Gets Into Bad State

```bash
# Check what branches exist
git branch -a

# If on wrong branch
git checkout feat/phase2-frontend

# If main is behind
git checkout main
git merge feat/phase2-frontend

# If remote is out of sync
git push origin main --force  # CAREFUL: only if you know local is correct
```

### If GitHub Repo Has Issues

```bash
# Check remote
git remote -v

# Re-add remote if needed
git remote set-url origin https://github.com/obasi28/petroflow.git

# Check default branch
gh repo view obasi28/petroflow --json defaultBranchRef

# Set default branch
gh repo edit obasi28/petroflow --default-branch main
```

### If Docker Services Won't Start

```bash
# Check what's running
docker ps

# Full restart
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Check logs
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs db
```

---

## Branch Strategy

```
main (default, stable)
  |
  +-- feat/phase1-scaffold (MERGED, DELETED)
  |
  +-- feat/phase2-frontend (CURRENT - all frontend code)
  |
  +-- feat/phase2-reservoir (FUTURE - material balance, PVT, well test)
  |
  +-- feat/phase3-advanced (FUTURE - type curves, nodal, volumetrics)
  |
  +-- feat/phase4-simulation (FUTURE - simulation, economics)
  |
  +-- feat/phase5-ai-ml (FUTURE - PINNs, LLM, MCP)
```

---

## Critical File Locations

### Backend (Python)

| Category | Path |
|----------|------|
| FastAPI entry | `backend/app/main.py` |
| Config | `backend/app/config.py` |
| Database | `backend/app/database.py` |
| Auth dependency | `backend/app/dependencies.py` |
| Models | `backend/app/models/{user,well,production,dca,project}.py` |
| Schemas | `backend/app/schemas/{common,well,production,dca}.py` |
| API endpoints | `backend/app/api/v1/endpoints/{auth,wells,production,dca,projects,imports}.py` |
| DCA engine | `backend/app/engine/dca/{arps,modified_hyp,sedm,duong,fitting,forecasting,monte_carlo,diagnostics}.py` |
| Celery tasks | `backend/app/tasks/{celery_app,dca_tasks,import_tasks}.py` |

### Frontend (TypeScript/React)

| Category | Path |
|----------|------|
| Root layout | `frontend/src/app/layout.tsx` |
| Global CSS | `frontend/src/app/globals.css` |
| API client | `frontend/src/lib/api-client.ts` |
| Auth helpers | `frontend/src/lib/auth.ts` |
| Zod validators | `frontend/src/lib/validators.ts` |
| Types (backend mirror) | `frontend/src/types/{api,well,production,dca}.ts` |
| TanStack hooks | `frontend/src/hooks/{use-wells,use-production,use-dca}.ts` |
| Zustand stores | `frontend/src/stores/{ui-store,dca-store}.ts` |
| Sidebar | `frontend/src/components/layout/app-sidebar.tsx` |
| Header | `frontend/src/components/layout/header.tsx` |
| Well table | `frontend/src/components/wells/well-table.tsx` |
| Well form | `frontend/src/components/wells/well-form.tsx` |
| Production chart | `frontend/src/components/production/production-chart.tsx` |
| Import wizard | `frontend/src/components/production/import-wizard.tsx` |
| DCA workspace | `frontend/src/app/(dashboard)/wells/[wellId]/dca/page.tsx` |
| DCA chart (Plotly) | `frontend/src/components/dca/dca-chart.tsx` |
| DCA controls | `frontend/src/components/dca/dca-controls.tsx` |
| Monte Carlo dialog | `frontend/src/components/dca/dca-monte-carlo-dialog.tsx` |
| Plotly wrapper | `frontend/src/components/charts/plotly-chart.tsx` |
| Recharts wrapper | `frontend/src/components/charts/base-chart.tsx` |

---

## Key Technical Decisions (Don't Change Without Good Reason)

1. **Tailwind CSS v4** - Uses CSS `@theme` directive, NOT `tailwind.config.ts`
2. **API Proxy** - Next.js `rewrites` in `next.config.ts`, NOT CORS headers
3. **JWT in localStorage** - NOT httpOnly cookies (simplifies frontend, backend validates)
4. **Plotly.js dynamic import** - `ssr: false` required, otherwise Node.js crashes
5. **Recharts for dashboards, Plotly for scientific** - Don't mix them per page
6. **shadcn/ui new-york style** - NOT default style. Zinc base color.
7. **Dark mode default** - Set in ThemeProvider `defaultTheme="dark"`
8. **SPE/PRMS Monte Carlo convention** - P90 = 10th percentile (conservative), P10 = 90th percentile (optimistic)
9. **Modified Hyperbolic as default model** - Industry standard for EUR estimation
10. **API response envelope** - ALL responses: `{ status, data, meta, errors }`

---

## Environment Variables (from .env.example)

```
DATABASE_URL=postgresql+asyncpg://petroflow:petroflow@localhost:5432/petroflow
REDIS_URL=redis://localhost:6379/0
BACKEND_SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
NEXTAUTH_SECRET=change-me-in-production-use-openssl-rand-hex-32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```
