import { Sliders, Shield, RotateCw } from "lucide-react";
import type { Policy, PolicyPreset } from "@/lib/types";
import { POLICY_PRESETS } from "@/lib/policy";

interface PolicyPanelProps {
  policy: Policy;
  onPolicyChange: (policy: Policy) => void;
  onPreset: (preset: PolicyPreset) => void;
  onReevaluate: () => void;
  canReevaluate: boolean;
}

const SLIDER_CONFIG: {
  key: keyof Policy;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}[] = [
  { key: "minVerdictConfidence", label: "Min Verdict Confidence", min: 0, max: 1, step: 0.05, hint: "Below this or verdict=uncertain → ask_human" },
  { key: "blockConfidence", label: "Block Confidence", min: 0, max: 1, step: 0.05, hint: "verdict=block with conf ≥ this → block" },
  { key: "criticalRisk", label: "Critical Risk", min: 0, max: 4, step: 0.25, hint: "risk.score ≥ this AND matches_goal < goalFloor → block" },
  { key: "goalFloor", label: "Goal Floor", min: 0, max: 1, step: 0.05, hint: "Threshold for critical-risk block rule" },
  { key: "reversibleMin", label: "Reversible Min", min: 0, max: 1, step: 0.05, hint: "reversible confidence < this → ask_human" },
  { key: "riskAsk", label: "Risk Ask", min: 0, max: 4, step: 0.25, hint: "risk.score ≥ this → ask_human" },
  { key: "goalMin", label: "Goal Min", min: 0, max: 1, step: 0.05, hint: "matches_goal confidence < this → ask_human" },
  { key: "autoAllowConfidence", label: "Auto-Allow Confidence", min: 0, max: 1, step: 0.05, hint: "verdict=allow with conf ≥ this → allow" },
];

export function PolicyPanel({
  policy,
  onPolicyChange,
  onPreset,
  onReevaluate,
  canReevaluate,
}: PolicyPanelProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Decision Policy</h3>
      </div>

      {/* Presets */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500">Presets</span>
        </div>
        <div className="flex gap-2">
          {(["Strict", "Balanced", "Permissive"] as PolicyPreset[]).map((p) => {
            const isCurrent =
              JSON.stringify(POLICY_PRESETS[p]) === JSON.stringify(policy);
            return (
              <button
                key={p}
                onClick={() => onPreset(p)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isCurrent
                    ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                    : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3.5">
        {SLIDER_CONFIG.map((cfg) => (
          <div key={cfg.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-400">
                {cfg.label}
              </label>
              <span className="text-xs font-mono text-sky-300 tabular-nums">
                {policy[cfg.key].toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              value={policy[cfg.key]}
              onChange={(e) =>
                onPolicyChange({
                  ...policy,
                  [cfg.key]: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-sky-500"
            />
            <p className="text-xs text-zinc-600 mt-0.5">{cfg.hint}</p>
          </div>
        ))}
      </div>

      {/* Re-evaluate */}
      <button
        onClick={onReevaluate}
        disabled={!canReevaluate}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-sky-500/30 hover:text-sky-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RotateCw className="w-3.5 h-3.5" />
        Re-evaluate Run (no new Jev calls)
      </button>
    </div>
  );
}
