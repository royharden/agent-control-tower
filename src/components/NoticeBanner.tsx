import { Info } from "lucide-react";

interface NoticeBannerProps {
  notices: string[];
}

export function NoticeBanner({ notices }: NoticeBannerProps) {
  if (notices.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="mb-4 space-y-2">
        {notices.map((notice) => (
          <div
            key={notice}
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
