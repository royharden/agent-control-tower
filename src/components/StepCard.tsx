import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Coins,
  Cpu,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { StepRecord, JevAnswers } from "@/lib/types";
import { TOOL_DESCRIPTIONS } from "@/lib/scenarios";

interface StepCardProps {
  step: StepRecord;
  index: number;
  isLatest: boolean;
}

export function StepCard({ step, index, isLatest }: StepCardProps) {
  const [expanded, setExpanded] = useState(true);
  const decision = step.decision;
  const answers = step.jev_response?.answers;

  // The badge reflects the step's current status, not just the original
  // Jev decision — approved/rejected steps should show that state.
  const badgeInfo = (() => {
    switch (step.status) {
      case "executed":
        return { label: "Executed", icon: <CheckCircle2 className="w-3 h-3" />, bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
      case "approved":
        return { label: "Approved", icon: <CheckCircle2 className="w-3 h-3" />, bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
      case "rejected":
        return { label: "Rejected", icon: <XCircle className="w-3 h-3" />, bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" };
      case "blocked":
        return { label: "Blocked", icon: <XCircle className="w-3 h-3" />, bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" };
      case "pending":
        if (decision === "ask_human")
          return { label: "Needs Approval", icon: <AlertTriangle className="w-3 h-3" />, bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };
        if (decision === "block")
          return { label: "Blocked", icon: <XCircle className="w-3 h-3" />, bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" };
        if (decision === "allow")
          return { label: "Allowed", icon: <CheckCircle2 className="w-3 h-3" />, bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
        return { label: "Pending", icon: <Clock className="w-3 h-3" />, bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };
      default:
        return { label: "Pending", icon: <Clock className="w-3 h-3" />, bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };
    }
  })();

  const statusIcon = (status: StepRecord["status"]) => {
    switch (status) {
      case "executed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "approved":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "pending":
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case "rejected":
        return <XCircle className="w-3.5 h-3.5 text-zinc-500" />;
      case "blocked":
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`rounded-xl border bg-zinc-900/60 transition-all ${
        isLatest ? "border-sky-500/20 shadow-lg shadow-sky-500/5" : "border-zinc-800"
      } ${expanded ? "" : ""}`}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Step number */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400 shrink-0">
          {index + 1}
        </div>

        {/* Tool + args preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-sm font-mono font-semibold text-zinc-100 truncate">
              {step.tool}
            </span>
            <span className="text-xs text-zinc-600">
              {TOOL_DESCRIPTIONS[step.tool] ?? ""}
            </span>
          </div>
          <div className="text-xs text-zinc-500 truncate font-mono mt-0.5">
            {JSON.stringify(step.args)}
          </div>
        </div>

        {/* Status icon */}
        <div className="shrink-0">{statusIcon(step.status)}</div>

        {/* Status badge */}
        {badgeInfo && (
          <div
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}
          >
            {badgeInfo.icon}
            {badgeInfo.label}
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
          {/* Reason */}
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">
              Planner's reason
            </div>
            <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/40 rounded-lg px-3 py-2 border border-zinc-800/50">
              {step.reason || "—"}
            </div>
          </div>

          {/* Fired rules */}
          {step.fired_rules && step.fired_rules.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">
                Fired rules
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step.fired_rules.map((rule, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 font-mono"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Jev answers */}
          {answers && <JevAnswerDisplay answers={answers} />}

          {/* Metadata */}
          {step.jev_response && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {step.jev_response.model && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Cpu className="w-3 h-3" />
                  {step.jev_response.model}
                </span>
              )}
              {step.latency_ms != null && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {step.latency_ms} ms
                </span>
              )}
              {step.input_tokens != null && step.input_tokens > 0 && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Cpu className="w-3 h-3" />
                  {step.input_tokens} tok
                </span>
              )}
              {step.cost_usd != null && step.cost_usd > 0 && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Coins className="w-3 h-3" />${step.cost_usd.toFixed(6)}
                </span>
              )}
            </div>
          )}

          {/* Error toast */}
          {step.jev_error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">Jev check failed:</span>{" "}
                {step.jev_error}
              </span>
            </div>
          )}

          {/* Fallback error for blocked steps without jev_error */}
          {step.jev_response === null && step.status === "blocked" && !step.jev_error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Jev check could not be completed. This step was not executed.
            </div>
          )}

          {/* Tool result */}
          {step.tool_result && (
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">
                Tool result
              </div>
              <pre className="text-xs text-emerald-300/90 bg-emerald-500/5 rounded-lg px-3 py-2 border border-emerald-500/10 whitespace-pre-wrap font-mono leading-relaxed">
                {step.tool_result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Jev answer visualization ----

function JevAnswerDisplay({ answers }: { answers: JevAnswers }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {/* Noul: reversible */}
      <NoulBar
        label="reversible"
        noul={answers.reversible.noul}
        trueLabel="Undoable"
        falseLabel="Lasting effect"
      />
      {/* Noul: matches_goal */}
      <NoulBar
        label="matches_goal"
        noul={answers.matches_goal.noul}
        trueLabel="On-goal"
        falseLabel="Off-goal"
      />
      {/* Score: risk */}
      <ScoreDisplay answer={answers.risk} />
      {/* Choice: verdict */}
      <ChoiceDisplay answer={answers.verdict} />
    </div>
  );
}

function NoulBar({
  label,
  noul,
  trueLabel,
  falseLabel,
}: {
  label: string;
  noul: number;
  trueLabel: string;
  falseLabel: string;
}) {
  const pct = Math.round(noul * 100);
  const isTrue = noul > 0.5;
  const confidence = Math.abs(2 * noul - 1);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-zinc-400">
          {label}
        </span>
        <span className="text-xs text-zinc-500">
          noul: {noul.toFixed(2)}
        </span>
      </div>
      {/* Bar: 0 = false (left), 1 = true (right) */}
      <div className="relative h-6 rounded-md bg-zinc-800 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${isTrue ? "bg-emerald-500/30" : "bg-amber-500/30"}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-zinc-300">
            {isTrue ? trueLabel : falseLabel} ({pct}%)
          </span>
        </div>
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-zinc-600" />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
        <span>{falseLabel}</span>
        <span className="text-zinc-400">
          |2p-1| = {confidence.toFixed(2)}
        </span>
        <span>{trueLabel}</span>
      </div>
    </div>
  );
}

function ScoreDisplay({ answer }: { answer: JevAnswers["risk"] }) {
  const riskClasses = [
    "bg-emerald-500/15 text-emerald-400",
    "bg-amber-500/15 text-amber-400",
    "bg-orange-500/15 text-orange-400",
    "bg-red-500/15 text-red-400",
  ];
  const riskBarClasses = [
    "bg-emerald-500/40",
    "bg-amber-500/40",
    "bg-orange-500/40",
    "bg-red-500/40",
  ];
  const riskLabels = ["Low", "Medium", "High", "Critical"];
  const idx = Math.min(Math.floor(answer.score), 3);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-zinc-400">
          risk
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-200">
            {answer.score.toFixed(1)}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md ${riskClasses[idx]}`}
          >
            {riskLabels[idx]}
          </span>
          <span className="text-xs text-zinc-500">
            conf {answer.confidence.toFixed(2)}
          </span>
        </div>
      </div>
      {/* Probability bars */}
      {answer.probabilities &&
        Object.entries(answer.probabilities).map(([key, prob]) => {
          const p = typeof prob === "number" ? prob : parseFloat(prob);
          const i = parseInt(key);
          const barClass = riskBarClasses[Math.min(i, 3)];
          return (
            <div key={key} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-zinc-500 w-16 shrink-0">
                {riskLabels[i] ?? key}
              </span>
              <div className="flex-1 h-4 rounded bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full ${barClass} transition-all`}
                  style={{ width: `${Math.round(p * 100)}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 w-10 text-right">
                {(p * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}

function ChoiceDisplay({ answer }: { answer: JevAnswers["verdict"] }) {
  const verdictClasses: Record<string, string> = {
    allow: "bg-emerald-500/15 text-emerald-400",
    ask_human: "bg-amber-500/15 text-amber-400",
    block: "bg-red-500/15 text-red-400",
    uncertain: "bg-zinc-500/15 text-zinc-400",
  };
  const verdictBarClasses: Record<string, string> = {
    allow: "bg-emerald-500/40",
    ask_human: "bg-amber-500/40",
    block: "bg-red-500/40",
    uncertain: "bg-zinc-500/40",
  };
  const verdictIcons: Record<string, React.ReactNode> = {
    allow: <CheckCircle2 className="w-3 h-3" />,
    ask_human: <AlertTriangle className="w-3 h-3" />,
    block: <XCircle className="w-3 h-3" />,
    uncertain: <Clock className="w-3 h-3" />,
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-medium text-zinc-400">
          verdict
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${verdictClasses[answer.choice] ?? verdictClasses.uncertain}`}
          >
            {verdictIcons[answer.choice]}
            {answer.choice}
          </span>
          <span className="text-xs text-zinc-500">
            conf {answer.confidence.toFixed(2)}
          </span>
        </div>
      </div>
      {/* Probability bars */}
      {answer.probabilities &&
        Object.entries(answer.probabilities).map(([key, prob]) => {
          const p = typeof prob === "number" ? prob : parseFloat(prob);
          const barClass = verdictBarClasses[key] ?? verdictBarClasses.uncertain;
          return (
            <div key={key} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-zinc-500 w-20 shrink-0">
                {key}
              </span>
              <div className="flex-1 h-4 rounded bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full ${barClass} transition-all`}
                  style={{ width: `${Math.round(p * 100)}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 w-10 text-right">
                {(p * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
