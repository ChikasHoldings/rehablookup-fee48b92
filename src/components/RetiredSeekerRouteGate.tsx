import { type ReactNode, useEffect } from "react";

const RETIRED_EXACT = new Set([
  "/signup",
  "/signup/complete",
  "/reset-password",
  "/forgot-password",
]);

const RETIRED_PREFIXES = ["/account", "/seeker", "/my-account"];

function isRetiredSeekerPath(pathname: string) {
  if (RETIRED_EXACT.has(pathname)) return true;
  return RETIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function RetiredSeekerRouteGate({ children }: { children: ReactNode }) {
  const retired = typeof window !== "undefined" && isRetiredSeekerPath(window.location.pathname);

  useEffect(() => {
    if (!retired) return;

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, follow";

    const target = new URL("/search-results", window.location.origin);
    target.searchParams.set("from", "retired-account");
    window.location.replace(target.toString());
  }, [retired]);

  if (retired) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Consumer accounts have been retired</h1>
          <p className="mt-3 text-slate-600">
            RehabLookup is now a public treatment directory. Search, compare, and contact facilities without creating an account.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
