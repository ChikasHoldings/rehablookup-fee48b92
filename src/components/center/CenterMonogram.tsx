/**
 * CenterMonogram
 * ──────────────
 * Soft-tinted initial tile shown when a facility has no logo or gallery.
 * Deterministic palette pick from hash(id) — same facility always renders
 * the same color across renders + pages.
 */
import { cn } from "@/lib/utils";

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["bg-emerald-50", "text-emerald-700"],
  ["bg-sky-50", "text-sky-700"],
  ["bg-amber-50", "text-amber-700"],
  ["bg-rose-50", "text-rose-700"],
  ["bg-violet-50", "text-violet-700"],
  ["bg-teal-50", "text-teal-700"],
  ["bg-orange-50", "text-orange-700"],
  ["bg-indigo-50", "text-indigo-700"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface CenterMonogramProps {
  name: string;
  id: string;
  className?: string;
}

export function CenterMonogram({ name, id, className }: CenterMonogramProps) {
  const [bg, fg] = PALETTE[hashStr(id) % PALETTE.length];
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg font-semibold",
        bg,
        fg,
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
