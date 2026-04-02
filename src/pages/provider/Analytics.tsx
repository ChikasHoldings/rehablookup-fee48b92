import { useState } from "react";
import { BarChart3, CalendarIcon, X, ChevronDown, Phone, Globe, TrendingUp, Users } from "lucide-react";
import { CentralizedLeadAnalyticsDashboard } from "@/components/provider/CentralizedLeadAnalyticsDashboard";
import { CentralizedEngagementAnalytics } from "@/components/provider/CentralizedEngagementAnalytics";
import { DATE_RANGE_PRESETS, type DateRange } from "@/hooks/useLeadAnalytics";
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
import { cn } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";

type TabKey = "engagement" | "leads";

export default function ProviderAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: undefined,
    to: undefined,
  }));
  const [selectedPreset, setSelectedPreset] = useState<string>("all");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("engagement");

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

  const tabs: { key: TabKey; label: string; icon: React.ElementType; desc: string }[] = [
    { key: "engagement", label: "Engagement", icon: TrendingUp, desc: "Views, clicks & interactions" },
    { key: "leads", label: "Lead Analytics", icon: Users, desc: "Inquiries, funnel & conversion" },
  ];

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 md:h-5.5 md:w-5.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track listing views, inquiries, and engagement
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-sm">
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

        {/* ── Active Filter Pill ── */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
              <CalendarIcon className="h-3 w-3" />
              {getSelectedLabel()}
              <button onClick={clearDateFilter} className="ml-1 hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* ── Main Container Card ── */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Tab Bar */}
            <div className="flex border-b">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center gap-2.5 px-5 sm:px-6 py-4 text-sm font-semibold border-b-2 -mb-px transition-colors",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-5 sm:p-6">
              {activeTab === "engagement" && (
                <CentralizedEngagementAnalytics dateRange={dateRange} />
              )}
              {activeTab === "leads" && (
                <CentralizedLeadAnalyticsDashboard dateRange={dateRange} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
