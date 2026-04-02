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

  if (isLoading || leadsLoading) {
    return <EngagementSkeleton />;
  }

  // Use values directly from hook (now sourced from facility_views)
  const periodListingViews = analytics?.periodListingViews || 0;
  const totalListingViews = analytics?.totalListingViews || 0;
  const listingViewsGrowth = analytics?.listingViewGrowth || 0;

  // Get inquiry data for Free accounts
  const totalInquiries = leadAnalytics?.totalLeads || 0;
  const periodInquiries = leadAnalytics?.thisMonthLeads || 0;
  const inquiryGrowth = leadAnalytics?.growthRate || 0;

  // For Pro: check if there's engagement data
  // For Free: check if there's view or inquiry data
  const hasData = isPro 
    ? analytics && (totalListingViews > 0 || analytics.totalClickToCalls > 0 || analytics.totalWebsiteClicks > 0)
    : analytics && (totalListingViews > 0 || totalInquiries > 0);

  if (!hasData) {
    return <EmptyEngagement hasApprovedListing={hasApprovedListing} />;
  }

  const hasMultipleFacilities = analytics?.facilityBreakdown && analytics.facilityBreakdown.length > 1;

  // Calculate conversion rates based on tier
  const viewToCallRate = analytics?.viewToCallRate || 0;
  const viewToWebsiteRate = analytics?.viewToWebsiteRate || 0;
  const viewToInquiryRate = periodListingViews > 0 
    ? Math.round((periodInquiries / periodListingViews) * 100) 
    : 0;

  // Pro engagement rate (calls + website clicks)
  const proEngagementRate = periodListingViews > 0 && analytics
    ? Math.round(((analytics.periodClickToCalls + analytics.periodWebsiteClicks) / periodListingViews) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Account Status Indicator */}
      <Card className={isPro ? "border-amber-200 bg-gradient-to-r from-amber-50/50 to-amber-100/30" : "border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10"}>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${isPro ? "bg-amber-500/10" : "bg-primary/10"} flex items-center justify-center`}>
                {isPro ? (
                  <Star className="h-5 w-5 text-amber-600" />
                ) : (
                  <Eye className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{isPro ? "Pro Member" : "Free Account"}</span>
                  {isPro && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      <Phone className="h-3 w-3 mr-1" /> Direct Contact Enabled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isPro 
                    ? "Individuals and families can call you directly or visit your website" 
                    : "Individuals and families contact you through inquiry requests"}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {totalListingViews}
                </span>
                <span className="text-muted-foreground">total views</span>
              </div>
              <p className="text-xs text-muted-foreground">{periodListingViews} in selected period</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Facility Breakdown (if multiple) */}
      {hasMultipleFacilities && analytics && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Engagement by Location</CardTitle>
                <CardDescription className="text-xs">Performance breakdown per facility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.facilityBreakdown.map((facility) => (
                <div
                  key={facility.facilityId}
                  className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-sm text-foreground truncate mb-2">{facility.facilityName}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">{facility.listingViews} views</span>
                    </div>
                    {isPro ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">{facility.clickToCalls} calls</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-blue-600" />
                          <span className="text-muted-foreground">{facility.websiteClicks} clicks</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <MessageSquare className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">
                          {leadAnalytics?.facilityBreakdown.find(f => f.facilityId === facility.facilityId)?.totalLeads || 0} inquiries
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats - Different KPIs based on tier */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Listing Views"
          value={periodListingViews}
          icon={Eye}
          trend={listingViewsGrowth}
          subtitle="Profile page views"
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        {isPro ? (
          <>
            <StatCard
              title="Call Clicks"
              value={analytics?.periodClickToCalls || 0}
              icon={Phone}
              trend={analytics?.clickToCallGrowth}
              subtitle="Direct phone clicks"
              iconBg="bg-green-500/10"
              iconColor="text-green-600"
            />
            <StatCard
              title="Website Clicks"
              value={analytics?.periodWebsiteClicks || 0}
              icon={Globe}
              trend={analytics?.websiteClickGrowth}
              subtitle="Website link clicks"
              iconBg="bg-blue-500/10"
              iconColor="text-blue-600"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Inquiry Requests"
              value={periodInquiries}
              icon={MessageSquare}
              trend={inquiryGrowth}
              subtitle="Individuals and families requesting contact"
              iconBg="bg-green-500/10"
              iconColor="text-green-600"
            />
            <StatCard
              title="View → Inquiry Rate"
              value={`${viewToInquiryRate}%`}
              icon={MousePointerClick}
              subtitle="Conversion from views"
              iconBg="bg-purple-500/10"
              iconColor="text-purple-600"
            />
          </>
        )}
      </div>

      {/* Conversion Rates - Pro only */}
      {isPro && periodListingViews > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Engagement Rate</p>
                  <p className="text-2xl font-bold text-foreground">{proEngagementRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of views that led to any action
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">View → Call Rate</p>
                  <p className="text-2xl font-bold text-foreground">{viewToCallRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of views that led to calls
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">View → Website Rate</p>
                  <p className="text-2xl font-bold text-foreground">{viewToWebsiteRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of views that clicked website
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Trends Chart */}
      {analytics && analytics.dailyTrends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Engagement Trends</CardTitle>
                  <CardDescription className="text-xs">
                    {hasMultipleFacilities ? "Combined daily activity" : "Daily views and interactions"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Listing Views</span>
                </div>
                {isPro && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Calls</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs text-muted-foreground">Website</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="listingViewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="centralCallGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="centralWebsiteGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="listingViews" 
                    name="Listing Views"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#listingViewsGradient)"
                    dot={false}
                  />
                  {isPro && (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="clickToCalls" 
                        name="Call Clicks"
                        stroke="hsl(142, 71%, 45%)" 
                        strokeWidth={2}
                        fill="url(#centralCallGradient)"
                        dot={false}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="websiteClicks" 
                        name="Website Clicks"
                        stroke="hsl(217, 91%, 60%)" 
                        strokeWidth={2}
                        fill="url(#centralWebsiteGradient)"
                        dot={false}
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA for Free users */}
      {!isPro && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Upgrade to Pro for Direct Contact</p>
                  <p className="text-sm text-muted-foreground">
                    Enable individuals and families to call you directly and visit your website
                  </p>
                </div>
              </div>
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                <Link to="/provider/billing?tab=pro">
                  <Star className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, icon: Icon, trend, subtitle, iconBg, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <Badge 
              variant="outline" 
              className={trend > 0 
                ? "bg-green-500/10 text-green-600 border-green-200 text-[10px] px-1.5" 
                : "bg-red-500/10 text-red-600 border-red-200 text-[10px] px-1.5"
              }
            >
              {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

function EmptyEngagement({ hasApprovedListing }: { hasApprovedListing: boolean }) {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Engagement Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {hasApprovedListing
            ? "Your listing is live! Once it starts receiving views and interactions, you'll see detailed engagement analytics here."
            : "Once your listings start receiving views and interactions, you'll see detailed engagement analytics here."
          }
        </p>
        <Button variant="outline" asChild>
          <Link to={hasApprovedListing ? "/provider/dashboard" : "/provider/listings"}>
            {hasApprovedListing ? "View Dashboard" : "Complete Your Listing"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
