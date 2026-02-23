# PetroFlow Multi-Agent Execution Plan

## Objective
Continue building from the isolated worktree while preserving existing repo patterns and minimizing merge conflicts across parallel agents.

## Current Baseline
- Worktree: `C:\Users\eobasi.2NCJQ13\Desktop\Reservoir engineer app-codex`
- Branch: `codex/isolation-20260223`
- Product stage: Phase 1 mostly implemented, but key integration gaps remain.

## Observed Code Patterns To Preserve
- Backend:
  - FastAPI endpoints in `backend/app/api/v1/endpoints/*.py`
  - Business logic extracted into `backend/app/services/*.py` where practical
  - API envelope: `success_response(...)` / `paginated_response(...)`
  - Team scoping via `current_user.team_id`
  - SQLAlchemy async sessions from `get_db`
- Frontend:
  - Data access via `frontend/src/hooks/*` + `frontend/src/lib/api-client.ts`
  - Global client state in Zustand stores
  - UI built with shadcn/ui primitives
  - Route pages orchestrate, components render
- Scientific engine:
  - Model modules in `backend/app/engine/dca/*`
  - Deterministic and Monte Carlo logic isolated from API layer

## High-Priority Gaps (Fix First)
1. Import flow contract mismatch:
   - Frontend expects upload+map+import in one path
   - Backend `/imports/upload` currently only parses preview metadata
2. Monte Carlo contract mismatch:
   - Frontend sends `distribution`, backend expects `type`
   - Backend task result is not persisted to `dca_analyses.monte_carlo_results`
3. Auth guard not enforced in dashboard layout:
   - `AuthGuard` exists but is not wired into protected routes
4. DCA list/detail mismatch:
   - list endpoint does not return forecast points used by UI after reload
5. Missing migration/test baseline:
   - No Alembic versions
   - No backend tests for DCA/endpoint contracts

## Agent Workstreams

### Agent A: API Contract Stabilization (Backend + Types)
- Scope:
  - Normalize Monte Carlo payload/response contract
  - Normalize import API contract to match PRD (upload -> mapping -> execute -> status) or adjust frontend to current API
  - Add/align missing DCA update endpoint contract if staying in Phase 1 parity
- Files:
  - `backend/app/api/v1/endpoints/dca.py`
  - `backend/app/api/v1/endpoints/imports.py`
  - `backend/app/schemas/dca.py`
  - `frontend/src/types/dca.ts`
  - `frontend/src/types/api.ts` (if envelope typing changes)
- Out of scope:
  - UI redesign
  - New engineering modules (Phase 2)
- Acceptance:
  - End-to-end payload compatibility for create DCA, auto-fit, Monte Carlo, import

### Agent B: Import Pipeline Completion
- Scope:
  - Implement production import execution path
  - Persist imported rows into `production_records`
  - Wire background task for large files (optional threshold)
- Files:
  - `backend/app/services/import_service.py`
  - `backend/app/tasks/import_tasks.py`
  - `backend/app/api/v1/endpoints/imports.py`
  - `frontend/src/components/production/import-wizard.tsx`
  - `frontend/src/hooks/use-production.ts`
- Out of scope:
  - New file formats beyond CSV/XLS/XLSX
- Acceptance:
  - Importing sample CSV populates production tab successfully

### Agent C: DCA UX/Data Consistency
- Scope:
  - Ensure analysis reload shows fit + forecast consistently
  - Persist and display Monte Carlo results once task completes
  - Fix invalidations/query keys around DCA routes
- Files:
  - `frontend/src/app/(dashboard)/wells/[wellId]/dca/page.tsx`
  - `frontend/src/hooks/use-dca.ts`
  - `frontend/src/stores/dca-store.ts`
  - `frontend/src/components/dca/*`
- Out of scope:
  - New DCA models
- Acceptance:
  - Reloading DCA page preserves usable analysis view with forecast/metrics

### Agent D: Auth + Route Protection + Session Ergonomics
- Scope:
  - Enforce protected dashboard routes with existing auth strategy
  - Stabilize auth bootstrap and redirect behavior
- Files:
  - `frontend/src/components/auth/auth-guard.tsx`
  - `frontend/src/app/(dashboard)/layout.tsx`
  - `frontend/src/lib/auth.ts`
  - `frontend/src/lib/api-client.ts`
  - `frontend/src/middleware.ts` (only if needed)
- Out of scope:
  - Switching to cookie-based auth
- Acceptance:
  - Unauthenticated users cannot use dashboard routes

### Agent E: Migration + Test Foundation
- Scope:
  - Create initial Alembic migration(s)
  - Add backend tests for DCA fitting/forecast + key endpoint contracts
- Files:
  - `backend/alembic/versions/*`
  - `backend/tests/*`
  - `backend/pyproject.toml` (if test deps need correction)
- Out of scope:
  - Full frontend test suite
- Acceptance:
  - `alembic upgrade head` works from clean DB
  - `pytest` runs with meaningful test coverage for core flows

## Parallelization and Merge Safety
- Agent branch naming:
  - `agent/contract-stabilization`
  - `agent/import-pipeline`
  - `agent/dca-consistency`
  - `agent/auth-protection`
  - `agent/migrations-tests`
- Avoid overlap by file ownership above.
- Rebase each agent branch onto `codex/isolation-20260223` before merge.

## Integration Order
1. Agent A (contracts) merge first
2. Agent B + Agent C in parallel after A
3. Agent D in parallel with B/C
4. Agent E after A (can run in parallel with B/C/D, but final rebase required)

## Immediate Next Build Step
Start with Agent A work in this worktree:
- Fix Monte Carlo payload key mismatch and result persistence strategy
- Align import endpoint behavior with frontend workflow

