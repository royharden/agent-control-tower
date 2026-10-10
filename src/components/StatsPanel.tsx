import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BarChart3, Clock, Coins, History, Settings2 } from "lucide-react";
import { useState } from "react";
import type { StepRecord, RunRecord, CostConstants } from "@/lib/types";

interface StatsPanelProps {
  steps: StepRecord[];
  pastRuns: RunRecord[];
  costConstants: CostConstants;
  onCostConstantsChange: (c: CostConstants) => void;
  onSelectRun: (runId: string) => void;
  activeRunId: string | null;
}

const DECISION_COLORS_MAP: Record<string, string> = {
  allow: "#10b981",
  ask_human: "#f59e0b",
  block: "#ef4444",
};

export function StatsPanel({ steps, pastRuns, costConstants, onCostConstantsChange, onSelectRun, activeRunId }: StatsPanelProps) {
  const [showCostSettings, setShowCostSettings] = useState(false);
  const counts = useMemo(() => {
    const c = { allow: 0, ask_human: 0, block: 0 };
    for (const s of steps) {
      if (s.decision) c[s.decision]++;
    }
    return c;
  }, [steps]);

  const donutData = [
    { name: "Allowed", value: counts.allow, color: DECISION_COLORS_MAP.allow },
    { name: "Escalated", value: counts.ask_human, color: DECISION_COLORS_MAP.ask_human },
    { name: "Blocked", value: counts.block, color: DECISION_COLORS_MAP.block },
  ].filter((d) => d.value > 0);

  const avgLatency = useMemo(() => {
    const latencies = steps
      .filter((s) => s.latency_ms != null && s.latency_ms > 0)
      .map((s) => s.latency_ms!);
    if (latencies.length === 0) return 0;
    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }, [steps]);

  const totalJevCost = useMemo(() => {
    return steps.reduce((sum, s) => sum + (s.cost_usd ?? 0), 0);
  }, [steps]);

  const estimatedJudgeCost = useMemo(() => {
    const totalInputTokens = steps.reduce(
      (sum, s) => sum + (s.input_tokens ?? 0),
      0
    );
    const judgeInputTokens = Math.round(totalInputTokens * costConstants.judgeInputTokenMultiplier);
    const judgeOutputTokens = steps.length * costConstants.judgeOutputTokens;
    const inputCost = (judgeInputTokens / 1_000_000) * costConstants.judgeInputCostPerM;
    const outputCost = (judgeOutputTokens / 1_000_000) * costConstants.judgeOutputCostPerM;
    return inputCost + outputCost;
  }, [steps, costConstants]);

  const hasData = steps.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Stats</h3>
      </div>

      {!hasData ? (
        <p className="text-xs text-zinc-500 py-4 text-center">
          No data yet. Run a scenario to see stats.
        </p>
      ) : (
        <>
          {/* Donut chart */}
          {donutData.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-medium text-zinc-500 mb-2">
                Decisions
              </div>
              <div className="relative h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#e4e4e7",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-1">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: d.color }}
                    />
                    <span className="text-xs text-zinc-400">
                      {d.name}: {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latency + cost */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                <Clock className="w-3 h-3" />
                Avg Jev latency
              </div>
              <div className="text-lg font-semibold text-zinc-100">
                {avgLatency} <span className="text-sm text-zinc-500">ms</span>
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                <Coins className="w-3 h-3" />
                Total Jev cost
              </div>
              <div className="text-lg font-semibold text-zinc-100">
                ${totalJevCost.toFixed(6)}
              </div>
            </div>
          </div>

          {/* Cost comparison bar */}
          <div className="mb-4">
            <div className="text-xs font-medium text-zinc-500 mb-2">
              Jev cost vs. estimated LLM-judge cost
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Jev", cost: totalJevCost },
                    { name: "LLM Judge", cost: estimatedJudgeCost },
                  ]}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e4e4e7",
                    }}
                    formatter={(v) => [`${Number(v).toFixed(6)}`, "Cost"]}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#a78bfa" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost constants editor */}
          <div className="mb-4">
            <button
              onClick={() => setShowCostSettings(!showCostSettings)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              {showCostSettings ? "Hide" : "Edit"} judge cost assumptions
            </button>
            {showCostSettings && (
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                {([
                  ["judgeInputCostPerM", "Input $/M", 0.01, 100],
                  ["judgeOutputCostPerM", "Output $/M", 0.01, 100],
                  ["judgeInputTokenMultiplier", "Input token mult", 0.5, 5],
                  ["judgeOutputTokens", "Output tokens/check", 0, 1000],
                ] as const).map(([key, label, min, max]) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500 w-32 shrink-0">{label}</label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={key === "judgeOutputTokens" ? 10 : 0.01}
                      value={costConstants[key]}
                      onChange={(e) =>
                        onCostConstantsChange({
                          ...costConstants,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Past runs */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-2">
          <History className="w-3.5 h-3.5" />
          Past runs
        </div>
        {pastRuns.length === 0 ? (
          <p className="text-xs text-zinc-600">No past runs.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {pastRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={`w-full text-left text-xs rounded-lg border px-2.5 py-2 transition-all ${
                  activeRunId === run.id
                    ? "border-sky-500/40 bg-sky-500/10"
                    : "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                }`}
              >
                <div className={`truncate font-medium ${activeRunId === run.id ? "text-sky-300" : "text-zinc-300"}`}>
                  {run.goal}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-zinc-600">
                  <span>
                    {new Date(run.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-500">
                    {run.planner_mode}
                  </span>
                  {run.scenario && (
                    <span className="text-zinc-600">— {run.scenario}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
