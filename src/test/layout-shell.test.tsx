/**
 * Layout-shell snapshot — verifies the public Layout shell renders with the
 * required global guards at every viewport. If anyone removes
 * `max-w-[100vw]`, `overflow-x-hidden`, or `min-w-0` from the shell, this
 * fails before the regression hits production.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock heavy children so the shell renders without network/auth dependencies.
vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));
vi.mock("@/components/InternationalBanner", () => ({
  InternationalBanner: () => null,
}));
vi.mock("@/components/seo/StickyConversionBar", () => ({
  StickyConversionBar: () => null,
}));
vi.mock("@/components/ui/floating-help-button", () => ({
  FloatingHelpButton: () => null,
}));
vi.mock("@/components/ui/back-to-top", () => ({
  BackToTop: () => null,
}));
vi.mock("@/lib/routePrefetch", () => ({
  preloadPublicPages: () => {},
  preloadProviderPages: () => {},
  preloadAdminPages: () => {},
  prefetchAdjacentRoutes: () => {},
}));

import { Layout } from "@/components/layout/Layout";

const VIEWPORTS = [
  { name: "mobile-320", width: 320 },
  { name: "tablet-768", width: 768 },
  { name: "desktop-1024", width: 1024 },
];

function withProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe("Responsive: public Layout shell", () => {
  for (const vp of VIEWPORTS) {
    describe(`@ ${vp.width}px (${vp.name})`, () => {
      beforeEach(() => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: vp.width });
        window.dispatchEvent(new Event("resize"));
      });

      it("preserves overflow + width guards on root container", () => {
        const { container } = render(
          withProviders(
            <Layout>
              <div data-testid="content">child</div>
            </Layout>
          )
        );
        const root = container.firstChild as HTMLElement;
        const cls = root.getAttribute("class") || "";

        expect(cls, "root must clip horizontal overflow").toMatch(/overflow-x-hidden/);
        expect(cls, "root must cap width at viewport").toMatch(/max-w-\[100vw\]/);
        expect(cls, "root must be a vertical flex column").toMatch(/flex-col/);
        expect(cls, "root must claim full min-height").toMatch(/min-h-screen/);
      });

      it("main element allows shrinking inside flex parent", () => {
        const { container } = render(
          withProviders(
            <Layout>
              <div>child</div>
            </Layout>
          )
        );
        const main = container.querySelector("main");
        expect(main).not.toBeNull();
        const cls = main!.getAttribute("class") || "";
        expect(cls, "<main> must include min-w-0 to permit shrink").toMatch(/min-w-0/);
        expect(cls, "<main> must be flex-1 so it fills shell height").toMatch(/flex-1/);
      });

      it("matches structural snapshot", () => {
        const { container } = render(
          withProviders(
            <Layout>
              <div>child</div>
            </Layout>
          )
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  }
});
