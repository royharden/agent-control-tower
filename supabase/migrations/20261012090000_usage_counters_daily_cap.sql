/*
# Daily usage cap for paid upstream calls

1. New Tables
- `usage_counters`: one row per (function name, UTC day) holding the number of
  paid upstream calls (OpenAI, TypeSafe). A special `app_total` row per day
  holds the app-wide total that the cap is enforced against.

2. New Functions
- `increment_usage(fn_name text, cap int default 200) returns int`:
  atomically bumps today's row for `fn_name` and today's `app_total` row, and
  returns the new `app_total` count, or -1 when that count is over `cap`.
  The cap is app-wide (200/day by default), not per function. Edge functions
  call this before every paid upstream fetch (each retry counts) and fail
  closed on -1, an error, or a null result.

3. Security
- RLS enabled on `usage_counters` with NO policies for anon/authenticated, and
  all table privileges revoked from anon/authenticated.
- `increment_usage` is SECURITY DEFINER with a pinned search_path. EXECUTE is
  revoked from PUBLIC/anon/authenticated and granted only to service_role, so
  only edge functions using the service-role key can call it.
*/

CREATE TABLE IF NOT EXISTS usage_counters (
  fn text NOT NULL,
  day date NOT NULL,
  calls int NOT NULL DEFAULT 0,
  PRIMARY KEY (fn, day)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON usage_counters FROM PUBLIC;
REVOKE ALL ON usage_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION increment_usage(fn_name text, cap int DEFAULT 200)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  total int;
BEGIN
  IF fn_name IS NULL OR fn_name = '' OR fn_name = 'app_total' OR length(fn_name) > 64 THEN
    RAISE EXCEPTION 'invalid fn_name';
  END IF;

  IF cap IS NULL OR cap < 0 THEN
    RAISE EXCEPTION 'invalid cap';
  END IF;

  -- App-wide total first: the row lock serializes concurrent callers.
  INSERT INTO usage_counters (fn, day, calls)
  VALUES ('app_total', today, 1)
  ON CONFLICT (fn, day) DO UPDATE SET calls = usage_counters.calls + 1
  RETURNING calls INTO total;

  INSERT INTO usage_counters (fn, day, calls)
  VALUES (fn_name, today, 1)
  ON CONFLICT (fn, day) DO UPDATE SET calls = usage_counters.calls + 1;

  IF total > cap THEN
    RETURN -1;
  END IF;

  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_usage(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(text, int) TO service_role;
