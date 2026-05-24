import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { BarChart3, CalendarIcon, X, ChevronDown, Building2, Download } from "lucide-react";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { SubscriptionAnalyticsTab } from "@/components/provider/analytics/SubscriptionAnalyticsTab";
import { CentralizedLeadAnalyticsDashboard } from "@/components/provider/CentralizedLeadAnalyticsDashboard";
import { CentralizedEngagementAnalytics } from "@/components/provider/CentralizedEngagementAnalytics";
import { PerformanceDashboard } from "@/components/provider/analytics/PerformanceDashboard";
import { ROICalculatorWidget } from "@/components/provider/ROICalculatorWidget";
import { DATE_RANGE_PRESETS, type DateRange } from "@/hooks/useLeadAnalytics";
import { useCentralizedEngagementAnalytics } from "@/hooks/useCentralizedEngagementAnalytics";
import { useCentralizedLeadAnalytics } from "@/hooks/useCentralizedLeadAnalytics";
import { MarketReportPanel } from "@/components/provider/analytics/MarketReportPanel";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type TabKey = "overview" | "engagement" | "leads" | "performance" | "market" | "roi" | "subscription";

export default function ProviderAnalyticsPage() {
  const shouldOpenCalendarFromMenuRef = useRef(false);
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: undefined,
    to: undefined,
  }));
  const [selectedPreset, setSelectedPreset] = useState<string>("all");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const isMobile = useIsMobile();

  // Temporary range state for calendar selection (only committed on Apply)
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const approvedFacilities = useMemo(
    () => facilities.filter(f => f.status === "approved"),
    [facilities]
  );

  // Guard: if the facility the user had selected was deleted /
  // un-approved while the Analytics tab was open (admin transfer,
  // suspension, etc.), the filter would point at a non-existent id
  // and every downstream query would silently return empty data
  // (blank charts, blank tables, no error message). Reset to "all"
  // the moment the selected id falls out of the approved set.
  useEffect(() => {
    if (selectedFacilityId === "all") return;
    if (facilitiesLoading) return;
    if (approvedFacilities.some(f => f.id === selectedFacilityId)) return;
    setSelectedFacilityId("all");
  }, [selectedFacilityId, approvedFacilities, facilitiesLoading]);

  const effectiveFacilityId = selectedFacilityId !== "all" ? selectedFacilityId : undefined;
  const { data: engagementData } = useCentralizedEngagementAnalytics(dateRange, effectiveFacilityId);
  const { data: leadData } = useCentralizedLeadAnalytics(dateRange, effectiveFacilityId);

  const handleExportCSV = useCallback(() => {
    // Section helpers — each section ends with a blank row for human-
    // readability when opening the CSV in Excel/Sheets/Numbers.
    const rows: string[][] = [];

    // Header block with export metadata so a downloaded CSV is unambiguous.
    rows.push(["RehabLookup Analytics Export"]);
    rows.push(["Exported", format(new Date(), "yyyy-MM-dd HH:mm")]);
    rows.push([
      "Date range",
      dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "All time",
      dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "",
    ]);
    rows.push(["Facility filter", selectedFacilityId === "all" ? "All facilities" : (approvedFacilities.find(f => f.id === selectedFacilityId)?.name ?? selectedFacilityId)]);
    rows.push([]);

    // 1. KPI summary
    rows.push(["KPI summary"]);
    rows.push(["Metric", "Period", "All-time", "Growth %"]);
    if (engagementData) {
      rows.push(["Search Appearances", String(engagementData.periodImpressions), String(engagementData.totalImpressions), `${engagementData.impressionGrowth}%`]);
      rows.push(["Profile Views", String(engagementData.periodProfileViews), String(engagementData.totalProfileViews), `${engagementData.profileViewGrowth}%`]);
      rows.push(["Click to Call", String(engagementData.periodClickToCalls), String(engagementData.totalClickToCalls), `${engagementData.clickToCallGrowth}%`]);
      rows.push(["Website Clicks", String(engagementData.periodWebsiteClicks), String(engagementData.totalWebsiteClicks), `${engagementData.websiteClickGrowth}%`]);
    }
    if (leadData) {
      rows.push(["Total Inquiries", String(leadData.thisMonthLeads), String(leadData.allTimeLeads), `${leadData.growthRate}%`]);
    }
    rows.push([]);

    // 2. Conversion funnel
    if (engagementData || leadData) {
      rows.push(["Conversion funnel (period)"]);
      rows.push(["Step", "Rate", "Numerator", "Denominator", "Description"]);
      if (engagementData) {
        rows.push([
          "Search → Profile",
          `${engagementData.impressionToViewRate}%`,
          String(engagementData.periodProfileViews),
          String(engagementData.periodImpressions),
          "Impressions → views",
        ]);
        rows.push([
          "Profile → Call",
          `${engagementData.viewToCallRate}%`,
          String(engagementData.periodClickToCalls),
          String(engagementData.periodProfileViews),
          "Views → phone clicks",
        ]);
        rows.push([
          "Profile → Website",
          `${engagementData.viewToWebsiteRate}%`,
          String(engagementData.periodWebsiteClicks),
          String(engagementData.periodProfileViews),
          "Views → site clicks",
        ]);
      }
      if (leadData?.conversionFunnel) {
        // `new` is a reserved word — rename via destructure pattern so the
        // local binding doesn't collide. The source type from
        // useCentralizedLeadAnalytics returns `{ new, contacted, qualified, converted }`.
        const { new: newLeads, contacted, qualified, converted } = leadData.conversionFunnel;
        rows.push(["Inquiries → New", "", String(newLeads), "", ""]);
        rows.push(["Inquiries → Contacted", "", String(contacted), "", ""]);
        rows.push(["Inquiries → Qualified", "", String(qualified), "", ""]);
        rows.push(["Inquiries → Converted", "", String(converted), "", ""]);
      }
      rows.push([]);
    }

    // 3. Per-facility breakdown (period)
    if (engagementData?.facilityBreakdown && engagementData.facilityBreakdown.length > 0) {
      rows.push(["Per-facility breakdown (period)"]);
      rows.push(["Facility", "Impressions", "Profile Views", "Calls", "Website", "Inquiries"]);
      engagementData.facilityBreakdown.forEach((f) => {
        const facilityLeads = leadData?.facilityBreakdown.find(lf => lf.facilityId === f.facilityId)?.totalLeads || 0;
        rows.push([
          f.facilityName,
          String(f.impressions),
          String(f.profileViews),
          String(f.clickToCalls),
          String(f.websiteClicks),
          String(facilityLeads),
        ]);
      });
      rows.push([]);
    }

    // 4. Daily / weekly trends (period). buildDailyTrends already buckets
    // weekly when range > 60d, so this section reflects what the chart shows.
    if (engagementData?.dailyTrends && engagementData.dailyTrends.length > 0) {
      rows.push(["Trends (period)"]);
      rows.push(["Bucket", "Impressions", "Profile Views", "Listing Views", "Calls", "Website"]);
      engagementData.dailyTrends.forEach((t) => {
        rows.push([
          t.date,
          String(t.impressions),
          String(t.profileViews),
          String(t.listingViews),
          String(t.clickToCalls),
          String(t.websiteClicks),
        ]);
      });
      rows.push([]);
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  }, [engagementData, leadData, dateRange, selectedFacilityId, approvedFacilities]);

  const handlePresetSelect = (preset: typeof DATE_RANGE_PRESETS[number]) => {
    const range = preset.getRange();
    setDateRange(range);
    setSelectedPreset(preset.value);
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedPreset("all");
  };

  const getSelectedLabel = () => {
    if (selectedPreset === "all") return "All Time";
    if (selectedPreset === "billing_cycle") return "Current Billing Cycle";
    if (selectedPreset === "custom" && dateRange.from) {
      if (dateRange.to) return `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`;
      return `From ${format(dateRange.from, "MMM d, yyyy")}`;
    }
    return DATE_RANGE_PRESETS.find(p => p.value === selectedPreset)?.label || "All Time";
  };

  const hasActiveFilter = selectedPreset !== "all";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "subscription", label: "Subscription" },
    { key: "engagement", label: "Engagement" },
    { key: "leads", label: "Leads" },
    { key: "performance", label: "Performance" },
    { key: "market", label: "Market Report" },
    { key: "roi", label: "ROI Calculator" },
  ];

  const handleOpenCalendar = () => {
    setTempRange({ from: dateRange.from, to: dateRange.to });
    setIsCalendarOpen(true);
  };

  const handleCalendarOpenChange = (open: boolean) => {
    if (open) {
      setTempRange({ from: dateRange.from, to: dateRange.to });
    }

    setIsCalendarOpen(open);
  };

  const handleApplyRange = () => {
    if (!tempRange.from) {
      setIsCalendarOpen(false);
      return;
    }
    // Defensive normalization: if the user somehow flipped the range
    // (clicked end before start), swap so downstream queries don't
    // hit a from > to combination that returns zero rows with no
    // visible explanation. The Calendar UI prevents this in normal
    // use, but a back-button restore + Apply combo can produce it.
    const [from, to] =
      tempRange.to && tempRange.from > tempRange.to
        ? [tempRange.to, tempRange.from]
        : [tempRange.from, tempRange.to];
    setDateRange({ from, to });
    setSelectedPreset("custom");
    setIsCalendarOpen(false);
  };

  const handleClearRange = () => {
    setTempRange({});
    clearDateFilter();
    setIsCalendarOpen(false);
  };

  // Show a helpful empty state while facilities are loading or if none are approved yet
  if (!facilitiesLoading && approvedFacilities.length === 0) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">Track performance across your listings</p>
            </div>
          </div>
          <div className="py-20 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">No Approved Listings Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Analytics will appear here once your listing is approved and starts receiving views.
            </p>
            <Button asChild size="sm">
              <a href="/provider/listings">Manage Listings</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <ProviderPageHeader
        title="Analytics"
        description="Track views, leads, and conversion across your listings."
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* ── Filters ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <div className="hidden">{/* hero moved above; this preserves the original child positions */}</div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Facility Selector */}
            {approvedFacilities.length > 1 && (
              <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                <SelectTrigger className="h-9 w-auto min-w-[160px] max-w-[220px] text-sm gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {approvedFacilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="truncate">{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range Selector — Presets Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{getSelectedLabel()}</span>
                  <span className="sm:hidden text-xs">
                    {selectedPreset === "all" ? "All" : "Filtered"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52"
                onCloseAutoFocus={(event) => {
                  if (!shouldOpenCalendarFromMenuRef.current) return;

                  event.preventDefault();
                  shouldOpenCalendarFromMenuRef.current = false;

                  requestAnimationFrame(() => {
                    handleOpenCalendar();
                  });
                }}
              >
                {DATE_RANGE_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "cursor-pointer text-sm",
                      selectedPreset === preset.value && "bg-primary/5 font-medium"
                    )}
                  >
                    {preset.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    shouldOpenCalendarFromMenuRef.current = true;
                  }}
                  className={cn(
                    "cursor-pointer text-sm",
                    selectedPreset === "custom" && "bg-primary/5 font-medium"
                  )}
                >
                  Custom Range...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Custom Date Range Popover — anchored to its own visible button */}
            <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 h-9 text-sm",
                    !isCalendarOpen && selectedPreset !== "custom" && "hidden"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedPreset === "custom" && dateRange.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                      : format(dateRange.from, "MMM d, yyyy")
                    : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 z-[60]"
                align="end"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Calendar
                  mode="range"
                  selected={{ from: tempRange.from, to: tempRange.to }}
                  onSelect={(range) => {
                    if (range) {
                      setTempRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={isMobile ? 1 : 2}
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date > new Date()}
                />
                <div className="border-t px-3 py-2 flex justify-between items-center gap-3">
                  <span className="text-xs text-muted-foreground truncate">
                    {tempRange.from
                      ? tempRange.to
                        ? `${format(tempRange.from, "MMM d")} – ${format(tempRange.to, "MMM d, yyyy")}`
                        : `${format(tempRange.from, "MMM d, yyyy")} – select end`
                      : "Select start date"}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={handleClearRange}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyRange}
                      disabled={!tempRange.from || !tempRange.to}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilter && (
              <Button variant="ghost" size="icon" onClick={clearDateFilter} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-sm"
              onClick={handleExportCSV}
              disabled={!engagementData && !leadData}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* ── Active Filters ── */}
        {(hasActiveFilter || selectedFacilityId !== "all") && (
          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilter && (
              <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
                <CalendarIcon className="h-3 w-3" />
                {getSelectedLabel()}
                <button onClick={clearDateFilter} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedFacilityId !== "all" && (
              <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
                <Building2 className="h-3 w-3" />
                {approvedFacilities.find(f => f.id === selectedFacilityId)?.name || "Facility"}
                <button
                  type="button"
                  onClick={() => setSelectedFacilityId("all")}
                  className="ml-1 hover:text-destructive transition-colors"
                  aria-label="Clear facility filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div
          role="tablist"
          aria-label="Analytics sections"
          className="flex gap-1 border-b overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0"
          onKeyDown={(e) => {
            const idx = tabs.findIndex(t => t.key === activeTab);
            if (idx === -1) return;
            let nextIdx = idx;
            if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
            else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
            else if (e.key === "Home") nextIdx = 0;
            else if (e.key === "End") nextIdx = tabs.length - 1;
            else return;
            e.preventDefault();
            const next = tabs[nextIdx];
            setActiveTab(next.key);
            requestAnimationFrame(() => {
              document.querySelector<HTMLButtonElement>(`[data-analytics-tab="${next.key}"]`)?.focus();
            });
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`analytics-panel-${tab.key}`}
                id={`analytics-tab-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                data-analytics-tab={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-t",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "subscription" && (
          <div role="tabpanel" id="analytics-panel-subscription" aria-labelledby="analytics-tab-subscription" tabIndex={0} className="focus-visible:outline-none">
            <SubscriptionAnalyticsTab
              facilityId={selectedFacilityId !== "all" ? selectedFacilityId : (approvedFacilities[0]?.id ?? null)}
            />
          </div>
        )}
        {activeTab === "overview" && (
          <div role="tabpanel" id="analytics-panel-overview" aria-labelledby="analytics-tab-overview" tabIndex={0} className="space-y-4 sm:space-y-6 focus-visible:outline-none">
            <Card>
              <CardContent className="p-3 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Engagement Overview</h2>
                <CentralizedEngagementAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Lead Overview</h2>
                <CentralizedLeadAnalyticsDashboard dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === "engagement" && (
          <div role="tabpanel" id="analytics-panel-engagement" aria-labelledby="analytics-tab-engagement" tabIndex={0} className="focus-visible:outline-none">
            <Card>
              <CardContent className="p-3 sm:p-5">
                <CentralizedEngagementAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === "leads" && (
          <div role="tabpanel" id="analytics-panel-leads" aria-labelledby="analytics-tab-leads" tabIndex={0} className="focus-visible:outline-none">
            <Card>
              <CardContent className="p-3 sm:p-5">
                <CentralizedLeadAnalyticsDashboard dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === "performance" && (
          <div role="tabpanel" id="analytics-panel-performance" aria-labelledby="analytics-tab-performance" tabIndex={0} className="focus-visible:outline-none">
            {/* Rollup-backed dashboard. Reads from
                facility_metrics_daily (cron-refreshed hourly + JIT
                refresh when a single facility's row is older than
                15min) instead of aggregating provider_events /
                leads / badge_impressions live on every render.
                Pro shape includes WoW deltas, daily series, traffic
                sources, and aggregate market position; Free shape
                renders the headline-only teaser with a blurred Pro
                preview underneath. */}
            <PerformanceDashboard
              facilityId={selectedFacilityId !== "all" ? selectedFacilityId : approvedFacilities[0]?.id}
            />
          </div>
        )}
        {activeTab === "market" && (
          <div role="tabpanel" id="analytics-panel-market" aria-labelledby="analytics-tab-market" tabIndex={0} className="focus-visible:outline-none">
            <MarketReportPanel
              facilityId={selectedFacilityId !== "all" ? selectedFacilityId : approvedFacilities[0]?.id}
            />
          </div>
        )}
        {activeTab === "roi" && (
          <div role="tabpanel" id="analytics-panel-roi" aria-labelledby="analytics-tab-roi" tabIndex={0} className="focus-visible:outline-none">
            <Card>
              <CardContent className="p-3 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">ROI Calculator — Compare Your Lead Costs</h2>
                <ROICalculatorWidget />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
