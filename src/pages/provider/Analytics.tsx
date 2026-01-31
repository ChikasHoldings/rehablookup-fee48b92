import { useState } from "react";
import { BarChart3, CalendarIcon, X, ChevronDown, Phone, Globe } from "lucide-react";
import { CentralizedLeadAnalyticsDashboard } from "@/components/provider/CentralizedLeadAnalyticsDashboard";
import { CentralizedEngagementAnalytics } from "@/components/provider/CentralizedEngagementAnalytics";
import { DATE_RANGE_PRESETS, type DateRange } from "@/hooks/useLeadAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function ProviderAnalyticsPage() {
  // Default to current billing cycle
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: new Date()
  }));
  const [selectedPreset, setSelectedPreset] = useState<string>("billing_cycle");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
    setDateRange({ from: startOfMonth(new Date()), to: new Date() });
    setSelectedPreset("billing_cycle");
  };

  const getSelectedLabel = () => {
    if (selectedPreset === "billing_cycle") {
      return "Current Billing Cycle";
    }
    if (selectedPreset === "custom" && dateRange.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
      }
      return `From ${format(dateRange.from, "MMM d, yyyy")}`;
    }
    const preset = DATE_RANGE_PRESETS.find(p => p.value === selectedPreset);
    return preset?.label || "Current Billing Cycle";
  };

  const hasActiveFilter = selectedPreset !== "billing_cycle";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">Analytics</h1>
            <p className="text-muted-foreground text-xs md:text-sm">
              Track lead performance and engagement across all locations
            </p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{getSelectedLabel()}</span>
                <span className="sm:hidden">
                  {selectedPreset === "all" ? "All Time" : "Filtered"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {DATE_RANGE_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "cursor-pointer",
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
                      "cursor-pointer",
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
                      if (range?.from && range?.to) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => date > new Date()}
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="border-t p-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCalendarOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Badge */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Showing data for:</span>
          <Badge variant="secondary" className="gap-1.5">
            <CalendarIcon className="h-3 w-3" />
            {getSelectedLabel()}
            <button onClick={clearDateFilter} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="w-full sm:w-auto h-11 p-1 bg-muted/50">
          <TabsTrigger 
            value="engagement" 
            className="flex-1 sm:flex-none gap-2 text-xs sm:text-sm px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <Globe className="h-3.5 w-3.5" />
            </div>
            <span>Engagement</span>
          </TabsTrigger>
          <TabsTrigger 
            value="leads" 
            className="flex-1 sm:flex-none gap-2 text-xs sm:text-sm px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Lead Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="mt-6">
          <CentralizedEngagementAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <CentralizedLeadAnalyticsDashboard dateRange={dateRange} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}