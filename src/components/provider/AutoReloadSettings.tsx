import { useState, useEffect } from "react";
import { RefreshCw, Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAutoReloadSettings } from "@/hooks/useAutoReloadSettings";
import { cn } from "@/lib/utils";

interface AutoReloadSettingsProps {
  facilityId?: string;
  className?: string;
}

const THRESHOLD_OPTIONS = [
  { value: 2500, label: "$25" },
  { value: 5000, label: "$50" },
  { value: 10000, label: "$100" },
  { value: 25000, label: "$250" },
];

const RELOAD_OPTIONS = [
  { value: 20000, label: "$200" },
  { value: 50000, label: "$500 (+10% bonus)" },
  { value: 100000, label: "$1,000 (+20% bonus)" },
];

export function AutoReloadSettings({ facilityId, className }: AutoReloadSettingsProps) {
  const { settings, isLoading, upsertSettings, isUpdating } = useAutoReloadSettings(facilityId);

  const [enabled, setEnabled] = useState(false);
  const [thresholdCents, setThresholdCents] = useState(5000);
  const [reloadAmountCents, setReloadAmountCents] = useState(20000);

  // Sync from server
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setThresholdCents(settings.threshold_cents);
      setReloadAmountCents(settings.reload_amount_cents);
    }
  }, [settings]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    upsertSettings.mutate({
      enabled: checked,
      threshold_cents: thresholdCents,
      reload_amount_cents: reloadAmountCents,
    });
  };

  const handleThresholdChange = (value: string) => {
    const cents = parseInt(value);
    setThresholdCents(cents);
    if (enabled) {
      upsertSettings.mutate({
        enabled,
        threshold_cents: cents,
        reload_amount_cents: reloadAmountCents,
      });
    }
  };

  const handleReloadAmountChange = (value: string) => {
    const cents = parseInt(value);
    setReloadAmountCents(cents);
    if (enabled) {
      upsertSettings.mutate({
        enabled,
        threshold_cents: thresholdCents,
        reload_amount_cents: cents,
      });
    }
  };

  if (isLoading) return null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            Auto-Reload Credits
          </CardTitle>
          {enabled && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 text-[11px] font-semibold gap-1">
              <Zap className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-reload-toggle" className="text-sm font-medium">
              Enable auto-reload
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically purchase credits when balance is low
            </p>
          </div>
          <Switch
            id="auto-reload-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>

        {/* Configuration (shown when enabled) */}
        {enabled && (
          <div className="space-y-4 pt-2 border-t">
            {/* Threshold */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Reload when balance falls below
              </Label>
              <Select
                value={thresholdCents.toString()}
                onValueChange={handleThresholdChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THRESHOLD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reload amount */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Amount to reload
              </Label>
              <Select
                value={reloadAmountCents.toString()}
                onValueChange={handleReloadAmountChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELOAD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info banner */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                When your balance drops below ${(thresholdCents / 100).toFixed(0)}, 
                we'll automatically charge your payment method ${(reloadAmountCents / 100).toLocaleString()} to top up your credits.
                You can disable this at any time.
              </p>
            </div>
          </div>
        )}

        {/* Nudge when disabled */}
        {!enabled && (
          <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Enable auto-reload to never miss leads when your credits run low. Your card will only be charged when your balance drops below your threshold.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
