/**
 * Visual regression — DOM structural snapshots at 320 / 768 / 1024 px.
 *
 * Why DOM snapshots and not pixel diffs?
 *  jsdom has no layout engine, so it cannot detect *visual* shift. What it
 *  CAN detect is changes in the rendered markup and Tailwind class strings —
 *  which is exactly where layout-shift bugs originate (a removed `min-w-0`,
 *  a flipped `hidden sm:block`, a dropped `truncate`).
 *
 *  For true pixel-diff visuals see tests/visual/*.spec.ts (Playwright).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
];

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

function withProviders(ui: React.ReactNode, route = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

/**
 * BreadcrumbNav is the canonical "long-text" component — facility names,
 * city names, treatment-type names all flow through it. If responsive
 * guards (truncate / overflow-x-auto / shrink-0) regress here, every
 * landing page is affected.
 */
describe("Responsive: BreadcrumbNav with long facility name", () => {
  const items = [
    { label: "Rehab Centers", href: "/rehab-centers" },
    { label: "California", href: "/rehab-centers/california" },
    {
      label:
        "Sunrise Recovery Behavioral Health & Wellness Treatment Center of Southern California",
    },
  ];

  for (const vp of VIEWPORTS) {
    describe(`@ ${vp.width}px (${vp.name})`, () => {
      beforeEach(() => setViewport(vp.width, vp.height));

      it("renders without horizontal-overflow guard regression", () => {
        const { container } = render(withProviders(<BreadcrumbNav items={items} />));
        const nav = container.querySelector("nav");
        expect(nav).not.toBeNull();
        const cls = nav!.getAttribute("class") || "";
        // Must wrap in horizontal scroll OR clamp text — never let a 90-char
        // facility name push the page wider.
        const scrolls = /overflow-x-(auto|scroll|hidden)/.test(cls);
        const truncates = container.querySelector(
          ".truncate, .line-clamp-1, .line-clamp-2, .break-words"
        );
        expect(
          scrolls || !!truncates,
          "BreadcrumbNav must contain horizontal-scroll wrapper OR truncate/break-words on long labels"
        ).toBe(true);
      });

      it("matches DOM snapshot", () => {
        const { container } = render(withProviders(<BreadcrumbNav items={items} />));
        // Snapshot only the <nav> — Helmet portals JSON-LD into <head>
        // separately, which we don't need for layout-shift detection.
        const nav = container.querySelector("nav");
        expect(nav).toMatchSnapshot();
      });
    });
  }
});
