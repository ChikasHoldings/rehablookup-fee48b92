import { useState, useMemo, useRef } from "react";
import { BarChart3, CalendarIcon, X, ChevronDown, Building2 } from "lucide-react";
import { CentralizedLeadAnalyticsDashboard } from "@/components/provider/CentralizedLeadAnalyticsDashboard";
import { CentralizedEngagementAnalytics } from "@/components/provider/CentralizedEngagementAnalytics";
import { ProviderPerformanceAnalytics } from "@/components/provider/ProviderPerformanceAnalytics";
import { ROICalculatorWidget } from "@/components/provider/ROICalculatorWidget";
import { DATE_RANGE_PRESETS, type DateRange } from "@/hooks/useLeadAnalytics";
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

type TabKey = "overview" | "engagement" | "leads" | "performance" | "roi";

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

  const { facilities } = useProviderFacilities();
  const approvedFacilities = useMemo(
    () => facilities.filter(f => f.status === "approved"),
    [facilities]
  );

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
    { key: "engagement", label: "Engagement" },
    { key: "leads", label: "Leads" },
    { key: "performance", label: "Performance" },
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
    if (tempRange.from) {
      setDateRange({ from: tempRange.from, to: tempRange.to });
      setSelectedPreset("custom");
    }
    setIsCalendarOpen(false);
  };

  const handleClearRange = () => {
    setTempRange({});
    clearDateFilter();
    setIsCalendarOpen(false);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track performance across your listings
              </p>
            </div>
          </div>

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
                <button onClick={() => setSelectedFacilityId("all")} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
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
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-6">
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
          <Card>
            <CardContent className="p-3 sm:p-5">
              <CentralizedEngagementAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
        {activeTab === "leads" && (
          <Card>
            <CardContent className="p-3 sm:p-5">
              <CentralizedLeadAnalyticsDashboard dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
        {activeTab === "performance" && (
          <Card>
            <CardContent className="p-3 sm:p-5">
              <ProviderPerformanceAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
        {activeTab === "roi" && (
          <Card>
            <CardContent className="p-3 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">ROI Calculator — Compare Your Lead Costs</h2>
              <ROICalculatorWidget />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
