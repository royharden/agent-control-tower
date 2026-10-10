/*
# Create runs and steps tables for Agent Control Tower demo

1. New Tables
- `runs`: stores each agent run — the user goal, which preset scenario was used,
  the planner mode (live LLM or mock), the full policy JSON applied, and a timestamp.
- `steps`: stores each proposed tool call within a run — the tool name and args,
  the planner's reason, the full Jev request and response, model used, latency,
  token usage, cost, the policy decision, the list of fired rules, execution status,
  and the simulated tool result string.

2. Security
- This is a no-auth single-tenant demo workspace. All data is intentionally public/shared.
- RLS enabled on both tables.
- Permissive anon + authenticated CRUD policies on both tables (4 policies each:
  SELECT, INSERT, UPDATE, DELETE) since the demo frontend uses the anon key with no login.

3. Relationship
- `steps.run_id` references `runs.id` with ON DELETE CASCADE so deleting a run
  also removes its steps.
*/

CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL,
  scenario text,
  planner_mode text NOT NULL DEFAULT 'mock',
  policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idx int NOT NULL,
  tool text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  jev_request jsonb,
  jev_response jsonb,
  model text,
  latency_ms int,
  input_tokens int,
  cost_usd numeric(12,6),
  decision text,
  fired_rules jsonb,
  status text NOT NULL DEFAULT 'pending',
  tool_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steps_run_id ON steps(run_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- runs policies (no-auth demo: permissive for anon + authenticated)
DROP POLICY IF EXISTS "anon_select_runs" ON runs;
CREATE POLICY "anon_select_runs" ON runs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_runs" ON runs;
CREATE POLICY "anon_insert_runs" ON runs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_runs" ON runs;
CREATE POLICY "anon_update_runs" ON runs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_runs" ON runs;
CREATE POLICY "anon_delete_runs" ON runs FOR DELETE
  TO anon, authenticated USING (true);

-- steps policies (no-auth demo: permissive for anon + authenticated)
DROP POLICY IF EXISTS "anon_select_steps" ON steps;
CREATE POLICY "anon_select_steps" ON steps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_steps" ON steps;
CREATE POLICY "anon_insert_steps" ON steps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_steps" ON steps;
CREATE POLICY "anon_update_steps" ON steps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_steps" ON steps;
CREATE POLICY "anon_delete_steps" ON steps FOR DELETE
  TO anon, authenticated USING (true);