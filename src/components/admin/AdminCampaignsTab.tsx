import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Megaphone, AlertCircle } from "lucide-react";

interface PromotionRow {
  id: string;
  name: string;
  audience: string;
  target_product: string;
  discount_percent: number | null;
  discount_duration_months: number | null;
  headline: string;
  subcopy: string | null;
  urgency_label: string | null;
  cta_label: string | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
}

const AUDIENCES = [
  { value: "free", label: "Free → Pro" },
  { value: "pro", label: "Pro → add-on" },
  { value: "all", label: "All providers" },
];
const TARGETS = [
  { value: "pro", label: "Pro" },
  { value: "featured", label: "Featured" },
  { value: "concierge", label: "Concierge" },
];

const emptyForm = {
  name: "",
  audience: "free",
  target_product: "pro",
  discount_percent: 20,
  discount_duration_months: 3,
  headline: "",
  subcopy: "",
  urgency_label: "",
  cta_label: "",
  starts_at: "",
  ends_at: "",
};

/**
 * Admin Campaigns — create + manage time-sensitive conversion promos. Creating
 * a campaign provisions a Stripe coupon (via manage-subscription create_coupon)
 * and stores its id on the promotion; the provider popup/banner/emails + the
 * checkout discount all key off the live promo for the chosen audience.
 */
export function AdminCampaignsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const { data: promos, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async (): Promise<PromotionRow[]> => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as PromotionRow[]) ?? [];
    },
    staleTime: 1000 * 30,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canSave =
    form.name.trim().length >= 2 &&
    form.headline.trim().length >= 2 &&
    form.discount_percent >= 1 && form.discount_percent <= 100 &&
    !!form.starts_at && !!form.ends_at &&
    new Date(form.ends_at) > new Date(form.starts_at) &&
    !saving;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    try {
      // 1. Provision the Stripe coupon (% off, optional repeating duration).
      const { data: couponRes, error: couponErr } = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "create_coupon",
          name: form.name.trim(),
          percent_off: form.discount_percent,
          duration: form.discount_duration_months > 0 ? "repeating" : "once",
          ...(form.discount_duration_months > 0 ? { duration_in_months: form.discount_duration_months } : {}),
        },
      });
      if (couponErr) throw new Error(couponErr.message ?? "Coupon creation failed");
      const couponId = couponRes?.coupon?.id as string | undefined;
      if (couponRes?.error || !couponId) throw new Error(couponRes?.error ?? "Coupon id missing");

      // 2. Persist the campaign.
      const { error: insErr } = await supabase.from("promotions").insert({
        name: form.name.trim(),
        audience: form.audience,
        target_product: form.target_product,
        stripe_coupon_id: couponId,
        discount_percent: form.discount_percent,
        discount_duration_months: form.discount_duration_months > 0 ? form.discount_duration_months : null,
        headline: form.headline.trim(),
        subcopy: form.subcopy.trim() || null,
        urgency_label: form.urgency_label.trim() || null,
        cta_label: form.cta_label.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        active: true,
      });
      if (insErr) throw insErr;

      toast.success("Campaign created.");
      setForm({ ...emptyForm });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: PromotionRow) {
    const { error } = await supabase.from("promotions").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.active ? "Campaign deactivated." : "Campaign activated.");
    queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
  }

  function isLive(p: PromotionRow): boolean {
    const now = Date.now();
    return p.active && new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() > now;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Conversion campaigns</h3>
          <p className="text-xs text-muted-foreground">Time-sensitive % discounts to convert Free→Pro and Pro→add-on.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" />New campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New conversion campaign</DialogTitle>
              <DialogDescription>Provisions a Stripe coupon and a live promo for the chosen audience.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Field label="Internal name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Spring Pro Push" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Audience">
                  <Select value={form.audience} onValueChange={(v) => set("audience", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Target product">
                  <Select value={form.target_product} onValueChange={(v) => set("target_product", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TARGETS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Discount %">
                  <Input type="number" min={1} max={100} value={form.discount_percent}
                    onChange={(e) => set("discount_percent", Number(e.target.value))} />
                </Field>
                <Field label="Duration (months, 0 = one-time)">
                  <Input type="number" min={0} max={12} value={form.discount_duration_months}
                    onChange={(e) => set("discount_duration_months", Number(e.target.value))} />
                </Field>
              </div>
              <Field label="Headline">
                <Input value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Upgrade to Pro and save 20%" />
              </Field>
              <Field label="Subcopy (optional)">
                <Textarea rows={2} value={form.subcopy} onChange={(e) => set("subcopy", e.target.value)}
                  placeholder="Get inbox leads, full analytics, and the Verified badge." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Urgency label (optional)">
                  <Input value={form.urgency_label} onChange={(e) => set("urgency_label", e.target.value)} placeholder="Ends this week" />
                </Field>
                <Field label="CTA label (optional)">
                  <Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="Claim 20% off" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
                </Field>
                <Field label="Ends">
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!canSave} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                Create campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <Card><CardContent className="flex items-center justify-between gap-3 py-6">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-destructive" />Couldn't load campaigns.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      ) : !promos || promos.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No campaigns yet. Create one to start converting.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {p.name}
                    {isLive(p) ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs">Live</Badge>
                      : p.active ? <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Scheduled / ended</Badge>
                      : <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(p)}>
                    {p.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  {AUDIENCES.find((a) => a.value === p.audience)?.label} ·{" "}
                  {p.discount_percent}% off {TARGETS.find((t) => t.value === p.target_product)?.label}
                  {p.discount_duration_months ? ` for ${p.discount_duration_months} mo` : ""} ·{" "}
                  {format(new Date(p.starts_at), "MMM d")}–{format(new Date(p.ends_at), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm font-medium text-slate-900">{p.headline}</p>
                {p.subcopy && <p className="text-xs text-muted-foreground mt-0.5">{p.subcopy}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
