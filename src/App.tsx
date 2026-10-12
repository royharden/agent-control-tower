import { useState, useCallback, useEffect, useRef } from "react";
import { Hero } from "@/components/Hero";
import { Architecture } from "@/components/Architecture";
import { RunConsole } from "@/components/RunConsole";
import { TraceTimeline } from "@/components/TraceTimeline";
import { ApprovalQueue } from "@/components/ApprovalQueue";
import { PolicyPanel } from "@/components/PolicyPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { NoticeBanner } from "@/components/NoticeBanner";
import {
  DEFAULT_POLICY,
  decide,
  POLICY_PRESETS,
} from "@/lib/policy";
import { executeMockTool } from "@/lib/mockTools";
import {
  fetchPlan,
  callJev,
  createRun,
  createStep,
  updateStep,
  fetchRuns,
  fetchStepsForRun,
} from "@/lib/api";
import type {
  Policy,
  PolicyPreset,
  PlannerMode,
  StepRecord,
  RunRecord,
  CostConstants,
} from "@/lib/types";
import type { Scenario } from "@/lib/scenarios";

const STORAGE_KEY_POLICY = "act_policy";
const STORAGE_KEY_COST = "act_cost_constants";

const DEFAULT_COST_CONSTANTS: CostConstants = {
  judgeInputCostPerM: 2.5,
  judgeOutputCostPerM: 10,
  judgeInputTokenMultiplier: 1.5,
  judgeOutputTokens: 150,
};

function loadPolicy(): Policy {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLICY);
    if (raw) return { ...DEFAULT_POLICY, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_POLICY;
}

function loadCostConstants(): CostConstants {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COST);
    if (raw) return { ...DEFAULT_COST_CONSTANTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_COST_CONSTANTS;
}

