import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  KeyRound,
  Search,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Building2,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type UnlockRow = {
  unlock_id: string;
  unlocked_at: string;
  lead_id: string;
  lead_created_at: string | null;
  lead_location: string | null;
  lead_level_of_care: string | null;
  lead_source: string | null;
  facility_id: string;
  facility_name: string | null;
  facility_city: string | null;
  facility_state: string | null;
  provider_id: string;
  provider_email: string | null;
  provider_first_name: string | null;
  provider_last_name: string | null;
  unlock_price_cents: number | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  total_count: number;
};

type DateRange = { from: Date | undefined; to: Date | undefined };

const PAGE_SIZE = 50;

const RANGE_PRESETS = [
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

function formatCents(cents: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function providerDisplay(row: UnlockRow) {
  const name = [row.provider_first_name, row.provider_last_name].filter(Boolean).join(" ").trim();
  return name || row.provider_email || row.provider_id.slice(0, 8);
}

function facilityDisplay(row: UnlockRow) {
  if (!row.facility_name) return row.facility_id.slice(0, 8);
  const loc = [row.facility_city, row.facility_state].filter(Boolean).join(", ");
  return loc ? `${row.facility_name} — ${loc}` : row.facility_name;
}

export default function AdminLeadUnlocks() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [presetLabel, setPresetLabel] = useState<string>("Last 30 days");

  const fromIso = dateRange.from ? startOfDay(dateRange.from).toISOString() : null;
  const toIso = dateRange.to ? endOfDay(dateRange.to).toISOString() : null;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-lead-unlocks", fromIso, toIso, page],
    queryFn: async (): Promise<UnlockRow[]> => {
      const { data, error } = await supabase.rpc("admin_get_lead_unlock_audit", {
        p_from: fromIso,
        p_to: toIso,
        p_facility_id: null,
        p_provider_id: null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as UnlockRow[];
    },
    staleTime: 30_000,
  });

  const totalCount = data?.[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(totalCount) / PAGE_SIZE));

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((row) => {
      return (
        row.facility_name?.toLowerCase().includes(q) ||
        row.facility_city?.toLowerCase().includes(q) ||
        row.facility_state?.toLowerCase().includes(q) ||
        row.provider_email?.toLowerCase().includes(q) ||
        row.provider_first_name?.toLowerCase().includes(q) ||
        row.provider_last_name?.toLowerCase().includes(q) ||
        row.lead_location?.toLowerCase().includes(q) ||
        row.lead_level_of_care?.toLowerCase().includes(q) ||
        row.lead_id.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const totalRevenueCents = useMemo(
    () => (data ?? []).reduce((sum, r) => sum + (r.unlock_price_cents ?? 0), 0),
    [data],
  );

  const handlePreset = (days: number, label: string) => {
    setDateRange({ from: subDays(new Date(), days), to: new Date() });
    setPresetLabel(label);
    setPage(0);
  };

  const handleExportCsv = () => {
    if (!filteredRows.length) {
      toast.info("No rows to export");
      return;
    }
    const headers = [
      "Unlocked At",
      "Provider Email",
      "Provider Name",
      "Provider ID",
      "Facility Name",
      "Facility City",
      "Facility State",
      "Facility ID",
      "Lead ID",
      "Lead Location",
      "Level of Care",
      "Lead Source",
      "Lead Submitted At",
      "Price (USD)",
      "Payment Method",
      "Stripe PaymentIntent",
    ];
    const rows = filteredRows.map((r) => [
      r.unlocked_at,
      r.provider_email ?? "",
      [r.provider_first_name, r.provider_last_name].filter(Boolean).join(" "),
      r.provider_id,
      r.facility_name ?? "",
      r.facility_city ?? "",
      r.facility_state ?? "",
      r.facility_id,
      r.lead_id,
      r.lead_location ?? "",
      r.lead_level_of_care ?? "",
      r.lead_source ?? "",
      r.lead_created_at ?? "",
      r.unlock_price_cents != null ? (r.unlock_price_cents / 100).toFixed(2) : "",
      r.payment_method ?? "",
      r.stripe_payment_intent_id ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-unlocks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <KeyRound className="h-6 w-6 text-primary" />
            Lead Unlocks Audit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every lead-unlock event with the provider, facility, timestamp, and amount paid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Unlocks</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-7 w-20" /> : Number(totalCount).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Page Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-7 w-24" /> : formatCents(totalRevenueCents)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Date Range</CardDescription>
            <CardTitle className="text-base font-semibold">
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
                : "All time"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by provider, facility, lead ID, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={presetLabel}
            onValueChange={(label) => {
              const preset = RANGE_PRESETS.find((p) => p.label === label);
              if (preset) handlePreset(preset.days, preset.label);
            }}
          >
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_PRESETS.map((p) => (
                <SelectItem key={p.label} value={p.label}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range) {
                    setDateRange({ from: range.from, to: range.to });
                    setPresetLabel("Custom");
                    setPage(0);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Unlocked At</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Facility</th>
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <KeyRound className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      No lead unlocks in this range.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.unlock_id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="font-medium">
                          {format(new Date(row.unlocked_at), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(row.unlocked_at), "h:mm:ss a")}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{providerDisplay(row)}</div>
                            {row.provider_email && (
                              <div className="text-xs text-muted-foreground truncate">
                                {row.provider_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {row.facility_name ?? row.facility_id.slice(0, 8)}
                            </div>
                            {(row.facility_city || row.facility_state) && (
                              <div className="text-xs text-muted-foreground">
                                {[row.facility_city, row.facility_state].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          {row.lead_level_of_care && (
                            <Badge variant="secondary" className="text-xs">
                              {row.lead_level_of_care}
                            </Badge>
                          )}
                          {row.lead_location && (
                            <div className="text-xs text-muted-foreground">
                              {row.lead_location}
                            </div>
                          )}
                          <div className="font-mono text-[10px] text-muted-foreground/70">
                            {row.lead_id.slice(0, 8)}…
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right font-semibold tabular-nums">
                        {formatCents(row.unlock_price_cents)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge
                          variant={row.payment_method === "credits" ? "secondary" : "outline"}
                          className="text-xs capitalize"
                        >
                          {row.payment_method ?? "—"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <div className="text-muted-foreground">
                Page {page + 1} of {totalPages} — {Number(totalCount).toLocaleString()} total
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
