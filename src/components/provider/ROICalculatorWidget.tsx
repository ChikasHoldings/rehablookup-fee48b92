import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, TrendingDown, DollarSign, Clock, Users, Infinity as InfinityIcon } from "lucide-react";
import { TIER_PRICING, fmtMoneyWhole } from "@/lib/billingPricing";

/**
 * Provider-facing lead-cost comparison.
 *
 * RehabLookup is a FLAT monthly subscription — never per-lead, per-call, or
 * per-admission (EKRA-clean) — so its cost is identical at any inquiry volume
 * while pay-per-lead channels scale linearly. The calculator makes that
 * contrast concrete: as the volume slider rises, the pay-per-lead bars grow
 * and RehabLookup's flat fee stays put, dropping its effective cost-per-lead.
 *
 * Pricing comes from billingPricing.ts (mirrors the real Stripe charge) so the
 * tool can never drift from what a provider is actually billed.
 */

// Pay-per-lead channels: cost scales with the number of inquiries. Rates are
// illustrative industry list prices for context, not RehabLookup's.
const PER_LEAD_CHANNELS = [
  { name: "Google Ads (PPC)", costPerLead: 185, exclusivity: "None" },
  { name: "Rehabs.com", costPerLead: 75, exclusivity: "Shared (4–8 facilities)" },
  { name: "Recovery.org", costPerLead: 65, exclusivity: "Shared (3–5 facilities)" },
  { name: "SAMHSA directory", costPerLead: 0, exclusivity: "Public listing" },
];

// RehabLookup Pro — a flat monthly fee, the entry point for receiving leads.
const RL_FLAT_MONTHLY = TIER_PRICING.pro.monthlyCents / 100;

