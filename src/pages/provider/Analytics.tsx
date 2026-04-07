import { useState, useMemo } from "react";
import { BarChart3, CalendarIcon, X, ChevronDown, Building2 } from "lucide-react";
import { CentralizedLeadAnalyticsDashboard } from "@/components/provider/CentralizedLeadAnalyticsDashboard";
import { CentralizedEngagementAnalytics } from "@/components/provider/CentralizedEngagementAnalytics";
import { ProviderPerformanceAnalytics } from "@/components/provider/ProviderPerformanceAnalytics";
import { DATE_RANGE_PRESETS, type DateRange } from "@/hooks/useLeadAnalytics";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
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

type TabKey = "overview" | "engagement" | "leads" | "performance";

export default function ProviderAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: undefined,
    to: undefined,
  }));
  const [selectedPreset, setSelectedPreset] = useState<string>("all");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");

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

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setDateRange({ from: range.from, to: range.to });
      setSelectedPreset("custom");
    }
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
  ];

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
          <div className="flex items-center gap-2">
            <a href="/provider-roi-calculator" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
              <BarChart3 className="h-3.5 w-3.5" />
              ROI Calculator
            </a>
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

            {/* Date Range Filter */}
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
              <DropdownMenuContent align="end" className="w-52">
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
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className={cn(
                        "cursor-pointer text-sm",
                        selectedPreset === "custom" && "bg-primary/5 font-medium"
                      )}
                    >
                      Custom Range...
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end" side="left">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        handleCustomDateSelect(range);
                        if (range?.from && range?.to) setIsCalendarOpen(false);
                      }}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                    {(dateRange.from || dateRange.to) && (
                      <div className="border-t p-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setIsCalendarOpen(false)}>
                          Apply
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>

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
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
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
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Engagement Overview</h2>
                <CentralizedEngagementAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Lead Overview</h2>
                <CentralizedLeadAnalyticsDashboard dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === "engagement" && (
          <Card>
            <CardContent className="p-5">
              <CentralizedEngagementAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
        {activeTab === "leads" && (
          <Card>
            <CardContent className="p-5">
              <CentralizedLeadAnalyticsDashboard dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
        {activeTab === "performance" && (
          <Card>
            <CardContent className="p-5">
              <ProviderPerformanceAnalytics dateRange={dateRange} facilityId={selectedFacilityId !== "all" ? selectedFacilityId : undefined} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
