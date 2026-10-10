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

const FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${FUNCTION_URL}/functions/v1/${name}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ANON_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let errDetail = errText;
    try {
      const errJson = JSON.parse(errText);
      errDetail = errJson.error || errJson.detail || errText;
    } catch {
      // keep raw text
    }
    throw new Error(`${name} failed (${resp.status}): ${errDetail}`);
  }

  const data = await resp.json();
  if (data.error) {
    throw new Error(`${name} error: ${data.error}`);
  }
  return data as T;
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

export async function createRun(
  goal: string,
  scenario: string | null,
  plannerMode: PlannerMode,
  policy: Policy
): Promise<RunRecord> {
  const { data, error } = await supabase
    .from("runs")
    .insert({
      goal,
      scenario,
      planner_mode: plannerMode,
      policy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create run: ${error.message}`);
  return data as RunRecord;
}

export async function createStep(
  runId: string,
  idx: number,
  tool: string,
  args: Record<string, unknown>,
  reason: string
): Promise<StepRecord> {
  const { data, error } = await supabase
    .from("steps")
    .insert({
      run_id: runId,
      idx,
      tool,
      args,
      reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create step: ${error.message}`);
  return data as StepRecord;
}

export async function updateStep(
  stepId: string,
  updates: Partial<StepRecord>
): Promise<void> {
  const { error } = await supabase
    .from("steps")
    .update(updates)
    .eq("id", stepId);
  if (error) throw new Error(`Failed to update step: ${error.message}`);
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
