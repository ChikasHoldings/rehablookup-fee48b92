import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, TrendingDown, DollarSign, Clock, Users } from "lucide-react";

const COMPETITORS = [
  { name: "Google Ads (PPC)", costPerLead: 185, convRate: 3.5, exclusivity: "None", color: "hsl(var(--destructive))" },
  { name: "Rehabs.com", costPerLead: 75, convRate: 5, exclusivity: "Shared (4-8)", color: "hsl(var(--muted-foreground))" },
  { name: "Recovery.org", costPerLead: 65, convRate: 4, exclusivity: "Shared (3-5)", color: "hsl(var(--muted-foreground))" },
  { name: "SAMHSA", costPerLead: 0, convRate: 2, exclusivity: "Public listing", color: "hsl(var(--muted-foreground))" },
  { name: "RehabLookup", costPerLead: 39, convRate: 12, exclusivity: "24h Exclusive", color: "hsl(var(--primary))" },
];

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

export function ROICalculatorWidget() {
  const [monthlyLeads, setMonthlyLeads] = useState(20);
  const [treatmentType, setTreatmentType] = useState("Residential (30-day)");

  const revenuePerAdmission = TREATMENT_TYPES[treatmentType] || 28000;

  const calculations = useMemo(() => {
    return COMPETITORS.map((c) => {
      const totalCost = c.costPerLead * monthlyLeads;
      const admissions = Math.round((monthlyLeads * c.convRate) / 100 * 10) / 10;
      const costPerAdmission = admissions > 0 ? Math.round(totalCost / admissions) : 0;
      const revenue = admissions * revenuePerAdmission;
      const roi = totalCost > 0 ? Math.round(((revenue - totalCost) / totalCost) * 100) : 0;
      return { ...c, totalCost, admissions, costPerAdmission, revenue, roi };
    });
  }, [monthlyLeads, revenuePerAdmission]);

  const rl = calculations[calculations.length - 1];
  const google = calculations[0];
  const maxCost = Math.max(...calculations.filter(c => c.costPerAdmission > 0).map(c => c.costPerAdmission));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Monthly Lead Volume</label>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{monthlyLeads}</span>
            <span className="text-sm text-muted-foreground">leads/mo</span>
          </div>
          <Slider value={[monthlyLeads]} onValueChange={([v]) => setMonthlyLeads(v)} min={5} max={100} step={5} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5</span><span>50</span><span>100</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Treatment Type</label>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">${(revenuePerAdmission / 1000).toFixed(0)}k</span>
            <span className="text-sm text-muted-foreground">avg revenue</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(TREATMENT_TYPES).map((type) => (
              <button
                key={type}
                onClick={() => setTreatmentType(type)}
                className={`text-left text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                  treatmentType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <TrendingDown className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">vs Google Ads</p>
          <p className="text-xl font-bold text-foreground">
            {google.costPerAdmission > 0 ? `${Math.round(((google.costPerAdmission - rl.costPerAdmission) / google.costPerAdmission) * 100)}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">lower cost/admission</p>
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4">
          <DollarSign className="h-5 w-5 text-emerald-600 mb-2" />
          <p className="text-xs text-muted-foreground">Projected Revenue</p>
          <p className="text-xl font-bold text-foreground">${rl.revenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{rl.admissions} admissions/mo</p>
        </div>
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <ShieldCheck className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Your ROI</p>
          <p className="text-xl font-bold text-foreground">{rl.roi.toLocaleString()}%</p>
          <p className="text-xs text-muted-foreground">return on spend</p>
        </div>
      </div>

      {/* Visual Bars */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Cost Per Admission Comparison</h3>
        <div className="space-y-3">
          {calculations
            .filter(c => c.costPerAdmission > 0)
            .sort((a, b) => b.costPerAdmission - a.costPerAdmission)
            .map((calc) => {
              const isRL = calc.name === "RehabLookup";
              const widthPct = (calc.costPerAdmission / maxCost) * 100;
              return (
                <div key={calc.name} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-foreground truncate shrink-0">
                    {calc.name}
                    {isRL && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600">YOU</Badge>}
                  </div>
                  <div className="flex-1 bg-muted/40 rounded-full h-7 relative overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2.5 transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isRL ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                      }}
                    >
                      <span className={`text-xs font-bold ${isRL ? "text-primary-foreground" : "text-foreground"}`}>
                        ${calc.costPerAdmission.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">Platform</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">$/Lead</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Monthly</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">Conv.</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">$/Admission</th>
              <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground">Exclusivity</th>
            </tr>
          </thead>
          <tbody>
            {calculations.map((calc, i) => {
              const isRL = calc.name === "RehabLookup";
              return (
                <tr key={calc.name} className={`border-b border-border ${isRL ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    {calc.name}
                    {isRL && <Badge className="ml-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1 py-0">BEST</Badge>}
                  </td>
                  <td className="text-right py-2.5 px-3">{calc.costPerLead === 0 ? "Free" : `$${calc.costPerLead}`}</td>
                  <td className="text-right py-2.5 px-3">{calc.totalCost === 0 ? "Free" : `$${calc.totalCost.toLocaleString()}`}</td>
                  <td className={`text-right py-2.5 px-3 ${isRL ? "text-emerald-600 font-semibold" : ""}`}>{calc.convRate}%</td>
                  <td className={`text-right py-2.5 px-3 font-semibold ${isRL ? "text-emerald-600" : calc.costPerAdmission > 1000 ? "text-destructive" : ""}`}>
                    {calc.costPerAdmission === 0 ? "N/A" : `$${calc.costPerAdmission.toLocaleString()}`}
                  </td>
                  <td className="text-center py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      calc.exclusivity.includes("Exclusive") ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {calc.exclusivity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Why it works */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { icon: ShieldCheck, label: "24h Exclusive", desc: "No competing facilities" },
          { icon: Users, label: "Verified Leads", desc: "Real families, real intent" },
          { icon: Clock, label: "Respond First", desc: "5x higher conversion" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30">
            <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
