import { Check, X, ClipboardList, Inbox } from "lucide-react";
import type { StepRecord } from "@/lib/types";

interface ApprovalQueueProps {
  pendingSteps: StepRecord[];
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
}

export function ApprovalQueue({
  pendingSteps,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-zinc-200">
          Approval Queue
        </h3>
        {pendingSteps.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-medium">
            {pendingSteps.length}
          </span>
        )}
      </div>

      {pendingSteps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Inbox className="w-6 h-6 text-zinc-700 mb-2" />
          <p className="text-xs text-zinc-500">
            No pending approvals. Escalated calls appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSteps.map((step) => (
            <div
              key={step.id}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-mono font-semibold text-zinc-100">
                  {step.tool}
                </span>
                <span className="text-xs text-zinc-500">
                  step {step.idx + 1}
                </span>
              </div>
              <div className="text-xs text-zinc-500 font-mono mb-2 break-all">
                {JSON.stringify(step.args)}
              </div>
              <div className="text-xs text-zinc-400 mb-3 leading-relaxed">
                {step.reason}
              </div>
              {step.fired_rules && step.fired_rules.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {step.fired_rules.slice(0, 2).map((rule, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 font-mono"
                    >
                      {rule}
                    </span>
                  ))}
                  {step.fired_rules.length > 2 && (
                    <span className="text-xs text-zinc-600">
                      +{step.fired_rules.length - 2} more
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(step.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => onReject(step.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
