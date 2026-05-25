/**
 * Regression guard: route-level error boundaries must AUTO-RECOVER on
 * navigation, so a single crashing page/component can never trap the user on
 * the error screen (the "whole platform / form gets stuck" failure).
 *
 * Exercises the shared RouteResetErrorBoundary base that Provider/Seeker/Admin/
 * LeadForm boundaries all extend: a pathname change while in the error state
 * clears it and renders the (now-healthy) children.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteResetErrorBoundary } from "@/components/RouteResetErrorBoundary";

class TestBoundary extends RouteResetErrorBoundary {
  protected reportError() {
    /* swallow in test */
  }
  protected renderFallback(_e: Error | undefined, _i: React.ErrorInfo | undefined, reset: () => void) {
    return (
      <div>
        <span>FALLBACK</span>
        <button onClick={reset}>retry</button>
      </div>
    );
  }
}

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>CHILD OK</div>;
}

describe("RouteResetErrorBoundary auto-recovers so the user is never stuck", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    // React logs caught errors to console.error; keep test output clean.
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errSpy.mockRestore());

  it("shows the fallback when a child crashes", () => {
    render(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow />
      </TestBoundary>,
    );
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();
  });

  it("recovers automatically when the route (pathname) changes", () => {
    const { rerender } = render(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow />
      </TestBoundary>,
    );
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();

    // Navigate to a different, healthy route → boundary must clear itself.
    rerender(
      <TestBoundary pathname="/b">
        <Thrower shouldThrow={false} />
      </TestBoundary>,
    );
    expect(screen.queryByText("FALLBACK")).not.toBeInTheDocument();
    expect(screen.getByText("CHILD OK")).toBeInTheDocument();
  });

  it("does NOT reset on a same-path re-render (only on real navigation)", () => {
    const { rerender } = render(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow />
      </TestBoundary>,
    );
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();

    // Same pathname → stays in fallback (avoids infinite re-crash loops).
    rerender(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow={false} />
      </TestBoundary>,
    );
    expect(screen.getByText("FALLBACK")).toBeInTheDocument();
  });

  it("manual reset (Try Again) clears the error in place", () => {
    const { rerender } = render(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow />
      </TestBoundary>,
    );
    // Make the child healthy, then click retry → children render.
    rerender(
      <TestBoundary pathname="/a">
        <Thrower shouldThrow={false} />
      </TestBoundary>,
    );
    fireEvent.click(screen.getByText("retry"));
    expect(screen.getByText("CHILD OK")).toBeInTheDocument();
  });
});
