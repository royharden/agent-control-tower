import { ShieldCheck, Zap, Brain, Cpu } from "lucide-react";
import type { PlannerMode } from "@/lib/types";

interface HeroProps {
  plannerMode: PlannerMode;
  onPlannerModeChange: (mode: PlannerMode) => void;
}

export function Hero({ plannerMode, onPlannerModeChange }: HeroProps) {
  return (
    <header className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -top-16 right-1/4 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/25">
            <ShieldCheck className="w-6 h-6 text-sky-400" />
          </div>
          <span className="text-sm font-medium tracking-wider text-zinc-400 uppercase">
            TypeSafe AI — Control Tower
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50 leading-[1.1]">
          Agent Control Tower
        </h1>
        <p className="mt-3 text-xl text-zinc-400 font-medium">
          System 2 plans. System 1 decides.
        </p>

        <div className="mt-6 grid md:grid-cols-2 gap-4 max-w-3xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-zinc-200">
                System 2 — LLM Planner
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A language model plans the steps to achieve your goal, choosing
              which tools to call and why. Slow, flexible, generative — but
              not calibrated for safety.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-zinc-200">
                System 1 — Jev Gate
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Before any tool runs, Jev answers 4 calibrated questions in a
              single fan-out request. Code applies confidence-gated thresholds
              to auto-allow, escalate, or block — no model judgment in the
              decision itself.
            </p>
          </div>
        </div>

        {/* Planner mode toggle */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Cpu className="w-4 h-4" />
            <span>Planner mode:</span>
          </div>
          <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
            <button
              onClick={() => onPlannerModeChange("mock")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                plannerMode === "mock"
                  ? "bg-sky-500/20 text-sky-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mock Planner
            </button>
            <button
              onClick={() => onPlannerModeChange("live")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                plannerMode === "live"
                  ? "bg-sky-500/20 text-sky-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Live LLM
            </button>
          </div>
          <span className="text-xs text-zinc-500">
            {plannerMode === "mock"
              ? "Scripted plans for demo scenarios — Jev still runs live"
              : "LLM generates plans from your goal — Jev checks each call live"}
          </span>
        </div>
      </div>
    </header>
  );
}
