import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { z } from "zod";

import headerLogo from "@/assets/logo-header.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveProviderPostLoginPath } from "@/lib/providerLanding";
import { safeReturnTo } from "@/lib/safeReturnTo";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(1, "Password is required"),
});

async function resolveSignedInDestination(userId: string, returnTo: string | null) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (isAdmin) return "/admin";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) return null;

  const { path } = await resolveProviderPostLoginPath(userId, returnTo);
  return path;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("redirect") || searchParams.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user?.id) {
          const destination = await resolveSignedInDestination(session.user.id, returnTo);
          if (!mounted) return;
          if (destination) {
            navigate(destination, { replace: true });
            return;
          }

          // RehabLookup no longer has seeker accounts. Do not leave a legacy
          // seeker session attached to the provider login surface.
          await supabase.auth.signOut();
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    void checkSession();
    return () => {
      mounted = false;
    };
  }, [navigate, returnTo]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      });

      if (signInError || !data.user) {
        setError("Incorrect email or password.");
        return;
      }

      const destination = await resolveSignedInDestination(data.user.id, returnTo);
      if (!destination) {
        await supabase.auth.signOut();
        setError("This sign-in is for treatment providers. Consumer accounts are no longer used on RehabLookup.");
        return;
      }

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Provider sign-in failed", err);
      setError("We couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking session" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Provider Sign In | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Sign in to the RehabLookup provider portal." />
      </Helmet>

      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 flex justify-center" aria-label="RehabLookup home">
            <img src={headerLogo} alt="RehabLookup" className="h-9 w-auto" width={197} height={36} />
          </Link>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Provider sign in</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Manage your facility listings, inquiries, performance, Pro plan, and Featured advertising.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/provider/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="px-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-7 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
              Need to claim or add a facility?{" "}
              <Link to="/provider/onboarding" className="font-semibold text-primary hover:underline">
                Get started free
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Looking for treatment? No account is required.{" "}
            <Link to="/search-results" className="underline underline-offset-2 hover:text-slate-700">
              Search facilities
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
