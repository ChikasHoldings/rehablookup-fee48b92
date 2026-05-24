import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ProviderPageHeader
 * ──────────────────
 * Compact, consistent page header used across every /provider/* page.
 *
 * Replaces the per-page chunky hero (text-[26px] / py-7) with a single
 * row: small icon + title + one-line description on the left, optional
 * action slot on the right. Stays readable but eats far less vertical
 * space, which matters when providers spend most of their time scrolling
 * through inquiry / analytics tables.
 *
 * Usage:
 *   <ProviderPageHeader
 *     title="Credential Kit"
 *     description="Pro+verified marketing assets."
 *     icon={<Award className="h-4 w-4" />}
 *     actions={<Button size="sm">Download</Button>}
 *   />
 */
export interface ProviderPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Optional back-link path (e.g. "/provider/marketing"). */
  backTo?: string;
  /** Optional back-link label (default: "Back"). */
  backLabel?: string;
  className?: string;
}

export function ProviderPageHeader({
  title,
  description,
  icon,
  actions,
  backTo,
  backLabel = "Back",
  className,
}: ProviderPageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-slate-200 bg-white",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {backTo && (
          <Link
            to={backTo}
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" aria-hidden />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {icon && (
              <div className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 leading-snug">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
