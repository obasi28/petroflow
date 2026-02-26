# Lessons Learned

## Patterns & Rules
<!-- After ANY correction from the user, document the pattern here -->
<!-- Format: Date | Context | Mistake | Rule to prevent recurrence -->

## Debugging Insights
<!-- Solutions to recurring problems -->

### 2026-02-25 | asyncpg requires native Python date objects
- **Problem**: Well CSV import failed with `'str' object has no attribute 'toordinal'` on date columns
- **Root Cause**: `transform_well_data()` in `import_service.py` converted dates to ISO strings (`parsed_date.isoformat()`) but asyncpg's binary protocol expects `datetime.date` objects, not strings. The sync driver `psycopg2` auto-coerces strings, but `asyncpg` does not.
- **Fix**: Changed `record[target_field] = parsed_date.isoformat()` → `record[target_field] = parsed_date`
- **Rule**: When using asyncpg, ALWAYS pass native Python types (date, datetime, UUID, etc.) — never pass string representations.

### 2026-02-25 | pg_hba.conf IPv4 vs IPv6 trust mismatch
- **Problem**: `psql -h localhost` prompted for password even though 127.0.0.1 had trust auth
- **Root Cause**: localhost resolves to `::1` (IPv6) first on Windows, and pg_hba.conf had `trust` for `127.0.0.1/32` but `scram-sha-256` for `::1/128`
- **Fix**: Changed `::1/128` to `trust` and reloaded via `SELECT pg_reload_conf()` using IPv4 connection
- **Rule**: When setting pg_hba.conf trust auth, always set BOTH IPv4 and IPv6 localhost entries

## Architecture Decisions
<!-- Key decisions and their rationale -->
