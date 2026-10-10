import {
  Target,
  Brain,
  ArrowRight,
  Zap,
  Code2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
} from "lucide-react";

export function Architecture() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <h2 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-sky-500" />
        How It Works
      </h2>

      <div className="flex flex-col lg:flex-row items-stretch gap-3">
        {/* Goal */}
        <ArchNode
          icon={<Target className="w-5 h-5" />}
          title="Goal"
          subtitle="User intent"
          color="zinc"
        />
        <Connector />

        {/* LLM Planner */}
        <ArchNode
          icon={<Brain className="w-5 h-5" />}
          title="LLM Planner"
          subtitle="System 2"
          color="violet"
        />
        <Connector />

        {/* Proposed tool call */}
        <ArchNode
          icon={<Wrench className="w-5 h-5" />}
          title="Proposed Call"
          subtitle="tool + args"
          color="zinc"
        />
        <Connector />

        {/* Jev */}
        <ArchNode
          icon={<Zap className="w-5 h-5" />}
          title="Jev Gate"
          subtitle="4 questions, 1 request"
          color="sky"
          wide
        >
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["reversible?", "matches_goal?", "risk?", "verdict?"].map((q) => (
              <span
                key={q}
                className="text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20"
              >
                {q}
              </span>
            ))}
          </div>
        </ArchNode>
        <Connector />

        {/* Policy code */}
        <ArchNode
          icon={<Code2 className="w-5 h-5" />}
          title="Policy Code"
          subtitle="decide(answers, policy)"
          color="zinc"
        />
        <Connector />

        {/* Decisions */}
        <div className="flex flex-col gap-2 min-w-[180px]">
          <DecisionBadge
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Allow"
            color="emerald"
          />
          <DecisionBadge
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Approval Queue"
            color="amber"
          />
          <DecisionBadge
            icon={<XCircle className="w-4 h-4" />}
            label="Block"
            color="red"
          />
        </div>
        <Connector />

        {/* Mock tool */}
        <ArchNode
          icon={<Wrench className="w-5 h-5" />}
          title="Mock Tool"
          subtitle="Simulated result"
          color="zinc"
        />
      </div>
    </section>
  );
}

const colorMap: Record<
  string,
  { bg: string; border: string; text: string; iconBg: string }
> = {
  zinc: {
    bg: "bg-zinc-900/60",
    border: "border-zinc-700",
    text: "text-zinc-200",
    iconBg: "bg-zinc-700/50 text-zinc-300",
  },
  sky: {
    bg: "bg-sky-500/8",
    border: "border-sky-500/25",
    text: "text-sky-200",
    iconBg: "bg-sky-500/20 text-sky-400",
  },
  violet: {
    bg: "bg-violet-500/8",
    border: "border-violet-500/25",
    text: "text-violet-200",
    iconBg: "bg-violet-500/20 text-violet-400",
  },
};

function ArchNode({
  icon,
  title,
  subtitle,
  color,
  wide,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3 flex flex-col justify-center ${wide ? "min-w-[200px]" : "min-w-[140px]"}`}
    >
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.iconBg}`}>
          {icon}
        </div>
        <div>
          <div className={`text-sm font-semibold ${c.text}`}>{title}</div>
          <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center lg:flex-none">
      <ArrowRight className="w-4 h-4 text-zinc-600 rotate-90 lg:rotate-0" />
    </div>
  );
}

function DecisionBadge({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    red: "bg-red-500/10 border-red-500/25 text-red-400",
  };
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${colors[color]}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
