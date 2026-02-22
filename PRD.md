# PetroFlow - Product Requirements Document (PRD)

## 1. Executive Summary

PetroFlow is a production-grade, community-oriented reservoir engineering SaaS platform designed to replace expensive proprietary tools like ComboCurve, Eclipse, Aries, and PHDWin. It targets reservoir engineers who are fresh out of school, freelancers, and small company engineers who cannot afford five-figure annual license fees.

The platform provides a comprehensive suite of reservoir engineering analysis tools with a professional, data-dense UI (Bloomberg Terminal meets ComboCurve aesthetic), AI/ML integration, and MCP connectivity for external tool interoperability.

---

## 2. Problem Statement

- Proprietary reservoir engineering software costs $10,000-$100,000+ per year per seat
- Fresh graduates, freelancers, and small operators are priced out
- No affordable, comprehensive, modern web-based alternative exists
- Existing tools have dated UIs and no AI/ML integration
- No tool offers MCP connectivity for AI agent interoperability

---

## 3. Target Users

| Persona | Description |
|---------|-------------|
| **Fresh Graduate** | Recent petroleum engineering graduate needing analysis tools for job applications, freelance work, or personal projects |
| **Independent Consultant** | Freelance reservoir engineer who needs professional tools without corporate license budgets |
| **Small Operator** | Small E&P company (1-50 wells) that can't justify enterprise software licenses |
| **Academic Researcher** | University professors and students needing production analysis tools |
| **Community Contributor** | Engineers who want to contribute to open-source reservoir engineering tools |

---

## 4. Product Vision

### 4.1 Core Modules (5 Phases)

