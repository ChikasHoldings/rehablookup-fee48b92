/**
 * CenterBreadcrumb
 * ────────────────
 * Home › State › City › Center name.
 *
 * Slugify the state + city for the link hrefs so they navigate to the
 * canonical directory pages, not the free-text values from the row.
 */
import { Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CenterBreadcrumbProps {
  state: string;
  city: string;
  name: string;
}

export function CenterBreadcrumb({ state, city, name }: CenterBreadcrumbProps) {
  const stateSlug = slugify(state);
  const citySlug = slugify(city);
  return (
    <nav className="container mx-auto px-4 py-3" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <li className="flex items-center gap-1">
          <Link to="/" aria-label="Home" className="hover:text-slate-900">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <Link to={`/rehab-centers/${stateSlug}`} className="hover:text-slate-900">
            {state}
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <Link to={`/rehab-centers/${stateSlug}/${citySlug}`} className="hover:text-slate-900">
            {city}
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-slate-900">{name}</span>
        </li>
      </ol>
    </nav>
  );
}
