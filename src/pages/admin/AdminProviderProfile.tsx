import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, CreditCard, ShieldCheck, Clock, Sparkles,
  Mail, Phone, CalendarDays, AlertCircle, Plus, XCircle, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { isActiveProRow } from "@/lib/proAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ProviderActivityTimeline } from "@/components/admin/ProviderActivityTimeline";

const FREE_CAP = 1;
const PRO_CAP = 5;

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Admin Provider Profile — account-level view keyed on the provider's
 * user_id (as opposed to AdminProviders, which is a per-facility list).
 * Surfaces identity, plan/grace state, Stripe billing, plan-change history,
 * onboarding, every owned facility, usage-vs-limits, and admin actions.
 */
export default function AdminProviderProfile() {
  const { userId } = useParams<{ userId: string }>();
  const queryClient = useQueryClient();
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const { logError } = useAdminErrorHandler("AdminProviderProfile");
  const canManage = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantMax, setGrantMax] = useState("3");
  const [grantDays, setGrantDays] = useState("30");
  const [grantReason, setGrantReason] = useState("");

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["admin-provider-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, phone, created_at, plan, onboarding_completed_at, email_verified_at, welcomed_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ["admin-provider-facilities", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, slug, status, suspended, verified, featured, claim_status, claimed_at, data_source, created_at, gallery_urls")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["admin-provider-subs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select("id, facility_id, tier, status, current_period_end, price_cents, stripe_subscription_id, stripe_customer_id, billing_period, created_at")
        .eq("provider_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: onboarding } = useQuery({
    queryKey: ["admin-provider-onboarding", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_onboarding_state")
        .select("current_step, mode, plan, updated_at")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: grants, refetch: refetchGrants } = useQuery({
    queryKey: ["admin-provider-grants", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_plan_grants")
        .select("id, kind, max_facilities, starts_at, expires_at, reason, granted_by, revoked_at, enforced_at, created_at")
        .eq("provider_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: planHistory } = useQuery({
    queryKey: ["admin-provider-plan-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_change_audit")
        .select("id, op, old_tier, new_tier, old_status, new_status, new_period_end, created_at")
        .eq("provider_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Live Stripe billing (payments/invoices/customer) via the admin-gated fn.
  const { data: billing } = useQuery({
    queryKey: ["admin-provider-billing", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-provider-subscription", {
        body: { userId },
      });
      if (error) {
        logError("billing_fetch", error);
        return null;
      }
      return data;
    },
  });

  const isPro = useMemo(
    () => (subscriptions ?? []).some((s) => s.tier === "pro" && isActiveProRow(s)),
    [subscriptions],
  );
  const activeGrant = useMemo(
    () =>
      (grants ?? []).find(
        (g) => !g.revoked_at && new Date(g.starts_at) <= new Date() && new Date(g.expires_at) > new Date(),
      ),
    [grants],
  );
  const used = facilities?.length ?? 0;
  const capBase = isPro ? PRO_CAP : FREE_CAP;
  const effectiveCap = Math.max(capBase, activeGrant?.max_facilities ?? 0);

  async function handleGrant() {
    if (!userId) return;
    const max = parseInt(grantMax, 10);
    const days = parseInt(grantDays, 10);
    if (!Number.isInteger(max) || max < 1 || max > 10 || !Number.isInteger(days) || days < 1) {
      toast.error("Enter a valid cap (1–10) and duration in days.");
      return;
    }
    if (!grantReason.trim()) {
      toast.error("A reason is required for the audit trail.");
      return;
    }
    const expires = new Date(Date.now() + days * 86_400_000).toISOString();
    const { error } = await supabase.from("provider_plan_grants").insert({
      provider_id: userId,
      kind: "facility_cap_grace",
      max_facilities: max,
      expires_at: expires,
      reason: grantReason.trim(),
    });
    if (error) {
      toast.error(`Grant failed: ${error.message}`);
      return;
    }
    toast.success(`Granted a ${days}-day facility-cap grace (max ${max}).`);
    setGrantOpen(false);
    setGrantReason("");
    refetchGrants();
    queryClient.invalidateQueries({ queryKey: ["admin-provider-grants", userId] });
  }

  async function handleRevoke(grantId: string) {
    const { error } = await supabase
      .from("provider_plan_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId);
    if (error) {
      toast.error(`Revoke failed: ${error.message}`);
      return;
    }
    toast.success("Grace grant revoked.");
    refetchGrants();
  }

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Distinguish a real fetch failure from a genuinely-missing record, so a
  // transient outage isn't misreported as "no account found".
  if (profileError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin/providers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Providers</Link>
        </Button>
        <Card><CardContent className="p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Couldn't load this provider account</p>
            <p className="text-sm text-muted-foreground mt-0.5">The account failed to load. Please retry.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchProfile()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin/providers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Providers</Link>
        </Button>
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          No provider account found for this user id. It may be an unclaimed facility (no owning account).
        </CardContent></Card>
      </div>
    );
  }

  const providerName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Provider";

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/providers"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Providers</Link>
        </Button>
        {canManage && (
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Grant grace period
          </Button>
        )}
      </div>

      {/* Identity + plan summary */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">{providerName}</CardTitle>
            {isPro ? (
              <Badge className="gap-1 bg-amber-100 text-amber-800"><Sparkles className="h-3 w-3" /> Pro</Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
            {activeGrant && (
              <Badge className="gap-1 bg-violet-100 text-violet-800">
                <Clock className="h-3 w-3" /> Grace → {fmtDate(activeGrant.expires_at)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {profile.email ?? "—"}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {profile.phone ?? "—"}</div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /> Signed up {fmtDate(profile.created_at)}</div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Email {profile.email_verified_at ? `verified ${fmtDate(profile.email_verified_at)}` : "not verified"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            Onboarding: {onboarding?.current_step ?? (profile.onboarding_completed_at ? "completed" : "—")}
            {onboarding?.mode ? ` (${onboarding.mode})` : ""}
          </div>
          <div className="text-muted-foreground">profiles.plan mirror: {profile.plan ?? "—"}</div>
        </CardContent>
      </Card>

      {/* Usage vs limits */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm">Usage vs limits</CardTitle></CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold">{used}<span className="text-base font-normal text-muted-foreground"> / {effectiveCap}</span></p>
            <p className="text-xs text-muted-foreground">Facility listings (cap: Free {FREE_CAP} · Pro {PRO_CAP}{activeGrant ? ` · grace ${activeGrant.max_facilities}` : ""})</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{(facilities ?? []).reduce((n, f) => n + (f.gallery_urls?.length ?? 0), 0)}</p>
            <p className="text-xs text-muted-foreground">Total gallery photos ({isPro ? 10 : 5}/facility cap)</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{(facilities ?? []).filter((f) => f.suspended).length}</p>
            <p className="text-xs text-muted-foreground">Suspended listings</p>
          </div>
        </CardContent>
      </Card>

      {/* Grace grants */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm">Courtesy grants</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(grants ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No grace grants.</p>
          ) : (
            <ul className="divide-y">
              {(grants ?? []).map((g) => {
                const active = !g.revoked_at && new Date(g.expires_at) > new Date() && new Date(g.starts_at) <= new Date();
                return (
                  <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                    <span className="font-medium">{g.max_facilities} listings</span>
                    <span className="text-muted-foreground">{fmtDate(g.starts_at)} → {fmtDate(g.expires_at)}</span>
                    {active ? <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                      : g.revoked_at ? <Badge variant="outline">Revoked</Badge>
                      : <Badge variant="outline">Expired</Badge>}
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{g.reason}</span>
                    {canManage && active && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRevoke(g.id)}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Facilities */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Facilities ({used})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {used === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No facilities owned by this account.</p>
          ) : (
            <ul className="divide-y">
              {(facilities ?? []).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
                  <span className="font-medium">{f.name}</span>
                  <Badge variant="outline">{f.status}</Badge>
                  {f.suspended && <Badge className="bg-amber-100 text-amber-800">Paused</Badge>}
                  {f.verified && <Badge className="bg-emerald-100 text-emerald-800">Verified</Badge>}
                  {f.featured && <Badge className="bg-sky-100 text-sky-800">Featured</Badge>}
                  <span className="text-xs text-muted-foreground">{f.gallery_urls?.length ?? 0} photos · {f.data_source}</span>
                  <Button asChild size="sm" variant="ghost" className="ml-auto">
                    {/* Deep-link to the Facilities tab scoped to this owner and
                        pre-searched to this facility's name — both params the
                        Providers page honors (a bare ?facility= is ignored). */}
                    <Link to={`/admin/providers?view=facilities&owner=${userId}&q=${encodeURIComponent(f.name)}`}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Billing & subscriptions</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4 text-sm">
          {(subscriptions ?? []).length === 0 ? (
            <p className="text-muted-foreground">No subscription rows. {billing?.customer?.id ? `Stripe customer ${billing.customer.id}.` : "No Stripe customer on record."}</p>
          ) : (
            <ul className="divide-y">
              {(subscriptions ?? []).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <Badge variant="outline">{s.tier}</Badge>
                  <span>{s.status}</span>
                  <span className="text-muted-foreground">{s.billing_period ?? "—"} · renews {fmtDate(s.current_period_end)}</span>
                  {s.stripe_subscription_id && <span className="font-mono text-xs text-muted-foreground">{s.stripe_subscription_id}</span>}
                </li>
              ))}
            </ul>
          )}
          {billing?.payment_history?.length ? (
            <div className="pt-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Recent payments</p>
              <ul className="space-y-1">
                {billing.payment_history.slice(0, 5).map((p: { id: string; amount?: number; status?: string; created?: number }) => (
                  <li key={p.id} className="text-xs text-muted-foreground">
                    {p.status} · {typeof p.amount === "number" ? `$${(p.amount / 100).toFixed(2)}` : "—"} · {p.created ? fmtDate(new Date(p.created * 1000).toISOString()) : "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Plan history */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm">Plan change history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {(planHistory ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No recorded plan changes.</p>
          ) : (
            <ul className="divide-y">
              {(planHistory ?? []).map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-xs">
                  <Badge variant="outline">{h.op}</Badge>
                  <span>{h.old_status ?? "∅"} → {h.new_status ?? "∅"}</span>
                  <span className="text-muted-foreground">{h.old_tier ?? "∅"} → {h.new_tier ?? "∅"}</span>
                  <span className="ml-auto text-muted-foreground">{fmtDate(h.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader className="border-b py-3"><CardTitle className="text-sm">Account activity</CardTitle></CardHeader>
        <CardContent className="p-4">
          {userId && <ProviderActivityTimeline userId={userId} facilityId={(facilities ?? [])[0]?.id ?? ""} />}
        </CardContent>
      </Card>

      {/* Grant dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant facility-cap grace</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-violet-50 p-3 text-xs text-violet-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Grace raises ONLY the facility listing cap. It grants no Pro badge, photo cap, analytics, embeds, or ranking — those stay tied to a real Pro subscription.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="grant-max">Max facilities</Label>
                <Input id="grant-max" type="number" min={1} max={10} value={grantMax} onChange={(e) => setGrantMax(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="grant-days">Duration (days)</Label>
                <Input id="grant-days" type="number" min={1} value={grantDays} onChange={(e) => setGrantDays(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="grant-reason">Reason (audit trail)</Label>
              <Input id="grant-reason" value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="e.g. courtesy period for pre-launch signup" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantOpen(false)}>Cancel</Button>
            <Button onClick={handleGrant}>Grant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
