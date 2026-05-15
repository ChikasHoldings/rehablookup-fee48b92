/**
 * CenterTabs
 * ──────────
 * Sticky anchor strip beneath the hero. Each tab is an #anchor link, not
 * a route — clicking scrolls to the section, not navigates. The active
 * tab is updated via IntersectionObserver on section visibility.
 */
import { useEffect, useState } from "react";

interface CenterTabsProps {
  tabs: { id: string; label: string }[];
}

export function CenterTabs({ tabs }: CenterTabsProps) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "");

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el != null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      {
        // Top margin offsets for the sticky tab bar (~56px tall) + hero.
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0,
      },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="Page sections">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(tab.id);
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 70;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm transition-colors ${
                active === tab.id
                  ? "border-emerald-600 font-semibold text-emerald-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
