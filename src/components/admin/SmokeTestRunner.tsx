import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  FlaskConical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RequestInfo = {
  kind: "http" | "db";
  method: string;
  target: string;
  body?: unknown;
  filter?: Record<string, unknown>;
};

type ResponseInfo = {
  status?: number | null;
  body?: unknown;
  code?: string | null;
};

type StepResult = {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
  request?: RequestInfo;
  response?: ResponseInfo;
  stack?: string;
};

type RunReport = {
  ok: boolean;
  summary: { total: number; passed: number; failed: number; totalMs: number };
  results: StepResult[];
  runAt: string;
};

function formatJSON(value: unknown): string {
  if (value === undefined || value === null) return String(value);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre className="rounded border bg-muted/40 p-2 text-[11px] leading-snug font-mono text-foreground overflow-x-auto max-h-64">
        {value}
      </pre>
    </div>
  );
}

function StepDiagnostics({ step }: { step: StepResult }) {
  const hasAny = !!(step.request || step.response || step.stack);
  if (!hasAny) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        No diagnostics captured for this step.
      </p>
    );
  }
  return (
    <div className="space-y-3 pt-2">
      {step.request && (
        <CodeBlock
          label={`Request · ${step.request.kind.toUpperCase()} ${step.request.method} ${step.request.target}`}
          value={formatJSON({
            body: step.request.body,
            ...(step.request.filter ? { filter: step.request.filter } : {}),
          })}
        />
      )}
      {step.response && (
        <CodeBlock
          label={`Response${
            step.response.status != null ? ` · HTTP ${step.response.status}` : ""
          }${step.response.code ? ` · code ${step.response.code}` : ""}`}
          value={formatJSON(step.response.body)}
        />
      )}
      {step.stack && <CodeBlock label="Stack trace" value={step.stack} />}
    </div>
  );
}

export function SmokeTestRunner() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RunReport | null>(null);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  const run = async () => {
    setRunning(true);
    setReport(null);
    setOpenSteps({});
    try {
      const { data, error } = await supabase.functions.invoke("run-smoke-tests", {
        body: {},
      });
      if (error) throw error;
      const r = data as RunReport;
      setReport(r);
      // Auto-expand failed steps so the panel is immediately useful.
      const auto: Record<number, boolean> = {};
      r.results.forEach((s, i) => {
        if (!s.ok) auto[i] = true;
      });
      setOpenSteps(auto);
      if (r.ok) {
        toast.success(`Smoke tests passed (${r.summary.passed}/${r.summary.total})`);
      } else {
        toast.error(`Smoke tests failed (${r.summary.failed} of ${r.summary.total})`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to run smoke tests";
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      toast.success("Full report copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-info" />
              Inquiry Lifecycle Smoke Tests
            </CardTitle>
            <CardDescription className="text-xs">
              Walks every <code className="text-[11px]">concierge_inquiries</code> status
              transition end-to-end and verifies the validator rejects illegal jumps. Failed
              steps expose the full request, response, and stack trace below.
            </CardDescription>
          </div>
          <Button size="sm" onClick={run} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-1.5" />
            )}
            {running ? "Running…" : "Run Suite"}
          </Button>
        </div>
      </CardHeader>
      {report && (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant={report.ok ? "default" : "destructive"}>
                {report.ok ? "PASS" : "FAIL"}
              </Badge>
              <span className="text-muted-foreground">
                {report.summary.passed}/{report.summary.total} steps · {report.summary.totalMs}ms
                · {new Date(report.runAt).toLocaleTimeString()}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={copyReport} className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" /> Copy report
            </Button>
          </div>
          <div className="rounded-md border divide-y">
            {report.results.map((r, i) => {
              const expanded = !!openSteps[i];
              const setExpanded = (v: boolean) =>
                setOpenSteps((prev) => ({ ...prev, [i]: v }));
              return (
                <Collapsible key={i} open={expanded} onOpenChange={setExpanded}>
                  <div className="flex items-start gap-2 px-3 py-2 text-xs">
                    {r.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-foreground truncate">{r.name}</p>
                      </div>
                      {r.error && (
                        <p className="text-destructive mt-0.5 break-words">{r.error}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {r.durationMs}ms
                    </span>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "shrink-0 p-1 rounded hover:bg-muted transition-colors",
                          !r.request && !r.response && !r.stack && "opacity-40",
                        )}
                        aria-label={expanded ? "Hide details" : "Show details"}
                      >
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
                      <StepDiagnostics step={r} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
