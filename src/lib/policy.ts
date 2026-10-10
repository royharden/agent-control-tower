import type { JevAnswers, Policy, PolicyPreset, DecisionResult, Decision } from "./types";

export const POLICY_PRESETS: Record<PolicyPreset, Policy> = {
  Strict: {
    minVerdictConfidence: 0.8,
    blockConfidence: 0.5,
    criticalRisk: 2.0,
    goalFloor: 0.4,
    reversibleMin: 0.7,
    riskAsk: 1.0,
    goalMin: 0.8,
    autoAllowConfidence: 0.9,
  },
  Balanced: {
    minVerdictConfidence: 0.6,
    blockConfidence: 0.7,
    criticalRisk: 2.5,
    goalFloor: 0.3,
    reversibleMin: 0.5,
    riskAsk: 1.5,
    goalMin: 0.6,
    autoAllowConfidence: 0.8,
  },
  Permissive: {
    minVerdictConfidence: 0.4,
    blockConfidence: 0.85,
    criticalRisk: 3.0,
    goalFloor: 0.2,
    reversibleMin: 0.3,
    riskAsk: 2.5,
    goalMin: 0.4,
    autoAllowConfidence: 0.6,
  },
};

export const DEFAULT_POLICY: Policy = POLICY_PRESETS.Balanced;

function noulToConfidence(noul: number): number {
  return Math.abs(2 * noul - 1);
}

/**
 * decide() — pure function that maps Jev answers + policy thresholds
 * to a routing decision (allow / ask_human / block) plus the list of
 * rules that fired. Precedence: block > ask_human > allow.
 */
export function decide(answers: JevAnswers, policy: Policy): DecisionResult {
  const firedRules: string[] = [];
  const verdict = answers.verdict;
  const risk = answers.risk;
  const reversible = answers.reversible;
  const matchesGoal = answers.matches_goal;

  const reversibleConf = noulToConfidence(reversible.noul);
  const reversibleTrue = reversible.noul > 0.5;
  const matchesGoalConf = noulToConfidence(matchesGoal.noul);
  const matchesGoalTrue = matchesGoal.noul > 0.5;

  // ---- Block rules ----
  let block = false;

  if (verdict.choice === "block" && verdict.confidence >= policy.blockConfidence) {
    firedRules.push(
      `verdict=block (conf ${verdict.confidence.toFixed(2)} >= blockConfidence ${policy.blockConfidence})`
    );
    block = true;
  }

  if (
    risk.score >= policy.criticalRisk &&
    matchesGoal.noul < policy.goalFloor
  ) {
    firedRules.push(
      `critical risk (score ${risk.score.toFixed(1)} >= ${policy.criticalRisk}) AND matches_goal ${matchesGoal.noul.toFixed(2)} < goalFloor ${policy.goalFloor}`
    );
    block = true;
  }

  if (block) return { decision: "block", firedRules };

  // ---- Ask-human rules ----
  let askHuman = false;

  if (verdict.choice === "uncertain") {
    firedRules.push("verdict=uncertain");
    askHuman = true;
  }

  if (verdict.choice === "ask_human") {
    firedRules.push("verdict=ask_human");
    askHuman = true;
  }

  if (verdict.confidence < policy.minVerdictConfidence) {
    firedRules.push(
      `verdict confidence ${verdict.confidence.toFixed(2)} < minVerdictConfidence ${policy.minVerdictConfidence}`
    );
    askHuman = true;
  }

  if (!reversibleTrue || reversibleConf < policy.reversibleMin) {
    firedRules.push(
      `reversible noul ${reversible.noul.toFixed(2)} (conf ${reversibleConf.toFixed(2)}) — below reversibleMin ${policy.reversibleMin}`
    );
    askHuman = true;
  }

  if (risk.score >= policy.riskAsk) {
    firedRules.push(
      `risk score ${risk.score.toFixed(1)} >= riskAsk ${policy.riskAsk}`
    );
    askHuman = true;
  }

  if (!matchesGoalTrue || matchesGoalConf < policy.goalMin) {
    firedRules.push(
      `matches_goal noul ${matchesGoal.noul.toFixed(2)} (conf ${matchesGoalConf.toFixed(2)}) — below goalMin ${policy.goalMin}`
    );
    askHuman = true;
  }

  if (askHuman) return { decision: "ask_human", firedRules };

  // ---- Allow ----
  if (
    verdict.choice === "allow" &&
    verdict.confidence >= policy.autoAllowConfidence
  ) {
    firedRules.push(
      `verdict=allow (conf ${verdict.confidence.toFixed(2)} >= autoAllowConfidence ${policy.autoAllowConfidence})`
    );
    return { decision: "allow", firedRules };
  }

  // Default fallback — ask human
  firedRules.push("no allow rule fired — defaulting to ask_human");
  return { decision: "ask_human", firedRules };
}

export const DECISION_COLORS: Record<Decision, { bg: string; text: string; border: string; label: string }> = {
  allow: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "Allowed",
  },
  ask_human: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    label: "Needs Approval",
  },
  block: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "Blocked",
  },
};