function App() {
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("mock");
  const [policy, setPolicy] = useState<Policy>(loadPolicy);
  const [costConstants, setCostConstants] = useState<CostConstants>(
    loadCostConstants
  );
  const [steps, setSteps] = useState<StepRecord[]>([]);
  const [pastRuns, setPastRuns] = useState<RunRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const stepsRef = useRef<StepRecord[]>([]);
  stepsRef.current = steps;

  // Persist policy and cost constants
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(policy));
  }, [policy]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COST, JSON.stringify(costConstants));
  }, [costConstants]);

  // Load past runs and restore pending approvals from the most recent run on mount
  useEffect(() => {
    (async () => {
      try {
        const runs = await fetchRuns();
        setPastRuns(runs);
        // Restore pending steps from the latest run that has them
        for (const run of runs) {
          const runSteps = await fetchStepsForRun(run.id);
          const pending = runSteps.filter((s) => s.status === "pending");
          if (pending.length > 0) {
            setSelectedRunId(run.id);
            setCurrentRunId(run.id);
            setSteps(runSteps);
            break;
          }
        }
      } catch {
        // ignore — DB might not be reachable
      }
    })();
  }, []);

  // Server notices (e.g. daily demo limit reached), deduplicated per run.
  const addNotice = useCallback((notice?: string) => {
    if (!notice) return;
    setNotices((prev) => (prev.includes(notice) ? prev : [...prev, notice]));
  }, []);

  const updateStepInState = useCallback(
    (stepId: string, updates: Partial<StepRecord>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleRun = useCallback(
    async (goal: string, scenario: Scenario | null) => {
      setIsRunning(true);
      setRunError(null);
      setNotices([]);
      setSteps([]);

      try {
        // 1. Create a run record
        const run = await createRun(
          goal,
          scenario?.label ?? null,
          plannerMode,
          policy
        );
        setCurrentRunId(run.id);
        setSelectedRunId(run.id);

        // 2. Fetch plan
        const useMock = plannerMode === "mock";
        const planResponse = await fetchPlan(goal, useMock);
        addNotice(planResponse.notice);

        // 3. Process each step sequentially
        const newSteps: StepRecord[] = [];
        for (let i = 0; i < planResponse.steps.length; i++) {
          const planStep = planResponse.steps[i];

          // Create step record in DB
          const stepRecord = await createStep(
            run.id,
            i,
            planStep.tool,
            planStep.args,
            planStep.reason
          );
          newSteps.push(stepRecord);
          setSteps([...newSteps]);

          // 4. Call Jev for this step
          try {
            const jevResp = await callJev(goal, planStep);
            addNotice(jevResp.notice);

            // 5. Apply decision policy
            const { decision, firedRules } = decide(jevResp.answers, policy);

            // 6. Update step with Jev results + decision
            const updates: Partial<StepRecord> = {
              jev_response: jevResp,
              model: jevResp.model,
              latency_ms: jevResp.latency_ms,
              input_tokens: jevResp.usage.input_tokens,
              cost_usd: jevResp.cost_usd,
              decision,
              fired_rules: firedRules,
            };

            // 7. Execute or queue based on decision
            if (decision === "allow") {
              const result = executeMockTool(planStep.tool, planStep.args);
              updates.status = "executed";
              updates.tool_result = result;
            } else if (decision === "block") {
              updates.status = "blocked";
            } else {
              updates.status = "pending";
            }

            await updateStep(stepRecord.id, updates);
            const updatedStep = { ...stepRecord, ...updates };
            newSteps[i] = updatedStep;
            setSteps([...newSteps]);
          } catch (err) {
            // Jev call failed — mark as blocked with readable error
            const errorMsg =
              err instanceof Error ? err.message : String(err);
            const updates: Partial<StepRecord> = {
              status: "blocked",
              decision: "block",
              fired_rules: [`Jev check failed: ${errorMsg}`],
              jev_error: errorMsg,
            };
            await updateStep(stepRecord.id, updates);
            newSteps[i] = { ...stepRecord, ...updates };
            setSteps([...newSteps]);
          }
        }

        // Refresh past runs
        const runs = await fetchRuns();
        setPastRuns(runs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRunError(msg);
      } finally {
        setIsRunning(false);
      }
    },
    [plannerMode, policy, addNotice]
  );

  const handleApprove = useCallback(
    async (stepId: string) => {
      const step = stepsRef.current.find((s) => s.id === stepId);
      if (!step) return;

      const result = executeMockTool(step.tool, step.args);
      const updates: Partial<StepRecord> = {
        status: "approved",
        tool_result: result,
        jev_error: null,
      };
      await updateStep(stepId, updates);
      updateStepInState(stepId, updates);
    },
    [updateStepInState]
  );

  const handleReject = useCallback(
    async (stepId: string) => {
      const updates: Partial<StepRecord> = {
        status: "rejected",
      };
      await updateStep(stepId, updates);
      updateStepInState(stepId, updates);
    },
    [updateStepInState]
  );

  const handleSelectRun = useCallback(
    async (runId: string) => {
      try {
        const runSteps = await fetchStepsForRun(runId);
        setSelectedRunId(runId);
        setCurrentRunId(runId);
        setSteps(runSteps);
        setNotices([]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRunError(msg);
      }
    },
    []
  );

  const handlePreset = useCallback((preset: PolicyPreset) => {
    setPolicy(POLICY_PRESETS[preset]);
  }, []);

  const handleReevaluate = useCallback(() => {
    setSteps((prev) =>
      prev.map((s) => {
        if (!s.jev_response?.answers) return s;

        const { decision, firedRules } = decide(s.jev_response.answers, policy);

        // Only update if decision changed
        if (decision === s.decision) return s;

        const updates: Partial<StepRecord> = {
          decision,
          fired_rules: firedRules,
        };

        // Re-apply execution logic
        if (decision === "allow") {
          if (s.status === "pending" || s.status === "blocked") {
            const result = executeMockTool(s.tool, s.args);
            updates.status = "executed";
            updates.tool_result = result;
          }
        } else if (decision === "block") {
          if (s.status === "executed" || s.status === "pending") {
            updates.status = "blocked";
            updates.tool_result = null;
          }
        } else {
          // ask_human
          if (s.status === "executed") {
            updates.status = "pending";
            updates.tool_result = null;
          }
        }

        // Persist to DB
        updateStep(s.id, updates).catch(() => {
          // best-effort
        });

        return { ...s, ...updates };
      })
    );
  }, [policy]);

  const pendingSteps = steps.filter((s) => s.status === "pending");
  const canReevaluate = steps.some((s) => s.jev_response?.answers);
  const activeRunId = selectedRunId ?? currentRunId;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Hero
        plannerMode={plannerMode}
        onPlannerModeChange={setPlannerMode}
      />
      <Architecture />
      <RunConsole
        onRun={handleRun}
        isRunning={isRunning}
        plannerMode={plannerMode}
      />

      {runError && (
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
            {runError}
          </div>
        </div>
      )}

      <NoticeBanner notices={notices} />

      {/* Main layout: trace + sidebar */}
      <div className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Left: trace timeline */}
          <div>
            <TraceTimeline steps={steps} />
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <ApprovalQueue
              pendingSteps={pendingSteps}
              onApprove={handleApprove}
              onReject={handleReject}
            />
            <PolicyPanel
              policy={policy}
              onPolicyChange={setPolicy}
              onPreset={handlePreset}
              onReevaluate={handleReevaluate}
              canReevaluate={canReevaluate}
            />
            <StatsPanel
              steps={steps}
              pastRuns={pastRuns}
              costConstants={costConstants}
              onCostConstantsChange={setCostConstants}
              onSelectRun={handleSelectRun}
              activeRunId={activeRunId}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-zinc-600">
          Agent Control Tower — System 2 plans, System 1 decides. All tools are
          simulated. No real side effects.
        </div>
      </footer>
    </div>
  );
}

export default App;
