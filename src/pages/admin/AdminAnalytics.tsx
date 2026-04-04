import { useState, useMemo, useEffect, useCallback, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, formatDistanceToNow } from "date-fns";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, Sector } from "recharts";
import { CalendarIcon, TrendingUp, TrendingDown, Users, MousePointerClick, FileText, CheckCircle, CreditCard, DollarSign, UserMinus, RefreshCw, RotateCcw, Info, ArrowUpDown, Building2, Activity, Target, Zap, Award, MapPin, Route, ShieldCheck, Gauge, AlertTriangle, GitCompare, Minus, Clock, UserPlus, Mail, Phone, Sparkles, ChevronRight, Filter } from "lucide-react";
import { LeadFormAnalytics } from "@/components/admin/LeadFormAnalytics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DatePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "custom";
type Grouping = "daily" | "weekly" | "monthly";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const PLAN_OPTIONS = ["All", "Free", "Pro"];

// Note: Legacy PLAN_LIMITS constant kept for backward compatibility
// In pay-per-unlock model, there are no monthly lead limits
// Providers pay per unlock instead of having a monthly cap
const PLAN_LIMITS: Record<string, number> = {
  free: 0,  // Free tier: pay-per-unlock, no monthly limit
  pro: 0,   // Pro tier: pay-per-unlock with 20% discount, no monthly limit
};

const CHART_COLORS = {
  primary: "#1B365D",
  secondary: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  purple: "#8B5CF6",
  pink: "#EC4899",
  cyan: "#06B6D4",
};

