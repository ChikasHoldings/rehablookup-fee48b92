import React from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { 
  Phone, Globe, TrendingUp, ArrowUpRight, ArrowDownRight, Eye, Building2,
  MousePointerClick, MessageSquare, Star,
} from "lucide-react";
import { useCentralizedEngagementAnalytics } from "@/hooks/useCentralizedEngagementAnalytics";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useProStatus } from "@/hooks/useProStatus";
import { useCentralizedLeadAnalytics } from "@/hooks/useCentralizedLeadAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type DateRange } from "@/hooks/useLeadAnalytics";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CentralizedEngagementAnalyticsProps {
  dateRange?: DateRange;
  facilityId?: string;
}

export function CentralizedEngagementAnalytics({ dateRange, facilityId }: CentralizedEngagementAnalyticsProps) {
  const { data: analytics, isLoading } = useCentralizedEngagementAnalytics(dateRange, facilityId);
  const { data: leadAnalytics, isLoading: leadsLoading } = useCentralizedLeadAnalytics(dateRange, facilityId);
  const { data: proStatus } = useProStatus();
  const { facilities } = useProviderFacilities();

  const isPro = proStatus?.isPro || false;
  const hasApprovedListing = facilities.some(f => f.status === "approved");

  if (isLoading || leadsLoading) return <EngagementSkeleton />;

  const periodListingViews = analytics?.periodListingViews || 0;
  const totalListingViews = analytics?.totalListingViews || 0;
  const listingViewsGrowth = analytics?.listingViewGrowth || 0;
  const totalInquiries = leadAnalytics?.allTimeLeads || 0;
  const periodInquiries = leadAnalytics?.thisMonthLeads || 0;
  const inquiryGrowth = leadAnalytics?.growthRate || 0;

  const hasData = isPro
    ? !!analytics && (periodListingViews > 0 || analytics.periodClickToCalls > 0 || analytics.periodWebsiteClicks > 0)
    : !!analytics && (periodListingViews > 0 || periodInquiries > 0);

  if (!hasData) return <EmptyEngagement hasApprovedListing={hasApprovedListing} />;

  const hasMultipleFacilities = !facilityId && analytics?.facilityBreakdown && analytics.facilityBreakdown.length > 1;
  const viewToCallRate = analytics?.viewToCallRate || 0;
  const viewToWebsiteRate = analytics?.viewToWebsiteRate || 0;
  const viewToInquiryRate = periodListingViews > 0 ? Math.round((periodInquiries / periodListingViews) * 100) : 0;
  const proEngagementRate = periodListingViews > 0 && analytics
    ? Math.round(((analytics.periodClickToCalls + analytics.periodWebsiteClicks) / periodListingViews) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* KPI Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <KPICard title="Listing Views" value={periodListingViews} total={totalListingViews} icon={Eye} trend={listingViewsGrowth} color="primary" />
        {isPro ? (
          <>
            <KPICard title="Call Clicks" value={analytics?.periodClickToCalls || 0} total={analytics?.totalClickToCalls || 0} icon={Phone} trend={analytics?.clickToCallGrowth} color="emerald" />
            <KPICard title="Website Clicks" value={analytics?.periodWebsiteClicks || 0} total={analytics?.totalWebsiteClicks || 0} icon={Globe} trend={analytics?.websiteClickGrowth} color="blue" />
            <KPICard title="Engagement Rate" value={`${proEngagementRate}%`} icon={MousePointerClick} color="purple" />
          </>
        ) : (
          <>
            <KPICard title="Inquiries" value={periodInquiries} total={totalInquiries} icon={MessageSquare} trend={inquiryGrowth} color="emerald" />
            <KPICard title="View → Inquiry" value={`${viewToInquiryRate}%`} icon={MousePointerClick} color="purple" />
            <KPICard title="Total Views" value={totalListingViews} icon={Eye} color="blue" />
          </>
        )}
      </div>

      {/* Pro Conversion Rates */}
      {isPro && periodListingViews > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Conversion Rates</span>
          </div>
          <div className="grid grid-cols-3 divide-x">
            <ConversionCell label="Total Engagement" value={`${proEngagementRate}%`} desc="Views → any action" />
            <ConversionCell label="View → Call" value={`${viewToCallRate}%`} desc="Views → phone clicks" />
            <ConversionCell label="View → Website" value={`${viewToWebsiteRate}%`} desc="Views → site clicks" />
          </div>
        </div>
      )}

      {/* Per-Facility Breakdown */}
      {hasMultipleFacilities && analytics && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">By Location</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.facilityBreakdown.map((facility) => (
              <div key={facility.facilityId} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <p className="font-medium text-xs text-foreground truncate mb-2">{facility.facilityName}</p>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">{facility.listingViews}</span>
                  </div>
                  {isPro ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span className="text-muted-foreground">{facility.clickToCalls}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-600" />
                        <span className="text-muted-foreground">{facility.websiteClicks}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 col-span-2">
                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                      <span className="text-muted-foreground">
                        {leadAnalytics?.facilityBreakdown.find(f => f.facilityId === facility.facilityId)?.totalLeads || 0} inquiries
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {analytics && analytics.dailyTrends.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Engagement Trends</span>
            </div>
            <div className="flex items-center gap-2.5">
              <LegendDot color="hsl(var(--primary))" label="Views" />
              {isPro && (
                <>
                  <LegendDot color="hsl(142, 71%, 45%)" label="Calls" />
                  <LegendDot color="hsl(217, 91%, 60%)" label="Website" />
                </>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrends} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="engViewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="engCallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="engWebGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)", padding: "8px 12px", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 2, fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="listingViews" name="Listing Views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#engViewGrad)" dot={false} />
                  {isPro && (
                    <>
                      <Area type="monotone" dataKey="clickToCalls" name="Call Clicks" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#engCallGrad)" dot={false} />
                      <Area type="monotone" dataKey="websiteClicks" name="Website Clicks" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#engWebGrad)" dot={false} />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="rounded-lg border border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs">Upgrade to Pro for Direct Contact</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enable families to call you directly and visit your website</p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 h-8 text-xs">
              <Link to="/provider/pro-upgrade"><Star className="h-3 w-3 mr-1" /> Upgrade to Pro</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ Sub-Components ══════════════════════════ */

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600" },
};

function KPICard({ title, value, total, icon: Icon, trend, color }: {
  title: string; value: number | string; total?: number; icon: React.ComponentType<{ className?: string }>;
  trend?: number; color: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="rounded-md border px-2.5 py-2 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={cn("h-3 w-3", c.text)} />
        </div>
        <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            "ml-auto text-[9px] font-semibold flex items-center shrink-0",
            trend > 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-base font-bold text-foreground leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {total !== undefined && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{total.toLocaleString()} all time</p>}
    </div>
  );
}

function ConversionCell({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="p-3 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function EngagementSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
      </div>
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}

function EmptyEngagement({ hasApprovedListing }: { hasApprovedListing: boolean }) {
  return (
    <div className="py-14 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <TrendingUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">No Engagement Data Yet</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">
        {hasApprovedListing
          ? "Your listing is live! Once it receives views, engagement analytics will appear here."
          : "Once your listings start receiving views, detailed engagement analytics will appear here."}
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to={hasApprovedListing ? "/provider/dashboard" : "/provider/listings"}>
          {hasApprovedListing ? "View Dashboard" : "Complete Your Listing"}
        </Link>
      </Button>
    </div>
  );
}
