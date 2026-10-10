import { GitBranch, Inbox } from "lucide-react";
import type { StepRecord } from "@/lib/types";
import { StepCard } from "./StepCard";

interface TraceTimelineProps {
  steps: StepRecord[];
}

export function TraceTimeline({ steps }: TraceTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-sky-500" />
          Live Trace
        </h2>
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <Inbox className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            Run a scenario or enter a goal to see the agent's trace.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-sky-500" />
        Live Trace
        <span className="text-sm font-normal text-zinc-500 ml-2 flex items-center gap-1">
          <GitBranch className="w-3.5 h-3.5" />
          {steps.length} step{steps.length !== 1 ? "s" : ""}
        </span>
      </h2>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            isLatest={i === steps.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