#### Phase 1: Foundation + DCA MVP (CURRENT)
- **Authentication**: JWT-based auth with team/organization support
- **Well Management**: Full CRUD with 30+ header fields (API#, UWI, location, reservoir properties, completion data)
- **Production Data Management**: Batch import (CSV/Excel), time-series storage (TimescaleDB), monthly production records (oil/gas/water rates, pressures, GOR, water cut)
- **Decline Curve Analysis (DCA)**: 6 industry-standard models, automated curve fitting, Monte Carlo probabilistic EUR, model comparison
- **Dashboard**: KPI overview, recent wells, production summary charts
- **Projects**: Group wells into portfolios for organized analysis

#### Phase 2: Core Reservoir Engineering
- **Material Balance**: Schilthuis equation, Havlena-Odeh straight-line method, drive mechanism identification
- **PVT Analysis**: Standing, Vasquez-Beggs, Lee-Gonzalez, Beggs-Robinson, Z-factor (DAK, Hall-Yarborough)
- **Well Test Analysis**: Drawdown, Horner buildup, MDH method, Bourdet pressure derivative, skin factor
- **Enhanced Production Analytics**: Rate normalization, WOR/GOR diagnostics, decline rate monitoring

#### Phase 3: Advanced Analysis
- **Type Curve Analysis**: Fetkovich, Blasingame, Agarwal-Gardner, NPI, FMB with interactive drag-to-match
- **Nodal Analysis**: IPR + VLP intersection, multiphase correlations (Hagedorn-Brown, Beggs-Brill)
- **IPR Models**: Vogel, Fetkovich, Jones, composite IPR
- **Water Influx**: Van Everdingen-Hurst, Carter-Tracy, Fetkovich aquifer models
- **Volumetrics**: Deterministic + Monte Carlo probabilistic OOIP/OGIP

#### Phase 4: Simulation & Economics
- **Simplified Reservoir Simulation**: 1D/2D finite difference (IMPES), Buckley-Leverett, relative permeability (Corey, Brooks-Corey, LET)
- **Economics**: DCF engine (NPV, IRR, payout, PI), price deck management, OPEX modeling, sensitivity analysis (tornado + spider plots)

#### Phase 5: AI/ML & Polish
- **PINNs**: Physics-informed neural networks as simulation surrogates (PyTorch)
- **LLM Integration**: Natural language queries, automated report generation, analysis suggestions
- **MCP Server**: Expose all calculations as MCP tools for external AI agents
- **Real-Time Collaboration**: WebSocket presence, CRDT-based concurrent editing
- **Automated Reporting**: PDF generation with templates for DCA/reserves/well summary

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js (App Router) | 15.x | SSR, API routes, file-based routing |
| **Language** | TypeScript | 5.7+ | Type safety across full stack |
| **UI Components** | shadcn/ui (new-york) | Latest | Professional, customizable, accessible |
| **CSS** | Tailwind CSS | v4 | CSS-based `@theme` directive, no config file |
| **Server State** | TanStack Query | 5.x | Caching, background refetch, optimistic updates |
| **Client State** | Zustand | 5.x | Lightweight, no boilerplate, TypeScript-first |
| **Dashboard Charts** | Recharts | 2.x | Fast SVG rendering for production charts |
| **Scientific Charts** | Plotly.js | 2.x | Log-scale axes, scientific annotation, interactive |
| **Backend** | FastAPI | 0.115+ | Async, auto-docs, ML-friendly, 17ms response times |
| **Python** | Python | 3.11+ | Match statements, tomllib, performance improvements |
| **ORM** | SQLAlchemy (async) | 2.0+ | Modern async patterns, type hints |
| **Database** | PostgreSQL + TimescaleDB | 16 + latest | Time-series hypertables for production data |
| **Task Queue** | Celery + Redis | Latest | Monte Carlo, imports, simulation background jobs |
| **Scientific** | NumPy, SciPy, pandas | Latest | Industry standard numerical computing |
| **Auth** | JWT (python-jose) | -- | Bearer tokens, localStorage storage |
| **Container** | Docker Compose | -- | Local dev orchestration |

### 5.2 Architecture Diagram

```
[Browser] --> [Next.js Frontend :3000]
                |
                |--> API Proxy (rewrites /api/v1/* --> :8000)
                |
            [FastAPI Backend :8000]
                |
                |--> [PostgreSQL + TimescaleDB :5432]
                |--> [Redis :6379]
                |--> [Celery Workers]
```

### 5.3 Data Flow

1. **Auth**: Frontend sends credentials to `/api/v1/auth/login` -> Backend returns JWT -> Frontend stores in localStorage -> All subsequent requests include `Authorization: Bearer <token>`
2. **API Envelope**: All responses follow `{ status: "success"|"error", data: T, meta: { page, per_page, total, total_pages }, errors: [] }`
3. **Multi-tenancy**: Every domain table has `team_id`. Auto-created on registration. All queries scoped by team.
4. **API Proxy**: Next.js `rewrites` in `next.config.ts` proxy `/api/v1/*` to FastAPI, avoiding CORS issues

### 5.4 Database Schema (Phase 1)

**Core Tables:**
- `users` (UUID PK) - email, name, password_hash, is_active
- `teams` (UUID PK) - name, slug, owner_id, settings (JSONB)
- `team_memberships` - user_id, team_id, role (owner/admin/member/viewer)
- `accounts`, `sessions`, `verification_tokens` - Auth.js adapter tables
- `projects` (UUID PK) - team_id, name, description, created_by
- `wells` (UUID PK) - team_id, project_id, 30+ fields (identification, location, characteristics, dates, parameters, reservoir properties, tags ARRAY, custom_fields JSONB)
- `production_records` (well_id + production_date composite PK) - TimescaleDB hypertable, all rate/cumulative/pressure fields
- `dca_analyses` (UUID PK) - model_type, parameters (JSONB), fit metrics, EUR, monte_carlo_results (JSONB)
- `dca_forecast_points` (analysis_id + forecast_date PK) - time_months, rate, cumulative
- `import_jobs` (UUID PK) - file tracking, column mapping, progress, errors

---

## 6. DCA Calculation Engine (Scientific Core)

### 6.1 Decline Models

| Model | Equation | Parameters | Use Case |
|-------|----------|-----------|----------|
| **Exponential** (b=0) | `q(t) = qi * exp(-di * t)` | qi, di | Boundary-dominated flow, conservative EUR |
| **Hyperbolic** (0<b<1) | `q(t) = qi / (1 + b*di*t)^(1/b)` | qi, di, b | General decline, most common |
| **Harmonic** (b=1) | `q(t) = qi / (1 + di*t)` | qi, di | Water drive reservoirs |
| **Modified Hyperbolic** | Hyperbolic -> Exponential switch at d_min | qi, di, b, d_min | Industry standard for EUR estimation |
| **SEDM** | `q(t) = qi * exp(-(t/tau)^n)` | qi, tau, n | Always-finite EUR via Gamma function |
| **Duong** | `q(t) = qi * t^(-m) * exp(a/(1-m) * (t^(1-m) - 1))` | qi, a, m | Unconventional fracture-dominated flow |

### 6.2 Fitting Engine
- Primary: `scipy.optimize.curve_fit` with Trust Region Reflective (TRF) method
- Fallback: `scipy.optimize.differential_evolution` (global optimizer)
- Physics-informed initial guesses from data characteristics
- `auto_fit()`: Fits all 6 models, ranks by AIC (Akaike Information Criterion)

### 6.3 Monte Carlo EUR
- Parameter sampling: Normal, lognormal, uniform, triangular distributions
- Default 10,000 iterations (max 100,000)
- SPE/PRMS convention: P90 = 10th percentile (conservative), P10 = 90th percentile (optimistic)
- Runs as Celery background task for >1000 iterations

### 6.4 Diagnostics
- R-squared, Adjusted R-squared
- RMSE, NRMSE, MAE, MAPE
- AIC, BIC (model comparison)
- Durbin-Watson statistic (autocorrelation detection)

---

## 7. UI/UX Design Language

### 7.1 Design Principles
- **Professional and data-dense** - Bloomberg Terminal meets ComboCurve aesthetic
- **No AI aesthetic** - No emojis, no rounded pastel cards, no childish design
- **Dark mode default** - Near-black (#09090b / hsl(240, 10%, 3.9%)) with blue undertone
- **Engineering-focused** - Monospace fonts for numerical data, compact layouts
- **Responsive** - Collapsible sidebar on mobile, responsive grid layouts

### 7.2 Color System

| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--background` | `240 10% 3.9%` | Page background |
| `--card` | `240 10% 6%` | Card surfaces |
| `--primary` | `210 100% 52%` | Interactive elements, accent |
| `--destructive` | `0 62.8% 30.6%` | Errors, delete actions |
| `--chart-oil` | `25 95% 53%` (orange) | Oil data |
| `--chart-gas` | `0 72% 51%` (red) | Gas data |
| `--chart-water` | `210 100% 52%` (blue) | Water data |
| `--chart-forecast` | `142 71% 45%` (green) | Forecast/fit curves |

### 7.3 Typography
- **UI Text**: Inter (variable weight 300-700)
- **Numerical Data**: JetBrains Mono (monospace, for tables, rates, parameters)
- Loaded via `next/font/google` for optimal performance

### 7.4 Component Library
- Base: shadcn/ui (new-york style, zinc base)
- 24 primitives: button, input, card, dialog, dropdown-menu, table, tabs, select, form, sidebar, etc.
- All customized with PetroFlow's color tokens

---

## 8. API Endpoints (Phase 1)

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account + auto-create team |
| POST | `/api/v1/auth/login` | Get JWT access token |
| GET | `/api/v1/auth/me` | Current user profile |

### Wells
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wells` | List (paginated, filterable by project/status/basin/search) |
| POST | `/api/v1/wells` | Create |
| GET | `/api/v1/wells/{id}` | Detail |
| PUT | `/api/v1/wells/{id}` | Update |
| DELETE | `/api/v1/wells/{id}` | Soft delete |

### Production
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wells/{id}/production` | Get records (date range filter) |
| POST | `/api/v1/wells/{id}/production` | Batch upsert records |
| GET | `/api/v1/wells/{id}/production/statistics` | Aggregated stats |

### DCA
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wells/{id}/dca` | List analyses for well |
| POST | `/api/v1/wells/{id}/dca` | Create + fit model |
| GET | `/api/v1/wells/{id}/dca/{aid}` | Full analysis with forecast |
| PUT | `/api/v1/wells/{id}/dca/{aid}` | Update + re-fit |
| DELETE | `/api/v1/wells/{id}/dca/{aid}` | Delete |
| POST | `/api/v1/wells/{id}/dca/{aid}/monte-carlo` | Run MC (async Celery) |
| POST | `/api/v1/dca/auto-fit` | Fit all models, rank by AIC |

### Imports
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/imports/upload` | Upload file (multipart) |
| POST | `/api/v1/imports/{id}/mapping` | Submit column mapping |
| POST | `/api/v1/imports/{id}/execute` | Start import task |
| GET | `/api/v1/imports/{id}/status` | Poll progress |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create |
| GET | `/api/v1/projects/{id}` | Detail |
| PUT | `/api/v1/projects/{id}` | Update |
| DELETE | `/api/v1/projects/{id}` | Delete |

---

## 9. Frontend Routes (Phase 1)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to `/dashboard` |
| `/login` | Auth | Email + password login |
| `/register` | Auth | Account creation |
| `/dashboard` | Dashboard | KPI cards, recent wells, production summary |
| `/wells` | Well List | DataTable with search, filters, pagination |
| `/wells/new` | Well Create | Multi-section form (6 card sections) |
| `/wells/[id]` | Well Detail | Header + overview tab |
| `/wells/[id]/production` | Production | Charts (Recharts) + data table + stats |
| `/wells/[id]/dca` | DCA Workspace | 3-panel: controls, Plotly chart, results |
| `/wells/[id]/import` | Import | 3-step wizard (upload, mapping, preview) |
| `/projects` | Project List | Cards with create dialog |
| `/projects/[id]` | Project Detail | Filtered wells DataTable |
| `/settings` | Settings | Profile, preferences, team |

---

## 10. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Build** | Zero TypeScript/ESLint errors |
| **First Load JS** | < 300KB per route |
| **API Response** | < 200ms p95 for CRUD operations |
| **Monte Carlo** | 10,000 iterations in < 5 seconds |
| **Dark Mode** | Default, with light mode toggle |
| **Mobile** | Responsive (sidebar collapses) |
| **Browser** | Chrome, Firefox, Safari, Edge (latest 2 versions) |

---

## 11. Success Metrics

- Engineers can complete a full DCA analysis (import data -> fit model -> forecast -> EUR) in < 5 minutes
- Auto-fit ranks best model by AIC with R-squared > 0.95 on synthetic data
- Monte Carlo P10/P50/P90 converge within 2% of analytical solution at 10,000 iterations
- Community adoption: 100+ registered users within 3 months of launch
- Zero cost to end users for Phase 1 features (community edition)

---

## 12. Repository

- **GitHub**: https://github.com/obasi28/petroflow
- **Branch Strategy**: `main` (default, stable) -> `feat/*` (feature branches) -> PR to `main`
- **Local Path**: `C:\Users\eobasi.2NCJQ13\Desktop\Reservoir engineer app`