const TREATMENT_TYPES: Record<string, number> = {
  "Residential (30-day)": 28000,
  "Residential (60-day)": 52000,
  "Residential (90-day)": 72000,
  "Detox (5-7 day)": 8500,
  "PHP": 15000,
  "IOP": 9000,
  "Outpatient": 5000,
  "MAT": 12000,
};

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function ROICalculatorWidget() {
  const [monthlyLeads, setMonthlyLeads] = useState(20);
  const [treatmentType, setTreatmentType] = useState("Residential (30-day)");

  const revenuePerAdmission = TREATMENT_TYPES[treatmentType] || 28000;

  const channels = useMemo(() => {
    const perLead = PER_LEAD_CHANNELS.map((c) => ({
      name: c.name,
      model: "per_lead" as const,
      exclusivity: c.exclusivity,
      monthlyCost: c.costPerLead * monthlyLeads,
      costPerLead: c.costPerLead,
      effPerLead: c.costPerLead,
    }));
    const rl = {
      name: "RehabLookup",
      model: "flat" as const,
      exclusivity: "24h exclusive",
      monthlyCost: RL_FLAT_MONTHLY,
      costPerLead: null,
      effPerLead: monthlyLeads > 0 ? RL_FLAT_MONTHLY / monthlyLeads : RL_FLAT_MONTHLY,
    };
    return [...perLead, rl];
  }, [monthlyLeads]);

  const rl = channels[channels.length - 1];
  const google = channels[0];
  const monthlySavingsVsGoogle = Math.max(0, google.monthlyCost - rl.monthlyCost);
  const maxMonthly = Math.max(...channels.map((c) => c.monthlyCost), 1);
  // Express one admission's value in years of the flat Pro fee — a credible,
  // conversion-free way to show the subscription pays for itself.
  const yearsPerAdmission = Math.max(1, Math.round(revenuePerAdmission / (RL_FLAT_MONTHLY * 12)));

  const sortedBars = [...channels].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <div className="space-y-6">
      {/* EKRA / flat-fee explainer */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm leading-relaxed text-foreground">
          <strong>RehabLookup is a flat monthly subscription</strong> — {fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo for Pro.
          You're <strong>never charged per lead, per call, or per admission</strong>. The fee covers your
          listing and visibility and stays the same whether you receive 5 inquiries or 50, so your
          effective cost per lead falls as you grow. Pay-per-lead channels bill you for every inquiry.
        </p>
      </div>

      {/* Controls */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Monthly inquiry volume</label>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{monthlyLeads}</span>
            <span className="text-sm text-muted-foreground">inquiries/mo</span>
          </div>
          <Slider value={[monthlyLeads]} onValueChange={([v]) => setMonthlyLeads(v)} min={5} max={100} step={5} />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>5</span><span>50</span><span>100</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Treatment type</label>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">${(revenuePerAdmission / 1000).toFixed(0)}k</span>
            <span className="text-sm text-muted-foreground">avg revenue / admission</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(TREATMENT_TYPES).map((type) => (
              <button
                key={type}
                onClick={() => setTreatmentType(type)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-all ${
                  treatmentType === type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
          <InfinityIcon className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Your RehabLookup cost</p>
          <p className="text-xl font-bold text-foreground">{fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo</p>
          <p className="text-xs text-muted-foreground">flat — same at any volume</p>
        </div>
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
          <TrendingDown className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xs text-muted-foreground">Effective cost per lead</p>
          <p className="text-xl font-bold text-foreground">
            ${rl.effPerLead < 10 ? rl.effPerLead.toFixed(2) : Math.round(rl.effPerLead).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">vs {usd(google.costPerLead ?? 0)}/lead on Google Ads</p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
          <DollarSign className="mb-2 h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Lower monthly spend vs Google Ads</p>
          <p className="text-xl font-bold text-foreground">{usd(monthlySavingsVsGoogle)}</p>
          <p className="text-xs text-muted-foreground">at {monthlyLeads} inquiries/mo</p>
        </div>
      </div>

      {/* Monthly-spend comparison bars */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Monthly spend at {monthlyLeads} inquiries
        </h3>
        <div className="space-y-3">
          {sortedBars.map((c) => {
            const isRL = c.name === "RehabLookup";
            const widthPct = Math.max(2, (c.monthlyCost / maxMonthly) * 100);
            return (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs font-medium text-foreground">
                  {c.name}
                  {isRL && (
                    <Badge variant="outline" className="ml-1.5 border-emerald-500/30 px-1 py-0 text-[9px] text-emerald-600">
                      YOU
                    </Badge>
                  )}
                </div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="flex h-full items-center justify-end rounded-full pr-2.5 transition-all duration-700"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: isRL ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                    }}
                  >
                    <span className={`text-xs font-bold ${isRL ? "text-primary-foreground" : "text-foreground"}`}>
                      {c.monthlyCost === 0 ? "Free" : usd(c.monthlyCost)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Platform</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Pricing model</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Monthly</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Eff. $/lead</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Exclusivity</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c, i) => {
              const isRL = c.name === "RehabLookup";
              return (
                <tr key={c.name} className={`border-b border-border ${isRL ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {c.name}
                    {isRL && (
                      <Badge className="ml-1.5 border-emerald-500/20 bg-emerald-500/10 px-1 py-0 text-[9px] text-emerald-600">
                        BEST VALUE
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {isRL ? `Flat ${fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo` : c.costPerLead === 0 ? "Free listing" : `${usd(c.costPerLead ?? 0)} / lead`}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {c.monthlyCost === 0 ? "Free" : usd(c.monthlyCost)}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${isRL ? "text-emerald-600" : ""}`}>
                    {c.effPerLead === 0
                      ? "$0"
                      : isRL
                        ? `$${c.effPerLead < 10 ? c.effPerLead.toFixed(2) : Math.round(c.effPerLead).toLocaleString()}`
                        : usd(c.effPerLead)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      c.exclusivity.includes("exclusive") ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {c.exclusivity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Value context — conversion-free, just admission value vs the flat fee */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          A single <strong>{treatmentType}</strong> admission is worth about <strong>{usd(revenuePerAdmission)}</strong> —
          roughly <strong>{yearsPerAdmission} {yearsPerAdmission === 1 ? "year" : "years"}</strong> of RehabLookup Pro at
          {" "}{fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}/mo. Because the fee is flat, every additional inquiry lowers
          your effective cost per lead instead of raising your bill.
        </p>
      </div>

      {/* Why RehabLookup leads convert */}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, label: "24h Exclusive", desc: "No competing facilities on your lead" },
          { icon: Users, label: "Verified Leads", desc: "Real families with real intent" },
          { icon: Clock, label: "Respond First", desc: "Speed-to-lead lifts conversion" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
