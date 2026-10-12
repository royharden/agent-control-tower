import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Persists runs and steps for the demo. The anon role can only SELECT from
// `runs`/`steps`; every write goes through here with the service-role key,
// with whitelisted columns, allowed status/decision values and size caps.
// Writes do not count against the daily AI cap.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Supabase URL and key come from env only — never from the request.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Request size caps
const MAX_BODY_BYTES = 32 * 1024;
const MAX_GOAL_CHARS = 500;
const MAX_SCENARIO_CHARS = 100;
const MAX_TOOL_CHARS = 64;
const MAX_REASON_CHARS = 1000;
const MAX_ARGS_JSON_CHARS = 4000;
const MAX_STEP_IDX = 49;
const MAX_JEV_RESPONSE_JSON_CHARS = 16000;
const MAX_MODEL_CHARS = 64;
const MAX_FIRED_RULES = 20;
const MAX_RULE_CHARS = 1000;
const MAX_TOOL_RESULT_CHARS = 4000;
const MAX_JEV_ERROR_CHARS = 1000;
const MAX_POLICY_VALUE = 10;

const PLANNER_MODES = ["live", "mock"] as const;
const STEP_STATUSES = ["executed", "pending", "approved", "rejected", "blocked"] as const;
const DECISIONS = ["allow", "ask_human", "block"] as const;
const POLICY_KEYS = [
  "minVerdictConfidence",
  "blockConfidence",
  "criticalRisk",
  "goalFloor",
  "reversibleMin",
  "riskAsk",
  "goalMin",
  "autoAllowConfidence",
] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bad(message: string): never {
  throw new HttpError(400, message);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Reads the body as JSON, refusing anything over maxBytes.
async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const tooLarge = () => new HttpError(413, `Request body too large (max ${maxBytes} bytes)`);
  if (Number(req.headers.get("content-length") ?? "0") > maxBytes) throw tooLarge();
  if (!req.body) throw new HttpError(400, "Request body is required");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

// ---- Field validators ----

function str(v: unknown, field: string, max: number, allowEmpty = false): string {
  if (typeof v !== "string") bad(`${field} must be a string`);
  if (!allowEmpty && !v.trim()) bad(`${field} is required`);
  if (v.length > max) bad(`${field} must be at most ${max} characters`);
  return v;
}

function nullableStr(v: unknown, field: string, max: number): string | null {
  return v === null ? null : str(v, field, max, true);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    bad(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return v as T;
}

function int(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    bad(`${field} must be an integer between ${min} and ${max}`);
  }
  return v;
}

function num(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    bad(`${field} must be a number between ${min} and ${max}`);
  }
  return v;
}

function jsonObject(v: unknown, field: string, maxChars: number): Record<string, unknown> {
  if (!isPlainObject(v)) bad(`${field} must be an object`);
  if (JSON.stringify(v).length > maxChars) {
    bad(`${field} must be at most ${maxChars} characters of JSON`);
  }
  return v;
}

function uuid(v: unknown, field: string): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) bad(`${field} must be a UUID`);
  return v;
}

function firedRules(v: unknown): string[] {
  if (!Array.isArray(v)) bad("fired_rules must be an array of strings");
  if (v.length > MAX_FIRED_RULES) bad(`fired_rules must have at most ${MAX_FIRED_RULES} items`);
  return v.map((rule, i) => str(rule, `fired_rules[${i}]`, MAX_RULE_CHARS, true));
}

function policy(v: unknown): Record<string, number> {
  if (!isPlainObject(v)) bad("policy must be an object");
  // Only known keys are stored; anything else is dropped.
  const out: Record<string, number> = {};
  for (const key of POLICY_KEYS) {
    out[key] = num(v[key], `policy.${key}`, 0, MAX_POLICY_VALUE);
  }
  return out;
}

// Columns the client may change on an existing step, with their validators.
const STEP_UPDATE_FIELDS: Record<string, (v: unknown) => unknown> = {
  status: (v) => oneOf(v, STEP_STATUSES, "status"),
  decision: (v) => (v === null ? null : oneOf(v, DECISIONS, "decision")),
  fired_rules: (v) => (v === null ? null : firedRules(v)),
  jev_response: (v) =>
    v === null ? null : jsonObject(v, "jev_response", MAX_JEV_RESPONSE_JSON_CHARS),
  model: (v) => nullableStr(v, "model", MAX_MODEL_CHARS),
  latency_ms: (v) => (v === null ? null : int(v, "latency_ms", 0, 600_000)),
  input_tokens: (v) => (v === null ? null : int(v, "input_tokens", 0, 10_000_000)),
  cost_usd: (v) => (v === null ? null : num(v, "cost_usd", 0, 1000)),
  tool_result: (v) => nullableStr(v, "tool_result", MAX_TOOL_RESULT_CHARS),
  jev_error: (v) => nullableStr(v, "jev_error", MAX_JEV_ERROR_CHARS),
};

function dbError(op: string, error: { message: string; code?: string }): never {
  console.error(`${op} failed:`, error.code, error.message);
  if (error.code === "23503") throw new HttpError(404, "run not found");
  throw new HttpError(500, `Failed to ${op}`);
}

// ---- Actions ----

async function createRun(body: Record<string, unknown>) {
  const row = {
    goal: str(body.goal, "goal", MAX_GOAL_CHARS),
    scenario: body.scenario == null ? null : str(body.scenario, "scenario", MAX_SCENARIO_CHARS),
    planner_mode: oneOf(body.planner_mode, PLANNER_MODES, "planner_mode"),
    policy: policy(body.policy),
  };

  const { data, error } = await admin!.from("runs").insert(row).select().single();
  if (error) dbError("create run", error);
  return { run: data };
}

async function createStep(body: Record<string, unknown>) {
  const row = {
    run_id: uuid(body.run_id, "run_id"),
    idx: int(body.idx, "idx", 0, MAX_STEP_IDX),
    tool: str(body.tool, "tool", MAX_TOOL_CHARS),
    args: body.args === undefined ? {} : jsonObject(body.args, "args", MAX_ARGS_JSON_CHARS),
    reason: body.reason == null ? "" : str(body.reason, "reason", MAX_REASON_CHARS, true),
    status: "pending",
  };

  const { data, error } = await admin!.from("steps").insert(row).select().single();
  if (error) dbError("create step", error);
  return { step: data };
}

async function updateStep(body: Record<string, unknown>) {
  const stepId = uuid(body.step_id, "step_id");
  if (!isPlainObject(body.updates)) bad("updates must be an object");

  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body.updates)) {
    if (!Object.hasOwn(STEP_UPDATE_FIELDS, key)) bad(`updates.${key} is not allowed`);
    row[key] = STEP_UPDATE_FIELDS[key](value);
  }
  if (Object.keys(row).length === 0) bad("updates must not be empty");

  const { data, error } = await admin!.from("steps").update(row).eq("id", stepId).select("id");
  if (error) dbError("update step", error);
  if (!data || data.length === 0) throw new HttpError(404, "step not found");
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!admin) throw new HttpError(500, "run-log is not configured");

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if (!isPlainObject(body)) bad("Request body must be a JSON object");

    switch (body.action) {
      case "create_run":
        return json(await createRun(body));
      case "create_step":
        return json(await createStep(body));
      case "update_step":
        return json(await updateStep(body));
      default:
        bad("action must be one of: create_run, create_step, update_step");
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: err.message }, err.status);
    }
    console.error("run-log failed:", err);
    return json({ error: "Internal error" }, 500);
  }
});
