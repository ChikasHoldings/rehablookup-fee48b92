import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

/**
 * /signup/complete — landing page after Stripe Checkout success.
 *
 * Stripe sends the user here with ?session_id={CHECKOUT_SESSION_ID}.
 * We don't have the subscription row yet — the webhook is racing to
 * create it. Show a "we're activating your subscription" state and
 * route the user to /provider/billing after a short delay, which has
 * its own polling logic to surface the active state once the webhook
 * finishes.
 */
export default function SignupComplete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    if (!sessionId) {
      navigate("/provider/billing", { replace: true });
      return;
    }
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          navigate(`/provider/billing?checkout=success&session_id=${sessionId}`, { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sessionId, navigate]);

  return (
    <>
      <Helmet>
        <title>Subscription confirmed | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Payment confirmed
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Thanks for subscribing. We're activating your Pro subscription —
              this usually takes a few seconds.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to your dashboard in {secondsLeft}s…</span>
            </div>
            <div className="pt-2">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/provider/billing?checkout=success">
                  Go to billing now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
