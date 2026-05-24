import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_MIN = 1;
const NAME_MAX = 80;
const REVIEW_MAX = 4000;

interface ValidPayload {
  state: "valid";
  request_id: string;
  recipient_name: string;
  facility: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    logo_url: string | null;
    is_pro: boolean;
    profile_url: string;
  };
}

type TokenPayload =
  | ValidPayload
  | { state: "expired"; recipient_name: string }
  | { state: "submitted"; recipient_name: string }
  | null;

/**
 * /review/:id — public, tokenless landing page for the review-request
 * link emailed by send-review-request. UUID in the URL is the token;
 * server-side gating (get_review_request_by_token) verifies the
 * request exists, hasn't expired, hasn't already been used, and
 * points to an approved facility. No auth required.
 */
export default function PublicReviewSubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const validId = !!id && UUID_PATTERN.test(id);

  const query = useQuery({
    queryKey: ["review-request", id],
    enabled: validId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_review_request_by_token", {
        p_request_id: id!,
      });
      if (error) throw error;
      return data as TokenPayload;
    },
    staleTime: 60 * 1000,
    retry: 0,
  });

  if (!validId) {
    return <ResultPanel kind="invalid" />;
  }

  if (query.isLoading) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            <span className="ml-3 text-sm text-muted-foreground">Loading your review form…</span>
          </CardContent>
        </Card>
      </Shell>
    );
  }
  if (query.isError || !query.data) return <ResultPanel kind="invalid" />;

  if (query.data.state === "expired") return <ResultPanel kind="expired" />;
  if (query.data.state === "submitted") return <ResultPanel kind="submitted" />;

  return <ReviewForm payload={query.data} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Helmet>
        <title>Leave a review | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-2xl px-4 py-6 flex items-center justify-between">
            <Link to="/" className="font-display font-bold tracking-tight text-[18px] text-[#1B365D]">
              RehabLookup
            </Link>
            <p className="text-xs text-muted-foreground">Verified reviews</p>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">{children}</div>
      </div>
    </>
  );
}

function ReviewForm({ payload }: { payload: ValidPayload }) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [displayName, setDisplayName] = useState(payload.recipient_name || "");
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("submit_review_via_token", {
        p_request_id: payload.request_id,
        p_rating: rating,
        p_review_text: reviewText.trim() || null,
        p_reviewer_display_name: displayName.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => setSubmitted(true),
  });

  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    displayName.trim().length >= NAME_MIN &&
    displayName.trim().length <= NAME_MAX &&
    reviewText.length <= REVIEW_MAX &&
    !submit.isPending;

  // Pre-fill the display name from the recipient_name the provider
  // typed when they sent the request, but mask it to "First L." so the
  // recipient doesn't accidentally publish their full surname.
  const initialDisplayName = useMemo(() => {
    const parts = payload.recipient_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  }, [payload.recipient_name]);
  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  if (submitted) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Thanks for sharing!</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Your review for <strong>{payload.facility.name}</strong> has
                been submitted. Our moderation team typically approves new
                reviews within 1-2 business days, and you'll see it on the
                facility's RehabLookup profile once it's live.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <a href={payload.facility.profile_url} rel="noopener noreferrer">
                View facility profile
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {payload.facility.logo_url ? (
              <img
                src={payload.facility.logo_url}
                alt={`${payload.facility.name} logo`}
                className="h-12 w-12 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-slate-500">
                {payload.facility.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight">
                Review {payload.facility.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {payload.facility.city}, {payload.facility.state}
                {payload.facility.is_pro && (
                  <Badge className="ml-2 bg-amber-500 hover:bg-amber-500 text-[10px] py-0 px-1.5">
                    Pro
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hi {payload.recipient_name.split(" ")[0] || "there"} — the team at{" "}
            <strong>{payload.facility.name}</strong> asked us to invite you to
            share your experience. Your review will be moderated by RehabLookup
            before going live, and you can edit your name below for privacy.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium mb-2 text-foreground">
              How would you rate your overall experience?{" "}
              <span className="text-destructive">*</span>
            </legend>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Rating, 1 to 5 stars"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoverRating || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onFocus={() => setHoverRating(n)}
                    onBlur={() => setHoverRating(0)}
                    className="p-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        filled ? "fill-amber-400 text-amber-400" : "text-slate-300",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
              {(rating > 0 || hoverRating > 0) && (
                <span className="ml-3 text-sm text-muted-foreground tabular-nums">
                  {hoverRating || rating} of 5
                </span>
              )}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="display-name">
              Display name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              placeholder="First L."
            />
            <p className="text-xs text-muted-foreground">
              Shown publicly. We suggest first name + last initial for privacy
              (e.g. "Sarah M.").
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="review-text">Your review</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {reviewText.length}/{REVIEW_MAX}
              </span>
            </div>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, REVIEW_MAX))}
              rows={6}
              maxLength={REVIEW_MAX}
              placeholder="What went well? What could have been better? Other families considering this facility will appreciate your honest experience."
            />
            <p className="text-xs text-muted-foreground">
              Optional but encouraged. Reviews containing PHI, contact details,
              or staff names may be edited or rejected by moderation.
            </p>
          </div>

          {submit.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
              <p>
                {(submit.error as Error)?.message ||
                  "Something went wrong. Try refreshing and submitting again."}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground sm:max-w-sm">
              By submitting you agree your review may be published on the
              facility's RehabLookup profile after moderation. No payment is
              ever taken for reviews.
            </p>
            <Button
              onClick={() => submit.mutate()}
              disabled={!canSubmit}
              className="bg-[#1B365D] hover:bg-[#142a4a] gap-2 w-full sm:w-auto"
            >
              {submit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Submit review
            </Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}

function ResultPanel({ kind }: { kind: "invalid" | "expired" | "submitted" }) {
  const config = {
    invalid: {
      title: "This review link isn't valid",
      body: "The link may have been copied incorrectly, or it's no longer active. If you got this email recently, try clicking the link directly from the email instead of pasting it.",
    },
    expired: {
      title: "This review link has expired",
      body: "Review request links expire 30 days after they're sent. Ask the facility to send a new invitation if you'd still like to share your experience.",
    },
    submitted: {
      title: "You've already submitted this review",
      body: "Thanks for sharing! Each invitation can only be used once. Your review is in moderation and will appear on the facility's RehabLookup profile once approved.",
    },
  }[kind];
  return (
    <Shell>
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-slate-500" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{config.body}</p>
          <div className="pt-2">
            <Button asChild variant="outline">
              <Link to="/">Go to RehabLookup</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
