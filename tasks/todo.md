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

## Backlog
<!-- Add planned tasks here -->

## Review
### Well Import Fix (2026-02-25)
- Root cause: `invalidateQueries` does not await refetch; redirect fires before cache refreshes
- Fix: switched to `refetchQueries` + added "results" step before navigation
- Also added `project_id` form param to backend for project-scoped imports

### Project Hierarchy (2026-02-25)
- Reordered nav: Dashboard > Projects > Wells
- Project cards now show well count + DCA count badges via batch `/projects/summaries` endpoint
- Project detail page has "Import Wells" and "New Well" action buttons
- New `/projects/[projectId]/import-wells` route for project-scoped import
- `/wells/new?project_id=X` pre-fills project selector
