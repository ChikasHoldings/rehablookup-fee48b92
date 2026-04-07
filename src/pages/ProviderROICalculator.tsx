import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  TrendingDown,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Shield,
  Star,
  BarChart3,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Target,
} from "lucide-react";

// ============================================================================
// INDUSTRY DATA — 2026 benchmarks
// ============================================================================

interface CompetitorData {
  name: string;
  costPerLead: number;
  avgConversionRate: number;
  exclusivity: string;
  leadQuality: string;
  color: string;
  notes: string;
}

const COMPETITORS: CompetitorData[] = [
  {
    name: "Google Ads (PPC)",
    costPerLead: 185,
    avgConversionRate: 3.5,
    exclusivity: "None",
    leadQuality: "Mixed intent",
    color: "#EA4335",
    notes: "High volume but expensive. Avg CPC for rehab keywords: $45-$90. Requires ongoing management.",
  },
  {
    name: "Rehabs.com",
    costPerLead: 75,
    avgConversionRate: 5,
    exclusivity: "Shared (4-8 facilities)",
    leadQuality: "Medium",
    color: "#6B7280",
    notes: "Leads shared with multiple facilities. You're competing for the same patient against 4-8 others.",
  },
  {
    name: "SAMHSA Referral",
    costPerLead: 0,
    avgConversionRate: 2,
    exclusivity: "Listed publicly",
    leadQuality: "Low intent",
    color: "#2563EB",
    notes: "Free listing but low intent traffic. No lead routing — families must find and contact you directly.",
  },
  {
    name: "Recovery.org",
    costPerLead: 65,
    avgConversionRate: 4,
    exclusivity: "Shared (3-5 facilities)",
    leadQuality: "Medium",
    color: "#8B5CF6",
    notes: "Similar to Rehabs.com model. Leads shared across multiple providers.",
  },
  {
    name: "RehabLookup",
    costPerLead: 39,
    avgConversionRate: 12,
    exclusivity: "24h Exclusive",
    leadQuality: "High intent, verified",
    color: "#1B365D",
    notes: "Exclusive leads for 24 hours. Only you see the lead first. Verified contact info included.",
  },
];

const REHABLOOKUP = COMPETITORS[COMPETITORS.length - 1];

// Average revenue per admission by treatment type
const TREATMENT_REVENUE: Record<string, number> = {
  "Residential Inpatient (30-day)": 28000,
  "Residential Inpatient (60-day)": 52000,
  "Residential Inpatient (90-day)": 72000,
  "Detox (5-7 day)": 8500,
  "PHP (Partial Hospitalization)": 15000,
  "IOP (Intensive Outpatient)": 9000,
  "Outpatient": 5000,
  "MAT (Medication-Assisted)": 12000,
};

// ============================================================================
// COMPONENT
// ============================================================================

