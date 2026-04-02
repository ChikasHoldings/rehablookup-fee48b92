import React from "react";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Phone, 
  Globe,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Building2,
  MousePointerClick,
  MessageSquare,
  Star,
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
}

export function CentralizedEngagementAnalytics({ dateRange }: CentralizedEngagementAnalyticsProps) {
  const { data: analytics, isLoading } = useCentralizedEngagementAnalytics(dateRange);
  const { data: leadAnalytics, isLoading: leadsLoading } = useCentralizedLeadAnalytics(dateRange);
  const { data: proStatus } = useProStatus();
  const { facilities } = useProviderFacilities();

  const isPro = proStatus?.isPro || false;
  const hasApprovedListing = facilities.some(f => f.status === "approved");

  if (isLoading || leadsLoading) return <EngagementSkeleton />;

  const periodListingViews = analytics?.periodListingViews || 0;
  const totalListingViews = analytics?.totalListingViews || 0;
  const listingViewsGrowth = analytics?.listingViewGrowth || 0;

  const totalInquiries = leadAnalytics?.totalLeads || 0;
  const periodInquiries = leadAnalytics?.thisMonthLeads || 0;
  const inquiryGrowth = leadAnalytics?.growthRate || 0;

  const hasData = isPro 
    ? analytics && (totalListingViews > 0 || analytics.totalClickToCalls > 0 || analytics.totalWebsiteClicks > 0)
    : analytics && (totalListingViews > 0 || totalInquiries > 0);

  if (!hasData) return <EmptyEngagement hasApprovedListing={hasApprovedListing} />;

  const hasMultipleFacilities = analytics?.facilityBreakdown && analytics.facilityBreakdown.length > 1;
  const viewToCallRate = analytics?.viewToCallRate || 0;
  const viewToWebsiteRate = analytics?.viewToWebsiteRate || 0;
  const viewToInquiryRate = periodListingViews > 0 ? Math.round((periodInquiries / periodListingViews) * 100) : 0;
  const proEngagementRate = periodListingViews > 0 && analytics
    ? Math.round(((analytics.periodClickToCalls + analytics.periodWebsiteClicks) / periodListingViews) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Account Overview ── */}
      <div className={cn(
        "rounded-xl p-5 border",
        isPro ? "bg-amber-500/5 border-amber-200/50" : "bg-primary/5 border-primary/15"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isPro ? "bg-amber-500/10" : "bg-primary/10"
            )}>
              {isPro ? <Star className="h-5 w-5 text-amber-600" /> : <Eye className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{isPro ? "Pro Member" : "Free Account"}</span>
                {isPro && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                    <Phone className="h-3 w-3 mr-1" /> Direct Contact
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPro ? "Families can call you directly or visit your website" : "Families contact you through inquiry requests"}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-foreground">{totalListingViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{periodListingViews} in this period</p>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KPICard
          title="Listing Views"
          value={periodListingViews}
          icon={Eye}
          trend={listingViewsGrowth}
          subtitle="Profile page views"
          color="primary"
        />
        {isPro ? (
          <>
            <KPICard
              title="Call Clicks"
              value={analytics?.periodClickToCalls || 0}
              icon={Phone}
              trend={analytics?.clickToCallGrowth}
              subtitle="Direct phone clicks"
              color="emerald"
            />
            <KPICard
              title="Website Clicks"
              value={analytics?.periodWebsiteClicks || 0}
              icon={Globe}
              trend={analytics?.websiteClickGrowth}
              subtitle="Website link clicks"
              color="blue"
            />
          </>
        ) : (
          <>
            <KPICard
              title="Inquiry Requests"
              value={periodInquiries}
              icon={MessageSquare}
              trend={inquiryGrowth}
              subtitle="Families requesting contact"
              color="emerald"
            />
            <KPICard
              title="View → Inquiry"
              value={`${viewToInquiryRate}%`}
              icon={MousePointerClick}
              subtitle="Conversion from views"
              color="purple"
            />
          </>
        )}
      </div>

      {/* ── Pro Conversion Rates ── */}
      {isPro && periodListingViews > 0 && (
        <div className="grid grid-cols-3 rounded-xl border divide-x overflow-hidden">
          <ConversionCell label="Total Engagement" value={`${proEngagementRate}%`} desc="Views → any action" icon={MousePointerClick} />
          <ConversionCell label="View → Call" value={`${viewToCallRate}%`} desc="Views → phone clicks" icon={Phone} />
          <ConversionCell label="View → Website" value={`${viewToWebsiteRate}%`} desc="Views → site clicks" icon={Globe} />
        </div>
      )}

      {/* ── Per-Facility Breakdown ── */}
      {hasMultipleFacilities && analytics && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Engagement by Location</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.facilityBreakdown.map((facility) => (
              <div key={facility.facilityId} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                <p className="font-medium text-sm text-foreground truncate mb-2.5">{facility.facilityName}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">{facility.listingViews}</span>
                  </div>
                  {isPro ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span className="text-muted-foreground">{facility.clickToCalls}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-blue-600" />
                        <span className="text-muted-foreground">{facility.websiteClicks}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 col-span-2">
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

      {/* ── Trends Chart ── */}
      {analytics && analytics.dailyTrends.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Engagement Trends</h3>
            </div>
            <div className="flex items-center gap-3">
              <LegendDot color="hsl(var(--primary))" label="Views" />
              {isPro && (
                <>
                  <LegendDot color="hsl(142, 71%, 45%)" label="Calls" />
                  <LegendDot color="hsl(217, 91%, 60%)" label="Website" />
                </>
              )}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="engViewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="engCallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="engWebGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={35} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)",
                      padding: "10px 14px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
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

      {/* ── Upgrade CTA ── */}
      {!isPro && (
        <div className="rounded-xl border-2 border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Upgrade to Pro for Direct Contact</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable families to call you directly and visit your website
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              <Link to="/provider/billing?tab=pro">
                <Star className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Pro
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════ Sub-Components ══════════════════════════════════ */

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", ring: "ring-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", ring: "ring-purple-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", ring: "ring-amber-500/20" },
};

function KPICard({ title, value, icon: Icon, trend, subtitle, color }: {
  title: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  trend?: number; subtitle?: string; color: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  return (
    <div className="rounded-xl border p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon className={cn("h-4.5 w-4.5", c.text)} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <Badge variant="outline" className={cn(
            "text-[10px] px-1.5 py-0.5",
            trend > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-600 border-red-200"
          )}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{title}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ConversionCell({ label, value, desc, icon: Icon }: {
  label: string; value: string; desc: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-4 text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-2" />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function EngagementSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function EmptyEngagement({ hasApprovedListing }: { hasApprovedListing: boolean }) {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <TrendingUp className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">No Engagement Data Yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">
        {hasApprovedListing
          ? "Your listing is live! Once it receives views and interactions, engagement analytics will appear here."
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
