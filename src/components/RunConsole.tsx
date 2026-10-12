import { Play, Loader2, FlaskConical } from "lucide-react";
import { useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarios";
import type { PlannerMode } from "@/lib/types";

// Matches the server-side cap in the plan / jev-check / run-log functions.
const MAX_GOAL_CHARS = 500;

interface RunConsoleProps {
  onRun: (goal: string, scenario: Scenario | null) => void;
  isRunning: boolean;
  plannerMode: PlannerMode;
}

export function RunConsole({ onRun, isRunning, plannerMode }: RunConsoleProps) {
  const [goal, setGoal] = useState("");

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-sky-500" />
        Run Console
      </h2>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        {/* Scenario buttons */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-400">
              Demo scenarios
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                disabled={isRunning}
                onClick={() => {
                  setGoal(s.goal);
                  onRun(s.goal, s);
                }}
                className="group text-left rounded-xl border border-zinc-700 bg-zinc-800/50 p-3.5 hover:border-sky-500/40 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-sm font-semibold text-zinc-100 group-hover:text-sky-300 transition-colors">
                  {s.label}
                </div>
                <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {s.description}
                </div>
                <div className="text-xs text-zinc-600 mt-2 italic">
                  {s.expected}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal input + run */}
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && goal.trim() && !isRunning) {
                onRun(goal.trim(), null);
              }
            }}
            placeholder="Enter a custom goal for the agent…"
            maxLength={MAX_GOAL_CHARS}
            disabled={isRunning}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => goal.trim() && !isRunning && onRun(goal.trim(), null)}
            disabled={!goal.trim() || isRunning}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? "Running…" : "Run"}
          </button>
        </div>

        {plannerMode === "live" && (
          <p className="mt-3 text-xs text-zinc-500">
            Live LLM mode: the planner generates steps from your goal. Demo
            scenarios may produce different plans than the scripted mock versions.
          </p>
        )}
      </div>
    </section>
  );
}
