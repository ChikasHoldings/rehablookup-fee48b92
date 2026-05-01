import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AreaWaitlistCaptureProps {
  /** The SEO page slug this signup is tied to (e.g. "alcohol-rehab-in-boise") */
  areaSlug: string;
  /** Human-friendly label, e.g. "Alcohol Rehab in Boise, ID" */
  areaLabel?: string;
  city?: string;
  state?: string;
  treatmentType?: string;
  /** Heading override */
  title?: string;
  /** Subtitle override */
  subtitle?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lead-capture block shown on SEO pages that have zero matching listings.
 * Visitors enter their email to be notified when verified facilities are
 * added to that area / treatment type. Stored in `area_waitlist`.
 *
 * No PII beyond email is collected. RLS allows anon insert only.
 */
export function AreaWaitlistCapture({
  areaSlug,
  areaLabel,
  city,
  state,
  treatmentType,
  title,
  subtitle,
}: AreaWaitlistCaptureProps) {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const heading =
    title ??
    (areaLabel
      ? `Get notified when ${areaLabel} centers are added`
      : "Get notified when new centers are added");

  const sub =
    subtitle ??
    "We're verifying new facilities every week. Drop your email and we'll let you know the moment a vetted match opens up — no spam, no obligation.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      toast({
        title: "Enter a valid email",
        description: "Please double-check the address and try again.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("area_waitlist").insert({
        email: trimmed,
        area_slug: areaSlug,
        area_label: areaLabel ?? null,
        city: city ?? null,
        state: state ?? null,
        treatment_type: treatmentType ?? null,
        source_path: pathname,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });

      // Treat duplicates as success so users aren't penalized for re-submitting.
      if (error && !/duplicate|unique/i.test(error.message)) {
        throw error;
      }

      setDone(true);
      toast({
        title: "You're on the list",
        description: "We'll email you the moment a verified center is added.",
      });
    } catch (err) {
      toast({
        title: "Couldn't sign you up",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-6 md:p-8 text-center max-w-2xl mx-auto">
        <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          You're on the list
        </h3>
        <p className="text-sm text-muted-foreground">
          We'll notify <span className="font-medium text-foreground">{email}</span>{" "}
          as soon as verified centers are available
          {areaLabel ? ` for ${areaLabel}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{heading}</h3>
          <p className="text-sm text-muted-foreground mt-1">{sub}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          aria-label="Email address"
          className="flex-1"
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding…
            </>
          ) : (
            "Notify me"
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-3">
        We respect your privacy. Unsubscribe anytime. No phone calls without your
        permission.
      </p>
    </div>
  );
}
