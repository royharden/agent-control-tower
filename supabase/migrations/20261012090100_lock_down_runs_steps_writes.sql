/*
# Lock down writes on runs and steps

1. Security
- Drops the permissive anon/authenticated INSERT, UPDATE and DELETE policies
  on `runs` and `steps`. The `anon_select_*` policies are kept, so the
  frontend can still read run history with the anon key.
- Revokes every table privilege except SELECT from anon/authenticated as
  defense in depth (TRUNCATE is not covered by RLS).
- All writes now go through the `run-log` edge function, which uses the
  service-role key and whitelists columns, status/decision values and sizes.
*/

DROP POLICY IF EXISTS "anon_insert_runs" ON runs;
DROP POLICY IF EXISTS "anon_update_runs" ON runs;
DROP POLICY IF EXISTS "anon_delete_runs" ON runs;

DROP POLICY IF EXISTS "anon_insert_steps" ON steps;
DROP POLICY IF EXISTS "anon_update_steps" ON steps;
DROP POLICY IF EXISTS "anon_delete_steps" ON steps;

REVOKE ALL ON runs, steps FROM anon, authenticated;
GRANT SELECT ON runs, steps TO anon, authenticated;
