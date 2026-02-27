# PetroFlow Task Tracker

## Completed
- [x] Merge Codex branch work into main development branch
- [x] Create CLAUDE.md with workflow orchestration instructions
- [x] Set up task management structure (todo.md, lessons.md)
- [x] Integrate user-provided skills (Impeccable Style) into the codebase
- [x] Fix well CSV import (wells not appearing after "successful" import)
- [x] Promote Projects above Wells in navigation hierarchy
- [x] Enrich project list cards with well/DCA count badges
- [x] Add project-scoped well import and creation flow
- [x] Backend: batch project summaries endpoint
- [x] Backend: accept project_id in well import, improve error logging

- [x] Fix well edit - create edit page, wire up Edit button and table action
- [x] Add Multi-Well Analysis page with well selection and comparison
- [x] Enhance well dashboard cards - show well metadata + expanded production stats
- [x] Enhance general dashboard - client-side KPIs, basin/status distributions

## Backlog
<!-- Add planned tasks here -->

## Review
### Well Import Fix (2026-02-25)
- Root cause: `invalidateQueries` does not await refetch; redirect fires before cache refreshes
- Fix: switched to `refetchQueries` + added "results" step before navigation
- Also added `project_id` form param to backend for project-scoped imports

### Bug Fixes & Dashboard Enhancement (2026-02-26)
- Well Edit: created `/wells/[wellId]/edit` page reusing WellForm with defaultValues
- Well Header: Edit button now links to edit page (was dead button)
- Well Table: Edit action links to `/edit` not `/` (was same as View)
- Multi-Well Analysis: new `/analysis` page with well checkbox selection, comparison table, production/DCA cards
- Navigation: added "Multi-Well Analysis" with BarChart3 icon to sidebar
- Well Stats: expanded from 4 to 12 cards (8 production + 4 metadata), shows useful data even without production records
- Dashboard: added secondary KPI row (projects, basins, horizontal, type), basin & status distributions
- All KPIs use client-side computation from wells array as reliable fallback

### Project Hierarchy (2026-02-25)
- Reordered nav: Dashboard > Projects > Wells
- Project cards now show well count + DCA count badges via batch `/projects/summaries` endpoint
- Project detail page has "Import Wells" and "New Well" action buttons
- New `/projects/[projectId]/import-wells` route for project-scoped import
- `/wells/new?project_id=X` pre-fills project selector