const ProviderROICalculator = () => {
  const [monthlyLeads, setMonthlyLeads] = useState(20);
  const [treatmentType, setTreatmentType] = useState("Residential Inpatient (30-day)");
  const [showProComparison, setShowProComparison] = useState(false);

  const revenuePerAdmission = TREATMENT_REVENUE[treatmentType] || 28000;

  const calculations = useMemo(() => {
    return COMPETITORS.map((comp) => {
      const totalCost = comp.costPerLead * monthlyLeads;
      const admissions = Math.round((monthlyLeads * comp.avgConversionRate) / 100 * 10) / 10;
      const revenue = admissions * revenuePerAdmission;
      const costPerAdmission = admissions > 0 ? Math.round(totalCost / admissions) : 0;
      const roi = totalCost > 0 ? Math.round(((revenue - totalCost) / totalCost) * 100) : 0;
      const profit = revenue - totalCost;
      return { ...comp, totalCost, admissions, revenue, costPerAdmission, roi, profit };
    });
  }, [monthlyLeads, revenuePerAdmission]);

  const rehabLookupCalc = calculations[calculations.length - 1];
  const googleAdsCalc = calculations[0];
  const rehabs_com_calc = calculations[1];

  const proLeadCost = Math.round(39 * 0.8); // 20% Pro discount
  const proTotalCost = proLeadCost * monthlyLeads;
  const proSavings = rehabLookupCalc.totalCost - proTotalCost;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "For Providers", href: "/for-providers" },
    { label: "ROI Calculator" },
  ];

  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${n.toLocaleString()}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="Provider ROI Calculator | Compare Lead Costs | RehabLookup"
        description="Calculate your cost-per-admission on RehabLookup vs Google Ads, Rehabs.com, and SAMHSA. See why exclusive leads convert 3x better."
        canonical="/provider-roi-calculator"
        keywords={["rehab lead cost", "treatment center ROI", "rehab marketing cost", "cost per admission rehab"]}
      />

      {/* Hero */}
      <section className="relative bg-[#1B365D] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B365D] via-[#2C4A7F] to-[#1B365D] opacity-90" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <BreadcrumbNav items={breadcrumbs} className="mb-8 text-white/60" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Calculator className="h-3.5 w-3.5 mr-1" /> Provider ROI Calculator
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              How Much Are You <span className="text-[#0EA5E9]">Overpaying</span> for Patient Leads?
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl">
              Compare your cost-per-admission across platforms. See why exclusive leads at $39 convert 3x better than shared leads at $75+.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 md:py-16">
        {/* Calculator Controls */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-12 shadow-lg"
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#0EA5E9]" />
            Customize Your Scenario
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Monthly Lead Volume */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Monthly Lead Volume
              </label>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-[#1B365D]">{monthlyLeads}</span>
                <span className="text-muted-foreground">leads/month</span>
              </div>
              <Slider
                value={[monthlyLeads]}
                onValueChange={([v]) => setMonthlyLeads(v)}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Treatment Type */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Primary Treatment Type
              </label>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-[#1B365D]">{formatCurrency(revenuePerAdmission)}</span>
                <span className="text-muted-foreground">avg revenue/admission</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(TREATMENT_REVENUE).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTreatmentType(type)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                      treatmentType === type
                        ? "bg-[#1B365D] text-white border-[#1B365D]"
                        : "bg-background text-muted-foreground border-border hover:border-[#1B365D]/30"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Results Comparison Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Cost-Per-Admission Comparison
          </h2>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Platform</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Cost/Lead</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Monthly Cost</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Conv. Rate</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Admissions</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Cost/Admission</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-muted-foreground">Monthly ROI</th>
                  <th className="text-center px-4 py-4 text-sm font-medium text-muted-foreground">Exclusivity</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, i) => {
                  const isRL = calc.name === "RehabLookup";
                  return (
                    <tr
                      key={calc.name}
                      className={`border-t border-border ${isRL ? "bg-[#1B365D]/5 ring-2 ring-inset ring-[#1B365D]/20" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: calc.color }} />
                          <div>
                            <span className={`font-semibold text-sm ${isRL ? "text-[#1B365D]" : "text-foreground"}`}>
                              {calc.name}
                            </span>
                            {isRL && (
                              <Badge className="ml-2 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 text-[10px]">
                                BEST VALUE
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-4 font-medium text-sm">
                        {calc.costPerLead === 0 ? "Free" : `$${calc.costPerLead}`}
                      </td>
                      <td className="text-right px-4 py-4 font-medium text-sm">
                        {calc.totalCost === 0 ? "Free" : `$${calc.totalCost.toLocaleString()}`}
                      </td>
                      <td className="text-right px-4 py-4 text-sm">
                        <span className={isRL ? "text-[#10B981] font-bold" : ""}>
                          {calc.avgConversionRate}%
                        </span>
                      </td>
                      <td className="text-right px-4 py-4 font-semibold text-sm">
                        {calc.admissions}
                      </td>
                      <td className="text-right px-4 py-4">
                        <span className={`font-bold text-sm ${isRL ? "text-[#10B981]" : calc.costPerAdmission > 1000 ? "text-red-500" : "text-foreground"}`}>
                          {calc.costPerAdmission === 0 ? "N/A*" : `$${calc.costPerAdmission.toLocaleString()}`}
                        </span>
                      </td>
                      <td className="text-right px-4 py-4">
                        <span className={`font-bold text-sm ${calc.roi > 1000 ? "text-[#10B981]" : calc.roi > 500 ? "text-emerald-600" : "text-foreground"}`}>
                          {calc.costPerLead === 0 ? "∞" : `${calc.roi.toLocaleString()}%`}
                        </span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          calc.exclusivity.includes("Exclusive")
                            ? "bg-[#10B981]/10 text-[#10B981] font-semibold"
                            : calc.exclusivity === "None"
                            ? "bg-red-50 text-red-500"
                            : "bg-amber-50 text-amber-600"
                        }`}>
                          {calc.exclusivity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-6 py-3 bg-muted/30 text-xs text-muted-foreground">
              * SAMHSA is a free directory listing with no direct lead cost, but very low conversion due to passive traffic.
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {calculations.map((calc) => {
              const isRL = calc.name === "RehabLookup";
              return (
                <div
                  key={calc.name}
                  className={`rounded-xl border p-5 ${isRL ? "border-[#1B365D] bg-[#1B365D]/5 ring-2 ring-[#1B365D]/20" : "border-border bg-card"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calc.color }} />
                    <span className="font-semibold text-foreground">{calc.name}</span>
                    {isRL && <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 text-[10px]">BEST VALUE</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Cost/Lead</p>
                      <p className="font-semibold">{calc.costPerLead === 0 ? "Free" : `$${calc.costPerLead}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly Cost</p>
                      <p className="font-semibold">{calc.totalCost === 0 ? "Free" : `$${calc.totalCost.toLocaleString()}`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Conv. Rate</p>
                      <p className={`font-semibold ${isRL ? "text-[#10B981]" : ""}`}>{calc.avgConversionRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Cost/Admission</p>
                      <p className={`font-bold ${isRL ? "text-[#10B981]" : calc.costPerAdmission > 1000 ? "text-red-500" : ""}`}>
                        {calc.costPerAdmission === 0 ? "N/A" : `$${calc.costPerAdmission.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      calc.exclusivity.includes("Exclusive") ? "bg-[#10B981]/10 text-[#10B981]" : "bg-amber-50 text-amber-600"
                    }`}>
                      {calc.exclusivity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Savings Highlight */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-gradient-to-br from-[#1B365D] to-[#2C4A7F] text-white rounded-2xl p-6 md:p-8">
            <TrendingDown className="h-8 w-8 text-[#0EA5E9] mb-3" />
            <p className="text-white/70 text-sm mb-1">vs Google Ads</p>
            <p className="text-3xl font-bold mb-1">
              {googleAdsCalc.costPerAdmission > 0 ? `${Math.round(((googleAdsCalc.costPerAdmission - rehabLookupCalc.costPerAdmission) / googleAdsCalc.costPerAdmission) * 100)}%` : "—"}
            </p>
            <p className="text-white/70 text-sm">lower cost per admission</p>
            <p className="text-white/50 text-xs mt-3">
              Save ${(googleAdsCalc.totalCost - rehabLookupCalc.totalCost).toLocaleString()}/mo on lead spend
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#10B981] to-[#059669] text-white rounded-2xl p-6 md:p-8">
            <DollarSign className="h-8 w-8 text-emerald-200 mb-3" />
            <p className="text-white/70 text-sm mb-1">Your Monthly Revenue</p>
            <p className="text-3xl font-bold mb-1">
              ${rehabLookupCalc.revenue.toLocaleString()}
            </p>
            <p className="text-white/70 text-sm">from {rehabLookupCalc.admissions} admissions</p>
            <p className="text-white/50 text-xs mt-3">
              {rehabLookupCalc.roi.toLocaleString()}% return on investment
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white rounded-2xl p-6 md:p-8">
            <Star className="h-8 w-8 text-amber-300 mb-3" />
            <p className="text-white/70 text-sm mb-1">With Pro (20% off leads)</p>
            <p className="text-3xl font-bold mb-1">
              ${proLeadCost}/lead
            </p>
            <p className="text-white/70 text-sm">Save ${proSavings.toLocaleString()}/month extra</p>
            <button
              onClick={() => setShowProComparison(!showProComparison)}
              className="text-white/80 text-xs mt-3 underline hover:text-white transition-colors"
            >
              {showProComparison ? "Hide" : "Show"} Pro breakdown →
            </button>
          </div>
        </motion.section>

        {/* Pro Comparison Expand */}
        {showProComparison && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-gradient-to-r from-[#7C3AED]/5 to-[#A78BFA]/5 border border-[#7C3AED]/20 rounded-2xl p-6 md:p-8 mb-12"
          >
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#7C3AED]" />
              RehabLookup Pro vs Free
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-5 border border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Free Plan</p>
                <p className="text-2xl font-bold text-foreground mb-1">${rehabLookupCalc.totalCost.toLocaleString()}/mo</p>
                <p className="text-sm text-muted-foreground">$39/lead × {monthlyLeads} leads</p>
                <p className="text-sm text-muted-foreground mt-1">Cost/admission: ${rehabLookupCalc.costPerAdmission.toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-xl p-5 border-2 border-[#7C3AED]/30">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-[#7C3AED]">Pro Plan</p>
                  <Badge className="bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20 text-[10px]">⭐ 20% OFF</Badge>
                </div>
                <p className="text-2xl font-bold text-[#7C3AED] mb-1">${proTotalCost.toLocaleString()}/mo</p>
                <p className="text-sm text-muted-foreground">${proLeadCost}/lead × {monthlyLeads} leads</p>
                <p className="text-sm text-[#10B981] font-medium mt-1">
                  You save ${proSavings.toLocaleString()}/month
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Why RehabLookup Converts Better */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Why RehabLookup Leads Convert 3x Better
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            The secret isn't more leads — it's better leads. Here's what makes exclusive leads outperform shared directories.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "24-Hour Exclusivity",
                description: "Each lead goes ONLY to your facility for 24 hours. No bidding war. No racing other providers. Just you and the family.",
                stat: "24h",
                statLabel: "exclusive window",
              },
              {
                icon: Users,
                title: "Verified Contact Info",
                description: "Every lead includes verified name, phone, and email. No fake submissions, no bots, no tire-kickers. Real families, real intent.",
                stat: "100%",
                statLabel: "verified leads",
              },
              {
                icon: Clock,
                title: "Speed = Placements",
                description: "Facilities that respond within 1 hour convert at 5x the rate. Our exclusive window gives you time to respond thoughtfully.",
                stat: "5x",
                statLabel: "faster conversion",
              },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-[#1B365D]/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-[#1B365D]" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1B365D]">{item.stat}</span>
                  <span className="text-xs text-muted-foreground">{item.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Platform Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Platform-by-Platform Breakdown
          </h2>
          <div className="space-y-4">
            {calculations.map((calc) => {
              const isRL = calc.name === "RehabLookup";
              return (
                <div
                  key={calc.name}
                  className={`rounded-xl border p-5 md:p-6 ${isRL ? "border-[#1B365D] bg-[#1B365D]/5" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: calc.color }} />
                      <h3 className={`font-semibold ${isRL ? "text-[#1B365D]" : "text-foreground"}`}>
                        {calc.name}
                        {isRL && <Badge className="ml-2 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 text-[10px]">RECOMMENDED</Badge>}
                      </h3>
                    </div>
                    <span className={`text-lg font-bold ${isRL ? "text-[#10B981]" : calc.costPerAdmission > 1000 ? "text-red-500" : "text-foreground"}`}>
                      {calc.costPerAdmission === 0 ? "N/A" : `$${calc.costPerAdmission.toLocaleString()}`}
                      <span className="text-xs text-muted-foreground font-normal ml-1">/admission</span>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{calc.notes}</p>
                  {isRL && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full">✓ Exclusive leads</span>
                      <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full">✓ Verified contact info</span>
                      <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full">✓ No contracts</span>
                      <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full">✓ Pay-per-lead only</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Visual Bar Chart */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16"
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#0EA5E9]" />
            Cost Per Admission — Visual Comparison
          </h2>
          <div className="space-y-4">
            {calculations
              .filter((c) => c.costPerAdmission > 0)
              .sort((a, b) => b.costPerAdmission - a.costPerAdmission)
              .map((calc) => {
                const maxCost = Math.max(...calculations.filter(c => c.costPerAdmission > 0).map((c) => c.costPerAdmission));
                const widthPct = (calc.costPerAdmission / maxCost) * 100;
                const isRL = calc.name === "RehabLookup";
                return (
                  <div key={calc.name} className="flex items-center gap-4">
                    <div className="w-32 md:w-40 text-sm font-medium text-foreground truncate flex-shrink-0">
                      {calc.name}
                    </div>
                    <div className="flex-1 bg-muted/30 rounded-full h-8 relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${widthPct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full flex items-center justify-end pr-3"
                        style={{ backgroundColor: isRL ? "#10B981" : calc.color }}
                      >
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          ${calc.costPerAdmission.toLocaleString()}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-[#1B365D] to-[#2C4A7F] text-white rounded-2xl p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to Lower Your Cost Per Admission?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            List your facility for free and start receiving exclusive, verified leads at $39 each. No contracts, no setup fees, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-[#1B365D] hover:bg-white/90 font-semibold px-8">
              <Link to="/provider-signup">
                List Your Facility Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/for-providers">
                Learn More <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/60">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Free to list</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> No contracts</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Cancel anytime</span>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default ProviderROICalculator;
