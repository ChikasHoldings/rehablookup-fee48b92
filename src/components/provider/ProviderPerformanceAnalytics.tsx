import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy, TrendingUp, ArrowUpRight, Eye, MessageSquare, Target, Building2 } from "lucide-react";
import { useCentralizedEngagementAnalytics } from "@/hooks/useCentralizedEngagementAnalytics";
import { useCentralizedLeadAnalytics } from "@/hooks/useCentralizedLeadAnalytics";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type DateRange } from "@/hooks/useLeadAnalytics";
import { cn } from "@/lib/utils";

interface ProviderPerformanceAnalyticsProps {
  dateRange?: DateRange;
  facilityId?: string;
}

const BAR_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 65%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

export function ProviderPerformanceAnalytics({ dateRange, facilityId }: ProviderPerformanceAnalyticsProps) {
  const { data: engagement, isLoading: engLoading } = useCentralizedEngagementAnalytics(dateRange, facilityId);
  const { data: leads, isLoading: leadsLoading } = useCentralizedLeadAnalytics(dateRange, facilityId);
  const { facilities } = useProviderFacilities();

  if (engLoading || leadsLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const totalViews = engagement?.periodListingViews || 0;
  const totalLeads = leads?.thisMonthLeads || 0;
  const converted = leads?.conversionFunnel.converted || 0;
  const viewToLeadRate = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0;
  const leadToConversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const hasData = totalViews > 0 || totalLeads > 0;

  if (!hasData) {
    return (
      <div className="py-14 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Trophy className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No Performance Data Yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Performance metrics will appear once your listings start receiving views and inquiries.
        </p>
      </div>
    );
  }

  // Build facility comparison data
  const facilityComparisonData = (engagement?.facilityBreakdown || []).map((fb) => {
    const leadFacility = leads?.facilityBreakdown.find(lf => lf.facilityId === fb.facilityId);
    return {
      name: fb.facilityName.length > 20 ? fb.facilityName.slice(0, 18) + "…" : fb.facilityName,
      impressions: fb.impressions,
      views: fb.profileViews,
      calls: fb.clickToCalls,
      website: fb.websiteClicks,
      leads: leadFacility?.totalLeads || 0,
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // Ranked listings
  const rankedListings = [...facilityComparisonData].sort((a, b) => {
    const scoreA = a.impressions + (a.views * 3) + (a.calls * 10) + (a.website * 5) + (a.leads * 20);
    const scoreB = b.impressions + (b.views * 3) + (b.calls * 10) + (b.website * 5) + (b.leads * 20);
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-5">
      {/* Performance KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <PerfCard title="Total Views" value={totalViews} icon={Eye} color="primary" />
        <PerfCard title="Total Leads" value={totalLeads} icon={MessageSquare} color="blue" />
        <PerfCard title="View → Lead" value={`${viewToLeadRate}%`} icon={TrendingUp} color="purple" />
        <PerfCard title="Lead → Convert" value={`${leadToConversionRate}%`} icon={Target} color="emerald" />
      </div>

      {/* Facility Comparison Chart */}
      {facilityComparisonData.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Facility Comparison</span>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityComparisonData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)", padding: "8px 12px", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, fontSize: "11px" }}
                  />
                  <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
                  <Bar dataKey="leads" name="Leads" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} barSize={14} />
                  <Bar dataKey="converted" name="Converted" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <LegendItem color="hsl(var(--primary))" label="Views" />
              <LegendItem color="hsl(217, 91%, 60%)" label="Leads" />
              <LegendItem color="hsl(142, 71%, 45%)" label="Converted" />
            </div>
          </div>
        </div>
      )}

      {/* Top Performing Listings */}
      {rankedListings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Listing Rankings</span>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Facility</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Views</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Converted</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {rankedListings.map((listing, idx) => {
                  const score = listing.views + (listing.leads * 5) + (listing.converted * 20);
                  return (
                    <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">1</span>
                        ) : (
                          <span className="text-muted-foreground font-medium">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">{listing.name}</td>
                      <td className="text-right px-4 py-3.5 text-muted-foreground">{listing.views}</td>
                      <td className="text-right px-4 py-3.5 text-muted-foreground">{listing.leads}</td>
                      <td className="text-right px-4 py-3.5">
                        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          {listing.converted}
                        </Badge>
                      </td>
                      <td className="text-right px-4 py-3.5 font-bold text-foreground">{score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ Sub-Components ══════════════════════════ */

const PERF_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600" },
};

function PerfCard({ title, value, icon: Icon, color }: {
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  const c = PERF_COLOR_MAP[color] || PERF_COLOR_MAP.primary;
  return (
    <div className="rounded-md border px-2.5 py-2 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("h-3 w-3", c.text)} />
        </div>
        <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
      </div>
      <p className="text-base font-bold text-foreground leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
