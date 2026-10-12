import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type {
  PlanStep,
  PlanResponse,
  JevResponse,
  Policy,
  RunRecord,
  StepRecord,
  PlannerMode,
} from "./types";

const MAX_ERROR_CHARS = 300;

function truncate(text: string): string {
  return text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS)}…` : text;
}

// Calls an edge function through supabase-js so the anon key is sent as the
// bearer token (functions verify JWTs), and turns failures into readable errors.
async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let detail: string = error.message;
    let status = "";
    if (error instanceof FunctionsHttpError) {
      const resp = error.context as Response;
      status = ` (${resp.status})`;
      try {
        const errText = await resp.text();
        detail = errText || detail;
        try {
          const errJson = JSON.parse(errText);
          detail = errJson.error || errJson.detail || errJson.message || errText;
        } catch {
          // keep raw text
        }
      } catch {
        // keep error.message
      }
    }
    throw new Error(`${name} failed${status}: ${truncate(String(detail))}`);
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(`${name} error: ${truncate(String(data.error))}`);
  }
  return data as T;
}

async function runLog<T>(
  body: Record<string, unknown>,
  failure: string
): Promise<T> {
  try {
    return await invokeFunction<T>("run-log", body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${failure}: ${msg}`);
  }
}

export async function fetchPlan(
  goal: string,
  useMock: boolean
): Promise<PlanResponse> {
  return invokeFunction<PlanResponse>("plan", { goal, use_mock: useMock });
}

export async function callJev(
  userGoal: string,
  step: PlanStep
): Promise<JevResponse> {
  return invokeFunction<JevResponse>("jev-check", {
    user_goal: userGoal,
    tool: step.tool,
    args: step.args,
    tool_call_reason: step.reason,
  });
}

// ---- DB operations ----
// Writes go through the run-log edge function; reads use the anon key directly.

export async function createRun(
  goal: string,
  scenario: string | null,
  plannerMode: PlannerMode,
  policy: Policy
): Promise<RunRecord> {
  const { run } = await runLog<{ run: RunRecord }>(
    {
      action: "create_run",
      goal,
      scenario,
      planner_mode: plannerMode,
      policy,
    },
    "Failed to create run"
  );
  return run;
}

export async function createStep(
  runId: string,
  idx: number,
  tool: string,
  args: Record<string, unknown>,
  reason: string
): Promise<StepRecord> {
  const { step } = await runLog<{ step: StepRecord }>(
    {
      action: "create_step",
      run_id: runId,
      idx,
      tool,
      args,
      reason,
    },
    "Failed to create step"
  );
  return step;
}

export async function updateStep(
  stepId: string,
  updates: Partial<StepRecord>
): Promise<void> {
  await runLog<{ ok: true }>(
    { action: "update_step", step_id: stepId, updates },
    "Failed to update step"
  );
}

export async function fetchRuns(limit = 20): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to fetch runs: ${error.message}`);
  return (data ?? []) as RunRecord[];
}

export async function fetchStepsForRun(runId: string): Promise<StepRecord[]> {
  const { data, error } = await supabase
    .from("steps")
    .select("*")
    .eq("run_id", runId)
    .order("idx", { ascending: true });
  if (error) throw new Error(`Failed to fetch steps: ${error.message}`);
  return (data ?? []) as StepRecord[];
}

export async function fetchAllSteps(): Promise<StepRecord[]> {
  const { data, error } = await supabase
    .from("steps")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to fetch steps: ${error.message}`);
  return (data ?? []) as StepRecord[];
}
