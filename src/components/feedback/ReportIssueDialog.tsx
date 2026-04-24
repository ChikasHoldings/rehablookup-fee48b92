import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Free-form context label so the ops team knows where the report came
   * from (e.g. "center-not-found", "blog-404"). Stored alongside the report.
   */
  context?: string;
  /**
   * Optional slug the user attempted to view — useful for fast triage of
   * Center Not Found reports.
   */
  attemptedSlug?: string | null;
  /**
   * Defaults to the current window URL. Editable by the user before submit.
   */
  defaultUrl?: string;
}

/**
 * Tiny "Report this issue" dialog used on dead-end / not-found pages.
 *
 * Lets visitors submit the URL they were trying to reach plus a short
 * reason. Posts to the public `submit-page-issue-report` edge function
 * which records the report as an admin notification. After success we
 * show a friendly confirmation panel inside the same dialog so the user
 * gets immediate feedback without losing context.
 */
export function ReportIssueDialog({
  open,
  onOpenChange,
  context = "general",
  attemptedSlug = null,
  defaultUrl,
}: ReportIssueDialogProps) {
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(
        defaultUrl ??
          (typeof window !== "undefined" ? window.location.href : ""),
      );
      setReason("");
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [open, defaultUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedReason = reason.trim();

    if (!trimmedUrl) {
      toast.error("Please include the URL you were trying to reach.");
      return;
    }
    if (trimmedReason.length < 3) {
      toast.error("Please add a short note about what went wrong.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke(
        "submit-page-issue-report",
        {
          body: {
            url: trimmedUrl,
            reason: trimmedReason,
            context,
            attemptedSlug,
          },
        },
      );

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("[ReportIssueDialog] submit failed", err);
      toast.error(
        "We couldn't send your report just now. Please try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">
                Thanks — we got it
              </DialogTitle>
              <DialogDescription className="text-center pt-1">
                Your report was sent to our team. We review these daily and
                will fix or redirect this page as quickly as possible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 sm:justify-center">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Flag className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-center">
                Report this issue
              </DialogTitle>
              <DialogDescription className="text-center">
                Tell us what you were trying to find — we'll use this to fix
                broken links and improve search results.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-url" className="text-sm">
                  URL
                </Label>
                <Input
                  id="report-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://rehablookup.com/..."
                  maxLength={500}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-reason" className="text-sm">
                  What happened?
                </Label>
                <Textarea
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. I clicked a link from Google and got a Center Not Found page."
                  rows={4}
                  maxLength={1000}
                  disabled={submitting}
                  required
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {reason.length}/1000
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Sending..." : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
