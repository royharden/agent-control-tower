/*
# Add jev_error column to steps table

1. Modified Tables
- `steps`: adds `jev_error` text column (nullable) to store readable error
  messages when a Jev API call fails (401/422/429 etc). This is shown as a
  toast on the step card instead of the generic "could not be completed" message.

2. Security
- No RLS policy changes needed — existing permissive policies cover the new column.
*/

ALTER TABLE steps ADD COLUMN IF NOT EXISTS jev_error text;
