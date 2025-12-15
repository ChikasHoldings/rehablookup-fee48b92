import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";
import { CalendarIcon, TrendingUp, TrendingDown, Users, MousePointerClick, FileText, CheckCircle, CreditCard, DollarSign, UserMinus, RefreshCw, Filter, RotateCcw, Info, ArrowUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DatePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "custom";
type Grouping = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const PLAN_OPTIONS = ["All", "Basic", "Professional", "Featured"];

export default function AdminAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last30");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [grouping, setGrouping] = useState<Grouping>("daily");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "leads", direction: "desc" });

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (datePreset) {
      case "today":
        return { from: today, to: today };
      case "last7":
        return { from: subDays(today, 7), to: today };
      case "last30":
        return { from: subDays(today, 30), to: today };
      case "thisMonth":
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "thisQuarter":
        return { from: startOfQuarter(today), to: endOfQuarter(today) };
      case "lastQuarter":
        const lastQuarter = subQuarters(today, 1);
        return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
      case "thisYear":
        return { from: startOfYear(today), to: endOfYear(today) };
      case "lastYear":
        const lastYear = subYears(today, 1);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      case "custom":
        return { from: customDateRange.from || subDays(today, 30), to: customDateRange.to || today };
      default:
        return { from: subDays(today, 30), to: today };
    }
  }, [datePreset, customDateRange]);

  // Fetch facilities for location filtering
  const { data: facilities } = useQuery({
    queryKey: ["admin-analytics-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, status");
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique cities based on selected state
  const cities = useMemo(() => {
    if (!facilities) return [];
    const filtered = selectedState === "all" ? facilities : facilities.filter(f => f.state === selectedState);
    return [...new Set(filtered.map(f => f.city).filter(Boolean))].sort();
  }, [facilities, selectedState]);

  // Fetch views data
  const { data: viewsData, isLoading: isLoadingViews } = useQuery({
    queryKey: ["admin-analytics-views", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_views")
        .select("*, facilities!inner(city, state)")
        .gte("view_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("view_date", format(dateRange.to, "yyyy-MM-dd"));
      
      if (selectedState !== "all") {
        query = query.eq("facilities.state", selectedState);
      }
      if (selectedCity !== "all") {
        query = query.eq("facilities.city", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch interactions data
  const { data: interactionsData, isLoading: isLoadingInteractions } = useQuery({
    queryKey: ["admin-analytics-interactions", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_interactions")
        .select("*, facilities!inner(city, state)")
        .gte("interaction_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("interaction_date", format(dateRange.to, "yyyy-MM-dd"));
      
      if (selectedState !== "all") {
        query = query.eq("facilities.state", selectedState);
      }
      if (selectedCity !== "all") {
        query = query.eq("facilities.city", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch leads data
  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["admin-analytics-leads", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*, facilities!inner(city, state)")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());
      
      if (selectedState !== "all") {
        query = query.eq("facilities.state", selectedState);
      }
      if (selectedCity !== "all") {
        query = query.eq("facilities.city", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch subscription data via edge function
  const { data: subscriptionData, isLoading: isLoadingSubscriptions, refetch: refetchSubscriptions } = useQuery({
    queryKey: ["admin-analytics-subscriptions", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats", {
        body: {
          startDate: format(dateRange.from, "yyyy-MM-dd"),
          endDate: format(dateRange.to, "yyyy-MM-dd"),
        },
      });
      if (error) throw error;
      return data || { 
        activeSubscriptions: 0, 
        newSubscriptions: 0, 
        revenue: 0, 
        mrr: 0, 
        churnCount: 0, 
        churnRate: 0,
        upgrades: 0,
        downgrades: 0,
        subscriptionsByPlan: {},
        revenueOverTime: [],
        subscriptionsOverTime: []
      };
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalViews = viewsData?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
    const totalClicks = interactionsData?.reduce((sum, i) => sum + (i.interaction_count || 0), 0) || 0;
    const totalLeads = leadsData?.length || 0;
    const qualifiedLeads = leadsData?.filter(l => l.email_verified)?.length || 0;
    const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) : "0.00";

    return {
      visitors: totalViews,
      clicks: totalClicks,
      totalLeads,
      qualifiedLeads,
      conversionRate: parseFloat(conversionRate),
      activeSubscriptions: subscriptionData?.activeSubscriptions || 0,
      newSubscriptions: subscriptionData?.newSubscriptions || 0,
      revenue: subscriptionData?.revenue || 0,
      mrr: subscriptionData?.mrr || 0,
      churnRate: subscriptionData?.churnRate || 0,
      churnCount: subscriptionData?.churnCount || 0,
      upgrades: subscriptionData?.upgrades || 0,
      downgrades: subscriptionData?.downgrades || 0,
    };
  }, [viewsData, interactionsData, leadsData, subscriptionData]);

  // Generate time series data based on grouping
  const timeSeriesData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    let intervals: Date[];
    switch (grouping) {
      case "daily":
        intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        break;
      case "weekly":
        intervals = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to });
        break;
      case "monthly":
        intervals = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
        break;
      default:
        intervals = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    }

    return intervals.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const weekEnd = grouping === "weekly" ? format(endOfWeek(date), "yyyy-MM-dd") : dateStr;
      
      const views = viewsData?.filter(v => {
        const vDate = v.view_date;
        if (grouping === "weekly") {
          return vDate >= dateStr && vDate <= weekEnd;
        }
        if (grouping === "monthly") {
          return vDate.startsWith(format(date, "yyyy-MM"));
        }
        return vDate === dateStr;
      }).reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;

      const clicks = interactionsData?.filter(i => {
        const iDate = i.interaction_date;
        if (grouping === "weekly") {
          return iDate >= dateStr && iDate <= weekEnd;
        }
        if (grouping === "monthly") {
          return iDate.startsWith(format(date, "yyyy-MM"));
        }
        return iDate === dateStr;
      }).reduce((sum, i) => sum + (i.interaction_count || 0), 0) || 0;

      const leads = leadsData?.filter(l => {
        const lDate = format(new Date(l.created_at), "yyyy-MM-dd");
        if (grouping === "weekly") {
          return lDate >= dateStr && lDate <= weekEnd;
        }
        if (grouping === "monthly") {
          return lDate.startsWith(format(date, "yyyy-MM"));
        }
        return lDate === dateStr;
      }) || [];

      return {
        date: grouping === "monthly" ? format(date, "MMM yyyy") : format(date, "MMM dd"),
        visitors: views,
        clicks,
        leads: leads.length,
        qualifiedLeads: leads.filter(l => l.email_verified).length,
        unqualifiedLeads: leads.filter(l => !l.email_verified).length,
      };
    });
  }, [dateRange, grouping, viewsData, interactionsData, leadsData]);

  // Location performance data
  const locationPerformance = useMemo(() => {
    if (!facilities || !viewsData || !leadsData) return [];

    const locationMap = new Map<string, { state: string; city: string; visitors: number; clicks: number; leads: number; qualifiedLeads: number }>();

    facilities.forEach(f => {
      const key = `${f.state}-${f.city}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { state: f.state, city: f.city, visitors: 0, clicks: 0, leads: 0, qualifiedLeads: 0 });
      }
    });

    viewsData.forEach(v => {
      const f = v.facilities as any;
      const key = `${f.state}-${f.city}`;
      const loc = locationMap.get(key);
      if (loc) {
        loc.visitors += v.view_count || 0;
      }
    });

    interactionsData?.forEach(i => {
      const f = i.facilities as any;
      const key = `${f.state}-${f.city}`;
      const loc = locationMap.get(key);
      if (loc) {
        loc.clicks += i.interaction_count || 0;
      }
    });

    leadsData.forEach(l => {
      const f = l.facilities as any;
      const key = `${f.state}-${f.city}`;
      const loc = locationMap.get(key);
      if (loc) {
        loc.leads += 1;
        if (l.email_verified) loc.qualifiedLeads += 1;
      }
    });

    return Array.from(locationMap.values())
      .filter(l => l.visitors > 0 || l.leads > 0)
      .map(l => ({
        ...l,
        conversionRate: l.visitors > 0 ? ((l.leads / l.visitors) * 100).toFixed(2) : "0.00",
      }))
      .sort((a, b) => {
        const aVal = a[sortConfig.key as keyof typeof a];
        const bVal = b[sortConfig.key as keyof typeof b];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
  }, [facilities, viewsData, interactionsData, leadsData, sortConfig]);

  // Top cities by leads
  const topCitiesByLeads = useMemo(() => {
    return locationPerformance
      .filter(l => l.leads > 0)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 10);
  }, [locationPerformance]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleReset = () => {
    setDatePreset("last30");
    setGrouping("daily");
    setSelectedState("all");
    setSelectedCity("all");
    setSelectedPlan("All");
    setCustomDateRange({ from: undefined, to: undefined });
  };

  const isLoading = isLoadingViews || isLoadingInteractions || isLoadingLeads || isLoadingSubscriptions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide performance metrics and insights</p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Preset */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="lastMonth">Last month</SelectItem>
                  <SelectItem value="thisQuarter">This quarter</SelectItem>
                  <SelectItem value="lastQuarter">Last quarter</SelectItem>
                  <SelectItem value="thisYear">This year</SelectItem>
                  <SelectItem value="lastYear">Last year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Picker */}
            {datePreset === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange.from}
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Grouping */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Group by</label>
              <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity("all"); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === "all"}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={() => refetchSubscriptions()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard
          title="Visitors"
          value={kpis.visitors}
          icon={<Users className="h-4 w-4" />}
          tooltip="Total page views across all facility profiles"
          isLoading={isLoading}
        />
        <KPICard
          title="Clicks"
          value={kpis.clicks}
          icon={<MousePointerClick className="h-4 w-4" />}
          tooltip="CTA clicks: Call Now, View Profile, Request Help"
          isLoading={isLoading}
        />
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads}
          icon={<FileText className="h-4 w-4" />}
          tooltip="Total lead submissions from all sources"
          isLoading={isLoading}
        />
        <KPICard
          title="Qualified Leads"
          value={kpis.qualifiedLeads}
          icon={<CheckCircle className="h-4 w-4" />}
          tooltip="Leads with verified email addresses"
          isLoading={isLoading}
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          tooltip="Leads divided by Visitors"
          isLoading={isLoading}
        />
        <KPICard
          title="Active Subs"
          value={kpis.activeSubscriptions}
          icon={<CreditCard className="h-4 w-4" />}
          tooltip="Currently active subscriptions"
          isLoading={isLoading}
        />
        <KPICard
          title="New Subs"
          value={kpis.newSubscriptions}
          icon={<TrendingUp className="h-4 w-4" />}
          tooltip="New subscriptions in selected period"
          isLoading={isLoading}
        />
        <KPICard
          title="Revenue"
          value={`$${kpis.revenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          tooltip="Total revenue in selected period"
          isLoading={isLoading}
        />
        <KPICard
          title="MRR"
          value={`$${kpis.mrr.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          tooltip="Monthly Recurring Revenue"
          isLoading={isLoading}
        />
        <KPICard
          title="Churn Rate"
          value={`${kpis.churnRate}%`}
          icon={<UserMinus className="h-4 w-4" />}
          tooltip="Subscription cancellation rate"
          isLoading={isLoading}
          variant={kpis.churnRate > 5 ? "destructive" : "default"}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="traffic">Traffic & Engagement</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions & Revenue</TabsTrigger>
          <TabsTrigger value="churn">Churn & Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visitors Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clicks Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="clicks" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Submissions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualified vs Unqualified Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="qualifiedLeads" stackId="a" fill="hsl(var(--chart-1))" name="Qualified" />
                      <Bar dataKey="unqualifiedLeads" stackId="a" fill="hsl(var(--chart-3))" name="Unqualified" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Top Cities by Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCitiesByLeads} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="city" type="category" width={120} className="text-xs" />
                      <RechartsTooltip />
                      <Bar dataKey="leads" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { plan: "Basic", count: subscriptionData?.subscriptionsByPlan?.basic || 0 },
                      { plan: "Professional", count: subscriptionData?.subscriptionsByPlan?.professional || 0 },
                      { plan: "Featured", count: subscriptionData?.subscriptionsByPlan?.featured || 0 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="plan" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upgrades vs Downgrades</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <div className="text-4xl font-bold text-green-600">{kpis.upgrades}</div>
                    <div className="text-sm text-muted-foreground mt-1">Upgrades</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-red-600">{kpis.downgrades}</div>
                    <div className="text-sm text-muted-foreground mt-1">Downgrades</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Churn Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-red-600">{kpis.churnCount}</div>
                  <div className="text-lg text-muted-foreground">Churned Subscriptions</div>
                  <Badge variant={kpis.churnRate > 5 ? "destructive" : "secondary"} className="text-lg px-4 py-1">
                    {kpis.churnRate}% Churn Rate
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retention Metrics</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-green-600">{100 - kpis.churnRate}%</div>
                  <div className="text-lg text-muted-foreground">Retention Rate</div>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Percentage of subscribers retained during the selected period
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Location Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Location Performance
          </CardTitle>
          <CardDescription>Performance metrics by state and city</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : locationPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("visitors")}>
                      <div className="flex items-center gap-1">
                        Visitors <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("clicks")}>
                      <div className="flex items-center gap-1">
                        Clicks <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("leads")}>
                      <div className="flex items-center gap-1">
                        Leads <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("qualifiedLeads")}>
                      <div className="flex items-center gap-1">
                        Verified <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Conv. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationPerformance.slice(0, 20).map((loc, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{loc.state}</TableCell>
                      <TableCell>{loc.city}</TableCell>
                      <TableCell>{loc.visitors.toLocaleString()}</TableCell>
                      <TableCell>{loc.clicks.toLocaleString()}</TableCell>
                      <TableCell>{loc.leads}</TableCell>
                      <TableCell>{loc.qualifiedLeads}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loc.conversionRate}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No location data available for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  icon, 
  tooltip, 
  isLoading,
  variant = "default"
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  tooltip: string; 
  isLoading: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <Card className={cn(variant === "destructive" && "border-red-200 bg-red-50")}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("p-2 rounded-lg", variant === "destructive" ? "bg-red-100" : "bg-primary/10")}>
            {icon}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className={cn("text-2xl font-bold", variant === "destructive" && "text-red-600")}>
            {value}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}
