import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type StepResult = {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
};

type RunReport = {
  ok: boolean;
  summary: { total: number; passed: number; failed: number; totalMs: number };
  results: StepResult[];
  runAt: string;
};

export function SmokeTestRunner() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RunReport | null>(null);

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("run-smoke-tests", {
        body: {},
      });
      if (error) throw error;
      setReport(data as RunReport);
      const r = data as RunReport;
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
              Walks every <code className="text-[11px]">concierge_inquiries</code> status transition end-to-end and verifies the validator rejects illegal jumps. Creates and tears down ephemeral fixtures.
            </CardDescription>
          </div>
          <Button size="sm" onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1.5" />}
            {running ? "Running…" : "Run Suite"}
          </Button>
        </div>
      </CardHeader>
      {report && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={report.ok ? "default" : "destructive"}>
              {report.ok ? "PASS" : "FAIL"}
            </Badge>
            <span className="text-muted-foreground">
              {report.summary.passed}/{report.summary.total} steps · {report.summary.totalMs}ms · {new Date(report.runAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="rounded-md border divide-y">
            {report.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                {r.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-foreground truncate">{r.name}</p>
                  {r.error && (
                    <p className="text-destructive mt-0.5 break-words">{r.error}</p>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums shrink-0">{r.durationMs}ms</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