// Custom tooltip component for charts - wrapped in forwardRef for recharts compatibility
const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload, label }, ref) => {
  if (active && payload && payload.length) {
    return (
      <div ref={ref} className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = "CustomTooltip";

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminAnalytics");
  const [datePreset, setDatePreset] = useState<DatePreset>("last30");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [grouping, setGrouping] = useState<Grouping>("daily");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("All");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "leads", direction: "desc" });
  const [compareMode, setCompareMode] = useState<boolean>(false);

  // Realtime subscription for live updates - always active
  const invalidateAnalyticsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-analytics-views"] });
    queryClient.invalidateQueries({ queryKey: ["admin-analytics-interactions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-analytics-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-analytics-facilities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-activity-feed"] });
  }, [queryClient]);

  useEffect(() => {

    // Subscribe to leads table changes
    const leadsChannel = supabase
      .channel('analytics-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          invalidateAnalyticsQueries();
        }
      )
      .subscribe();

    // Subscribe to facility_views table changes
    const viewsChannel = supabase
      .channel('analytics-views')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facility_views' },
        () => {
          invalidateAnalyticsQueries();
        }
      )
      .subscribe();

    // Subscribe to facility_interactions table changes
    const interactionsChannel = supabase
      .channel('analytics-interactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facility_interactions' },
        () => {
          invalidateAnalyticsQueries();
        }
      )
      .subscribe();

    // Subscribe to facilities table changes
    const facilitiesChannel = supabase
      .channel('analytics-facilities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facilities' },
        () => {
          invalidateAnalyticsQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(interactionsChannel);
      supabase.removeChannel(facilitiesChannel);
    };
  }, [invalidateAnalyticsQueries]);

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

  // Calculate previous period date range for comparison
  const previousDateRange = useMemo(() => {
    const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return {
      from: subDays(dateRange.from, periodLength),
      to: subDays(dateRange.from, 1),
    };
  }, [dateRange]);

  // Fetch facilities for location filtering (with lead_limit_override)
  const { data: facilities, error: facilitiesError } = useQuery({
    queryKey: ["admin-analytics-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, status, lead_limit_override")
        .limit(5000);
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
  const { data: viewsData, isLoading: isLoadingViews, error: viewsError } = useQuery({
    queryKey: ["admin-analytics-views", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_views")
        .select("id, facility_id, view_date, view_count, facilities!inner(city, state)")
        .gte("view_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("view_date", format(dateRange.to, "yyyy-MM-dd"))
        .limit(5000);
      
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
  const { data: interactionsData, isLoading: isLoadingInteractions, error: interactionsError } = useQuery({
    queryKey: ["admin-analytics-interactions", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_interactions")
        .select("id, facility_id, interaction_date, interaction_count, interaction_type, facilities!inner(city, state)")
        .gte("interaction_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("interaction_date", format(dateRange.to, "yyyy-MM-dd"))
        .limit(5000);
      
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

  // Fetch leads data (including unassigned leads without facility)
  const { data: leadsData, isLoading: isLoadingLeads, error: leadsError } = useQuery({
    queryKey: ["admin-analytics-leads", dateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, facility_id, status, source, created_at, facilities!facility_id(city, state)")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .limit(5000);

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data || [];
      if (selectedState !== "all") {
        filtered = filtered.filter(l => (l.facilities as any)?.state === selectedState);
      }
      if (selectedCity !== "all") {
        filtered = filtered.filter(l => (l.facilities as any)?.city === selectedCity);
      }
      
      return filtered;
    },
  });

  // Fetch subscription data via edge function
  const { data: subscriptionData, isLoading: isLoadingSubscriptions, refetch: refetchSubscriptions, error: subscriptionsError } = useQuery({
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
      };
    },
  });

  // Previous period data queries (only fetch when compare mode is enabled)
  const { data: prevViewsData, error: prevViewsError } = useQuery({
    queryKey: ["admin-analytics-prev-views", previousDateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_views")
        .select("*, facilities!inner(city, state)")
        .gte("view_date", format(previousDateRange.from, "yyyy-MM-dd"))
        .lte("view_date", format(previousDateRange.to, "yyyy-MM-dd"));
      
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
    enabled: compareMode,
  });

  const { data: prevInteractionsData, error: prevInteractionsError } = useQuery({
    queryKey: ["admin-analytics-prev-interactions", previousDateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("facility_interactions")
        .select("*, facilities!inner(city, state)")
        .gte("interaction_date", format(previousDateRange.from, "yyyy-MM-dd"))
        .lte("interaction_date", format(previousDateRange.to, "yyyy-MM-dd"));
      
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
    enabled: compareMode,
  });

  const { data: prevLeadsData, error: prevLeadsError } = useQuery({
    queryKey: ["admin-analytics-prev-leads", previousDateRange, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*, facilities!facility_id(city, state)")
        .gte("created_at", previousDateRange.from.toISOString())
        .lte("created_at", previousDateRange.to.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data || [];
      if (selectedState !== "all") {
        filtered = filtered.filter(l => l.facilities?.state === selectedState);
      }
      if (selectedCity !== "all") {
        filtered = filtered.filter(l => l.facilities?.city === selectedCity);
      }
      
      return filtered;
    },
    enabled: compareMode,
  });

  // Log query errors
  useEffect(() => {
    if (facilitiesError) logError("fetch_facilities", facilitiesError, { queryKey: "admin-analytics-facilities" });
  }, [facilitiesError, logError]);

  useEffect(() => {
    if (viewsError) logError("fetch_views", viewsError, { queryKey: "admin-analytics-views" });
  }, [viewsError, logError]);

  useEffect(() => {
    if (interactionsError) logError("fetch_interactions", interactionsError, { queryKey: "admin-analytics-interactions" });
  }, [interactionsError, logError]);

  useEffect(() => {
    if (leadsError) logError("fetch_leads", leadsError, { queryKey: "admin-analytics-leads" });
  }, [leadsError, logError]);

  useEffect(() => {
    if (subscriptionsError) logError("fetch_subscriptions", subscriptionsError, { queryKey: "admin-analytics-subscriptions" });
  }, [subscriptionsError, logError]);

  useEffect(() => {
    if (prevViewsError) logError("fetch_prev_views", prevViewsError, { queryKey: "admin-analytics-prev-views" });
  }, [prevViewsError, logError]);

  useEffect(() => {
    if (prevInteractionsError) logError("fetch_prev_interactions", prevInteractionsError, { queryKey: "admin-analytics-prev-interactions" });
  }, [prevInteractionsError, logError]);

  useEffect(() => {
    if (prevLeadsError) logError("fetch_prev_leads", prevLeadsError, { queryKey: "admin-analytics-prev-leads" });
  }, [prevLeadsError, logError]);

  // Calculate KPIs with comparison
  const kpis = useMemo(() => {
    // Calculate current period totals
    const totalViews = viewsData?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
    const totalClicks = interactionsData?.reduce((sum, i) => sum + (i.interaction_count || 0), 0) || 0;
    const totalLeads = leadsData?.length || 0;
    const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) : "0.00";

    // Previous period calculations
    const prevTotalViews = prevViewsData?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
    const prevTotalClicks = prevInteractionsData?.reduce((sum, i) => sum + (i.interaction_count || 0), 0) || 0;
    const prevTotalLeads = prevLeadsData?.length || 0;
    const prevConversionRate = prevTotalViews > 0 ? ((prevTotalLeads / prevTotalViews) * 100) : 0;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number | null => {
      if (!compareMode) return null;
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      visitors: totalViews,
      visitorsChange: calcChange(totalViews, prevTotalViews),
      clicks: totalClicks,
      clicksChange: calcChange(totalClicks, prevTotalClicks),
      totalLeads,
      totalLeadsChange: calcChange(totalLeads, prevTotalLeads),
      conversionRate: parseFloat(conversionRate),
      conversionRateChange: calcChange(parseFloat(conversionRate), prevConversionRate),
      activeSubscriptions: subscriptionData?.activeSubscriptions || 0,
      newSubscriptions: subscriptionData?.newSubscriptions || 0,
      revenue: subscriptionData?.revenue || 0,
      mrr: subscriptionData?.mrr || 0,
      churnRate: subscriptionData?.churnRate || 0,
      churnCount: subscriptionData?.churnCount || 0,
      upgrades: subscriptionData?.upgrades || 0,
      downgrades: subscriptionData?.downgrades || 0,
    };
  }, [viewsData, interactionsData, leadsData, subscriptionData, prevViewsData, prevInteractionsData, prevLeadsData, compareMode]);

  // Lead source analytics (simplified - no longer tracking qualification/assignment)
  // All leads now go directly to the specified facility

  // Calculate CTA source analytics
  const ctaSourceAnalytics = useMemo(() => {
    if (!leadsData) return { sources: [], totalLeads: 0, conversionBySource: [] };

    // Group leads by source (simplified - no longer tracking qualification/assignment)
    const sourceMap = new Map<string, { total: number }>();
    leadsData.forEach(l => {
      const source = l.source || "direct";
      const current = sourceMap.get(source) || { total: 0 };
      current.total++;
      sourceMap.set(source, current);
    });

    const sources = Array.from(sourceMap.entries())
      .map(([source, stats]) => ({
        source,
        displayName: formatSourceName(source),
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      sources,
      totalLeads: leadsData.length,
      topSource: sources[0]?.displayName || "None",
    };
  }, [leadsData]);

  // Helper to format source names for display
  function formatSourceName(source: string): string {
    const sourceMap: Record<string, string> = {
      'header': 'Header CTA',
      'hero': 'Hero Section',
      'footer': 'Footer',
      'contact_cta': 'Contact Page',
      'howitworks_cta': 'How It Works',
      'faq_cta': 'FAQ Page',
      'treatment_cta': 'Treatment Types',
      'resources_cta': 'Resources',
      'rehab_cta': 'Rehab Centers',
      'rehab_empty': 'Rehab (No Results)',
      'about_cta': 'About Page',
      'article_sidebar': 'Article Sidebar',
      'article_cta': 'Article CTA',
      'cta_bottom': 'Homepage Bottom',
      'provider_profile': 'Provider Profile',
      'provider_profile_sidebar': 'Provider Sidebar',
      'direct': 'Direct Visit',
      'request_help': 'Request Help',
      'Provider Profile': 'Provider Profile',
      'Request Help Page': 'Request Help',
    };
    return sourceMap[source] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Calculate provider capacity utilization
  const providerCapacity = useMemo(() => {
    if (!facilities || !leadsData) return [];

    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);

    return facilities
      .filter(f => f.status === 'approved')
      .map(facility => {
        // Get leads for this month for this facility
        const monthlyLeads = leadsData.filter(l => 
          l.facility_id === facility.id && 
          new Date(l.created_at) >= monthStart
        ).length;

        // Use facility's lead_limit_override if set (legacy), otherwise no limit in pay-per-unlock model
        const leadLimit = (facility as any).lead_limit_override || 0;
        const usagePercentage = leadLimit > 0 ? (monthlyLeads / leadLimit) * 100 : 0;

        return {
          id: facility.id,
          name: facility.name,
          city: facility.city,
          state: facility.state,
          monthlyLeads,
          leadLimit,
          usagePercentage: Math.min(usagePercentage, 100),
          available: Math.max(leadLimit - monthlyLeads, 0),
          atCapacity: monthlyLeads >= leadLimit,
        };
      })
      .sort((a, b) => b.usagePercentage - a.usagePercentage);
  }, [facilities, leadsData]);

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
      };
    });
  }, [dateRange, grouping, viewsData, interactionsData, leadsData]);

  // Location performance data
  const locationPerformance = useMemo(() => {
    if (!facilities || !viewsData || !leadsData) return [];

    const locationMap = new Map<string, { state: string; city: string; visitors: number; clicks: number; leads: number }>();

    facilities.forEach(f => {
      const key = `${f.state}-${f.city}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { state: f.state, city: f.city, visitors: 0, clicks: 0, leads: 0 });
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
      if (!f) return; // Skip leads without facilities
      const key = `${f.state}-${f.city}`;
      const loc = locationMap.get(key);
      if (loc) {
        loc.leads += 1;
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
      .slice(0, 8);
  }, [locationPerformance]);

  // Plan distribution data for pie chart
  const planDistributionData = useMemo(() => {
    // Map legacy tiers to Free/Pro
    const free = (subscriptionData?.subscriptionsByPlan?.basic || 0) + 
                 (subscriptionData?.subscriptionsByPlan?.free || 0);
    const pro = (subscriptionData?.subscriptionsByPlan?.professional || 0) + 
                (subscriptionData?.subscriptionsByPlan?.featured || 0) +
                (subscriptionData?.subscriptionsByPlan?.pro || 0);
    return [
      { name: "Free", value: free, color: CHART_COLORS.secondary },
      { name: "Pro", value: pro, color: CHART_COLORS.warning },
    ].filter(d => d.value > 0);
  }, [subscriptionData]);

  // Provider performance data
  const providerPerformance = useMemo(() => {
    if (!facilities || !viewsData || !leadsData) return [];

    return facilities
      .filter(f => f.status === "approved")
      .map(facility => {
        const views = viewsData
          ?.filter(v => v.facility_id === facility.id)
          .reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
        
        const clicks = interactionsData
          ?.filter(i => i.facility_id === facility.id)
          .reduce((sum, i) => sum + (i.interaction_count || 0), 0) || 0;
        
        const facilityLeads = leadsData?.filter(l => l.facility_id === facility.id) || [];
        const leads = facilityLeads.length;
        const conversionRate = views > 0 ? ((leads / views) * 100).toFixed(2) : "0.00";
        const clickToLeadRate = clicks > 0 ? ((leads / clicks) * 100).toFixed(2) : "0.00";

        return {
          id: facility.id,
          name: facility.name,
          city: facility.city,
          state: facility.state,
          views,
          clicks,
          leads,
          conversionRate,
          clickToLeadRate,
        };
      })
      .filter(p => p.views > 0 || p.leads > 0 || p.clicks > 0)
      .sort((a, b) => b.leads - a.leads);
  }, [facilities, viewsData, interactionsData, leadsData]);

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
    setCompareMode(false);
  };

  const isLoading = isLoadingViews || isLoadingInteractions || isLoadingLeads || isLoadingSubscriptions;
  const hasError = viewsError || interactionsError || leadsError || subscriptionsError;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">Failed to load some data</p>
            <p className="text-sm text-red-600">
              {viewsError && "Views failed to load. "}
              {interactionsError && "Interactions failed to load. "}
              {leadsError && "Leads failed to load. "}
              {subscriptionsError && "Subscription data failed to load. "}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-analytics-views"] });
              queryClient.invalidateQueries({ queryKey: ["admin-analytics-interactions"] });
              queryClient.invalidateQueries({ queryKey: ["admin-analytics-leads"] });
              queryClient.invalidateQueries({ queryKey: ["admin-analytics-subscriptions"] });
            }}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform performance metrics and insights</p>
        </div>
        <Badge variant="outline" className="text-xs font-normal">
          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
        </Badge>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Range</label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[150px] h-9">
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[220px] h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <span className="text-sm">
                            {format(customDateRange.from, "MMM d")} - {format(customDateRange.to, "MMM d")}
                          </span>
                        ) : (
                          format(customDateRange.from, "MMM d, y")
                        )
                      ) : (
                        <span className="text-muted-foreground">Pick dates</span>
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group by</label>
              <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-9 w-px bg-border mx-1" />

            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State</label>
              <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity("all"); }}>
                <SelectTrigger className="w-[140px] h-9">
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === "all"}>
                <SelectTrigger className="w-[140px] h-9">
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-9 w-px bg-border mx-1" />

            {/* Compare Mode Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compare</label>
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                className={cn("h-9 gap-1.5", compareMode && "bg-primary")}
              >
                <GitCompare className="h-4 w-4" />
                {compareMode ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-9">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset
              </Button>
              <Button size="sm" onClick={() => refetchSubscriptions()} className="h-9">
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Period Badge */}
      {compareMode && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
          <GitCompare className="h-4 w-4" />
          <span>
            Comparing to previous period: <span className="font-medium">{format(previousDateRange.from, "MMM d")} - {format(previousDateRange.to, "MMM d, yyyy")}</span>
          </span>
        </div>
      )}

      {/* Consolidated KPI Summary Cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Traffic & Engagement Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Traffic & Engagement</CardTitle>
              </div>
              {compareMode && kpis.visitorsChange !== null && (
                <Badge variant={kpis.visitorsChange >= 0 ? "default" : "destructive"} className="text-xs">
                  {kpis.visitorsChange >= 0 ? "+" : ""}{kpis.visitorsChange.toFixed(1)}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-[140px] w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{kpis.visitors.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Visitors</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{kpis.clicks.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{kpis.conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={timeSeriesData.slice(-14)} style={{ cursor: 'pointer' }}>
                    <defs>
                      <linearGradient id="colorVisitorsMini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="visitors" 
                      stroke={CHART_COLORS.primary} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorVisitorsMini)"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_COLORS.primary, fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leads Performance Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-50">
                  <FileText className="h-4 w-4 text-cyan-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Lead Performance</CardTitle>
              </div>
              {compareMode && kpis.totalLeadsChange !== null && (
                <Badge variant={kpis.totalLeadsChange >= 0 ? "default" : "destructive"} className="text-xs">
                  {kpis.totalLeadsChange >= 0 ? "+" : ""}{kpis.totalLeadsChange.toFixed(1)}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-[140px] w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart style={{ cursor: 'pointer' }}>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                      />
                      <Pie
                        data={[
                          { name: "Total Leads", value: kpis.totalLeads, color: CHART_COLORS.primary },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill={CHART_COLORS.primary} style={{ cursor: 'pointer', transition: 'all 0.2s ease' }} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{kpis.totalLeads}</div>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All inquiries go directly to facilities
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue & Subscriptions Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Revenue & Subscriptions</CardTitle>
              </div>
              <Badge variant="outline" className={cn("text-xs", kpis.churnRate > 5 ? "border-red-200 text-red-600" : "border-slate-200")}>
                {kpis.churnRate}% churn
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-[140px] w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xl font-bold text-emerald-600">${kpis.revenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-purple-600">${kpis.mrr.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">MRR</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active</span>
                      <span className="font-semibold">{kpis.activeSubscriptions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">New</span>
                      <span className="font-semibold text-green-600">+{kpis.newSubscriptions}</span>
                    </div>
                  </div>
                </div>
                <div className="w-[100px]">
                  {planDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={100}>
                      <PieChart style={{ cursor: 'pointer' }}>
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                        />
                        <Pie
                          data={planDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {planDistributionData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[100px] flex items-center justify-center text-muted-foreground text-xs">
                      No data
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="traffic" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 mr-2" />
            Traffic
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="ctasources" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MousePointerClick className="h-4 w-4 mr-2" />
            CTA Sources
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="churn" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingDown className="h-4 w-4 mr-2" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="form-conversion" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Filter className="h-4 w-4 mr-2" />
            Form Conversion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Visitors Over Time
                </CardTitle>
                <CardDescription>Daily visitor count trend</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="visitors" stroke={CHART_COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" name="Visitors" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No visitor data for selected period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-purple-600" />
                  Clicks Over Time
                </CardTitle>
                <CardDescription>CTA interaction trend</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="clicks" stroke={CHART_COLORS.purple} strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MousePointerClick className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No click data for selected period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  Lead Submissions
                </CardTitle>
                <CardDescription>Lead volume over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="leads" stroke={CHART_COLORS.cyan} strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Leads" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No lead data for selected period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Lead Quality
                </CardTitle>
                <CardDescription>Qualified vs unqualified breakdown</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={timeSeriesData} barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="qualifiedLeads" stackId="a" fill={CHART_COLORS.success} name="Qualified" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="unqualifiedLeads" stackId="a" fill={CHART_COLORS.warning} name="Unqualified" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No lead quality data for selected period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Top Cities by Leads
                </CardTitle>
                <CardDescription>Geographic lead distribution</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : topCitiesByLeads.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topCitiesByLeads} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="city" type="category" width={100} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="leads" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No lead data for selected filters</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CTA Sources Tab */}
        <TabsContent value="ctasources" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-purple-600" />
                Lead Sources by CTA
              </CardTitle>
              <CardDescription>Track which CTAs across the site drive the most leads</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : ctaSourceAnalytics.sources.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Total Leads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ctaSourceAnalytics.sources.map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="font-medium">{s.displayName}</TableCell>
                        <TableCell className="text-right">{s.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No lead source data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  Plan Distribution
                </CardTitle>
                <CardDescription>Active subscriptions by plan type</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : planDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No subscription data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Subscription Movement
                </CardTitle>
                <CardDescription>Plan upgrades vs downgrades</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-12 text-center">
                    <div className="space-y-2">
                      <div className="h-20 w-20 mx-auto rounded-2xl bg-green-50 flex items-center justify-center">
                        <TrendingUp className="h-10 w-10 text-green-600" />
                      </div>
                      <div className="text-4xl font-bold text-green-600">{kpis.upgrades}</div>
                      <div className="text-sm text-muted-foreground font-medium">Upgrades</div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 w-20 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                        <TrendingDown className="h-10 w-10 text-red-500" />
                      </div>
                      <div className="text-4xl font-bold text-red-500">{kpis.downgrades}</div>
                      <div className="text-sm text-muted-foreground font-medium">Downgrades</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-red-500" />
                  Churn Overview
                </CardTitle>
                <CardDescription>Subscription cancellations this period</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="h-28 w-28 mx-auto rounded-full bg-red-50 flex items-center justify-center border-4 border-red-100">
                      <span className="text-5xl font-bold text-red-600">{kpis.churnCount}</span>
                    </div>
                    <div>
                      <div className="text-lg font-medium">Churned Subscriptions</div>
                      <Badge 
                        variant={kpis.churnRate > 5 ? "destructive" : "secondary"} 
                        className="mt-2 text-sm px-3 py-1"
                      >
                        {kpis.churnRate}% Churn Rate
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Retention Rate
                </CardTitle>
                <CardDescription>Percentage of subscribers retained</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="h-28 w-28 mx-auto rounded-full bg-green-50 flex items-center justify-center border-4 border-green-100">
                      <span className="text-4xl font-bold text-green-600">{(100 - kpis.churnRate).toFixed(1)}%</span>
                    </div>
                    <div>
                      <div className="text-lg font-medium">Retention Rate</div>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                        Subscribers retained during selected period
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="form-conversion" className="space-y-4">
          <LeadFormAnalytics dateRange={dateRange} />
        </TabsContent>
      </Tabs>

      {/* Location Performance Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-slate-600" />
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
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="font-semibold">State</TableHead>
                    <TableHead className="font-semibold">City</TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("visitors")}>
                      <div className="flex items-center gap-1">
                        Visitors 
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === "visitors" && "text-primary")} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("clicks")}>
                      <div className="flex items-center gap-1">
                        Clicks 
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === "clicks" && "text-primary")} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("leads")}>
                      <div className="flex items-center gap-1">
                        Leads 
                        <ArrowUpDown className={cn("h-3 w-3", sortConfig.key === "leads" && "text-primary")} />
                      </div>
                    </TableHead>
                    <TableHead>Conv. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationPerformance.slice(0, 15).map((loc, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{loc.state}</TableCell>
                      <TableCell className="text-muted-foreground">{loc.city}</TableCell>
                      <TableCell>{loc.visitors.toLocaleString()}</TableCell>
                      <TableCell>{loc.clicks.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">{loc.leads}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          parseFloat(loc.conversionRate) >= 5 ? "text-green-600" : 
                          parseFloat(loc.conversionRate) >= 2 ? "text-amber-600" : "text-slate-500"
                        )}>
                          {loc.conversionRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No location data available</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Performance Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-slate-600" />
            Provider Performance
          </CardTitle>
          <CardDescription>Individual provider metrics and conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : providerPerformance.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="font-semibold min-w-[180px]">Provider</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Views
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        Clicks
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Leads
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-center gap-1 cursor-help">
                          <Target className="h-3.5 w-3.5" />
                          Conv.
                        </TooltipTrigger>
                        <TooltipContent>Leads / Views</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-center gap-1 cursor-help">
                          <Zap className="h-3.5 w-3.5" />
                          Click→Lead
                        </TooltipTrigger>
                        <TooltipContent>Leads / Clicks</TooltipContent>
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerPerformance.slice(0, 20).map((provider) => (
                    <TableRow key={provider.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                        <div className="truncate max-w-[180px]" title={provider.name}>
                          {provider.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {provider.city}, {provider.state}
                      </TableCell>
                      <TableCell className="text-center">{provider.views.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{provider.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-medium">{provider.leads}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium text-sm",
                          parseFloat(provider.conversionRate) >= 5 ? "text-green-600" : 
                          parseFloat(provider.conversionRate) >= 2 ? "text-amber-600" : "text-slate-500"
                        )}>
                          {provider.conversionRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-medium text-sm",
                          parseFloat(provider.clickToLeadRate) >= 10 ? "text-green-600" : 
                          parseFloat(provider.clickToLeadRate) >= 5 ? "text-amber-600" : "text-slate-500"
                        )}>
                          {provider.clickToLeadRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No provider data available</p>
              <p className="text-sm mt-1">Provider metrics will appear once there is activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number | null;
  icon: React.ReactNode;
  tooltip: string;
  isLoading: boolean;
  color: "blue" | "purple" | "green" | "amber" | "red" | "cyan" | "emerald" | "slate";
}

const colorClasses = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100" },
  cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", border: "border-cyan-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100" },
  slate: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-100" },
};

function KPICard({ title, value, change, icon, tooltip, isLoading, color }: KPICardProps) {
  const colors = colorClasses[color];
  
  const renderChange = () => {
    if (change === null || change === undefined) return null;
    
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-0.5 text-xs font-medium mt-1",
        isPositive && "text-green-600",
        !isPositive && !isNeutral && "text-red-600",
        isNeutral && "text-slate-500"
      )}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isPositive ? "+" : ""}{change.toFixed(1)}%</span>
      </div>
    );
  };
  
  return (
    <Card className={cn("border-slate-200 hover:shadow-md transition-shadow", colors.border)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-2.5 rounded-xl", colors.bg)}>
            <div className={colors.icon}>{icon}</div>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              {renderChange()}
            </>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

