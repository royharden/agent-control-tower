// ============ Core domain types ============

export type Decision = "allow" | "ask_human" | "block";
export type StepStatus = "executed" | "pending" | "approved" | "rejected" | "blocked";
export type PlannerMode = "live" | "mock";

// ---- Jev answer shapes ----

export interface NoulAnswer {
  type: "noul";
  noul: number; // 0..1
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities?: Record<string, string | number>;
}

export type JevAnswer = NoulAnswer | ScoreAnswer | ChoiceAnswer;

export interface JevAnswers {
  reversible: NoulAnswer;
  matches_goal: NoulAnswer;
  risk: ScoreAnswer;
  verdict: ChoiceAnswer;
}

export interface JevUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface JevResponse {
  answers: JevAnswers;
  model: string;
  usage: JevUsage;
  latency_ms: number;
  cost_usd: number;
  // "demo" = scripted verdict (no key, daily cap reached, or counter failure)
  source?: "live" | "demo";
  notice?: string;
}

export interface JevRequestBody {
  model: string;
  state: {
    user_goal: string;
    proposed_tool_call: { tool: string; args: Record<string, unknown> };
    tool_call_reason: string;
  };
  questions: Record<string, unknown>;
}

// ---- Policy ----

export interface Policy {
  minVerdictConfidence: number;
  blockConfidence: number;
  criticalRisk: number;
  goalFloor: number;
  reversibleMin: number;
  riskAsk: number;
  goalMin: number;
  autoAllowConfidence: number;
}

export type PolicyPreset = "Strict" | "Balanced" | "Permissive";

// ---- Decision output ----

export interface DecisionResult {
  decision: Decision;
  firedRules: string[];
}

// ---- Plan steps ----

export interface PlanStep {
  tool: string;
  args: Record<string, unknown>;
  reason: string;
}

export interface PlanResponse {
  steps: PlanStep[];
  source: "live" | "mock";
  notice?: string;
}

// ---- Run/Step DB records ----

export interface RunRecord {
  id: string;
  goal: string;
  scenario: string | null;
  planner_mode: PlannerMode;
  policy: Policy;
  created_at: string;
}

export interface StepRecord {
  id: string;
  run_id: string;
  idx: number;
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  jev_request: JevRequestBody | null;
  jev_response: JevResponse | null;
  model: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  cost_usd: number | null;
  decision: Decision | null;
  fired_rules: string[] | null;
  status: StepStatus;
  tool_result: string | null;
  jev_error: string | null;
  created_at: string;
}

// ---- Cost comparison constants ----

export interface CostConstants {
  judgeInputCostPerM: number;
  judgeOutputCostPerM: number;
  judgeInputTokenMultiplier: number;
  judgeOutputTokens: number;
}
