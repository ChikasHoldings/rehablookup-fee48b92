import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertCircle,
  Award,
  BarChart3,
  Check,
  Copy,
  Images,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { useToast } from "@/hooks/use-toast";
import { EmbedAnalyticsCard } from "@/components/provider/embed/EmbedAnalyticsCard";

type WidgetType = "badge" | "reviews" | "gallery";
type WidgetSize = "small" | "medium" | "large";
type WidgetTheme = "light" | "dark" | "auto";

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const THEME_OPTIONS: { value: WidgetTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "Auto", icon: Monitor },
];

const PREVIEW_HEIGHTS: Record<WidgetType, Record<WidgetSize, number>> = {
  badge: { small: 60, medium: 80, large: 110 },
  reviews: { small: 320, medium: 420, large: 540 },
  // Gallery aspect ratios mirror the CSS in gallery.html so the
  // portal preview iframe matches what visitors see at the same
  // width: 4:3 for small/medium, 16:10 for large.
  gallery: { small: 240, medium: 360, large: 400 },
};

function buildSnippet({
  origin,
  widget,
  facilityId,
  size,
  theme,
}: {
  origin: string;
  widget: WidgetType;
  facilityId: string;
  size: WidgetSize;
  theme: WidgetTheme;
}) {
  // Two-line snippet: a container div the loader scans, plus the
  // loader script tag. Both fit on copy-paste and degrade gracefully
  // if scripts are blocked (the div is empty so the host page just
  // skips that region).
  return `<div class="rehablookup-widget" data-widget="${widget}" data-facility="${facilityId}" data-size="${size}" data-theme="${theme}"></div>
<script src="${origin}/embed/v1/loader.js" async></script>`;
}

function widgetPreviewUrl({
  origin,
  widget,
  facilityId,
  size,
  theme,
}: {
  origin: string;
  widget: WidgetType;
  facilityId: string;
  size: WidgetSize;
  theme: WidgetTheme;
}) {
  return `${origin}/embed/v1/widget/${widget}.html?facility=${encodeURIComponent(facilityId)}&size=${size}&theme=${theme}`;
}

export default function EmbedBadgePage() {
  const { selectedFacility } = useSelectedFacility();
  const { data: proStatus } = useProStatus(selectedFacility?.id);
  const isPro = proStatus?.isPro ?? false;
  const { toast } = useToast();

  const [activeWidget, setActiveWidget] = useState<WidgetType>("badge");
  const [size, setSize] = useState<WidgetSize>("medium");
  const [theme, setTheme] = useState<WidgetTheme>("light");

  // window.location.origin is fine here — the live SPA serves
  // /embed/v1/loader.js from the same origin, and dev/preview builds
  // pick up the right host automatically.
  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : "https://rehablookup.com"),
    [],
  );

  if (!selectedFacility) {
    return (
      <PlaceholderState
        icon={AlertCircle}
        title="No facility selected"
        body="Pick a facility from the header dropdown to generate an embed snippet."
      />
    );
  }
  if (selectedFacility.status !== "approved") {
    return (
      <PlaceholderState
        icon={AlertCircle}
        title="Facility pending approval"
        body="Embed widgets become available once your facility listing is approved. We'll send a notification when it's ready."
      />
    );
  }

  const isVerified = (selectedFacility as { verified?: boolean }).verified === true;
  const badgeLocked = !isVerified;

  const snippet = buildSnippet({
    origin,
    widget: activeWidget,
    facilityId: selectedFacility.id,
    size,
    theme,
  });
  const previewUrl = widgetPreviewUrl({
    origin,
    widget: activeWidget,
    facilityId: selectedFacility.id,
    size,
    theme,
  });
  const previewHeight = PREVIEW_HEIGHTS[activeWidget][size];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast({ title: "Snippet copied", description: "Paste it into your site HTML." });
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the textarea and copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Embed Widgets | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-full bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 md:py-8 lg:px-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
              Embed
            </p>
            <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
              Widgets for your website
            </h1>
            <p className="mt-1.5 max-w-xl text-[15px] text-slate-600">
              Drop a verified badge or live-reviews block onto your facility
              site. Each widget is sandboxed and links back to your RehabLookup
              profile.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8 lg:px-8 space-y-6">
          {/* Widget picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WidgetPickerCard
              icon={ShieldCheck}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
              title="Verified Badge"
              description={
                badgeLocked
                  ? "Available after your listing is verified by admin."
                  : "Shows your verified status and links back to your profile."
              }
              active={activeWidget === "badge"}
              disabled={badgeLocked}
              onClick={() => !badgeLocked && setActiveWidget("badge")}
              badge={isPro && !badgeLocked ? "Enhanced styling for Pro" : undefined}
              badgeColor="bg-amber-100 text-amber-800"
            />
            <WidgetPickerCard
              icon={MessageSquareQuote}
              iconColor="text-violet-600"
              iconBg="bg-violet-100"
              title="Reviews Widget"
              description="Aggregate rating + recent approved reviews. Updates live."
              active={activeWidget === "reviews"}
              onClick={() => setActiveWidget("reviews")}
            />
            <WidgetPickerCard
              icon={Images}
              iconColor="text-sky-600"
              iconBg="bg-sky-100"
              title="Photo Carousel"
              description="Auto-rotating gallery of your facility photos. Free shows 5, Pro shows 10."
              active={activeWidget === "gallery"}
              onClick={() => setActiveWidget("gallery")}
              badge={isPro ? "10-photo cap on Pro" : "5-photo cap on Free"}
              badgeColor={isPro ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}
            />
          </div>

          {/* Settings + preview + snippet */}
          {activeWidget === "badge" && badgeLocked ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-10 w-10 text-amber-500 mx-auto mb-3" aria-hidden />
                <p className="font-medium text-foreground">
                  This widget is locked until your facility is verified.
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Once an admin marks your listing as verified (typically after
                  documentation review), the badge will become available.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Customize</CardTitle>
                  <CardDescription>
                    Adjust size and theme; the preview and snippet update live.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm">Size</Label>
                    <div className="flex gap-2 flex-wrap">
                      {SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSize(opt.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm border transition-colors",
                            size === opt.value
                              ? "border-[#1B365D] bg-[#1B365D] text-white"
                              : "border-slate-300 text-slate-700 hover:border-[#1B365D]/40 hover:bg-slate-50",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Theme</Label>
                    <div className="flex gap-2 flex-wrap">
                      {THEME_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTheme(opt.value)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors",
                              theme === opt.value
                                ? "border-[#1B365D] bg-[#1B365D] text-white"
                                : "border-slate-300 text-slate-700 hover:border-[#1B365D]/40 hover:bg-slate-50",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Live preview</CardTitle>
                    <CardDescription>
                      Rendered from the same iframe your visitors will see.
                    </CardDescription>
                  </div>
                  {isPro && activeWidget === "badge" && (
                    <Badge className="bg-amber-500 hover:bg-amber-500 gap-1">
                      <Sparkles className="h-3 w-3" />
                      Pro styling
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "rounded-lg border border-dashed border-slate-300 p-4 flex items-center justify-center",
                      theme === "dark" ? "bg-slate-900" : "bg-slate-100",
                    )}
                  >
                    <iframe
                      key={previewUrl}
                      src={previewUrl}
                      title={`${activeWidget} preview`}
                      // Sandboxed identically to the runtime injected
                      // iframe so what you see here is what visitors
                      // see (modulo the host page's outer styling).
                      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={{
                        border: 0,
                        width: "100%",
                        maxWidth: "560px",
                        height: previewHeight,
                        background: "transparent",
                      }}
                      loading="lazy"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Embed snippet</CardTitle>
                  <CardDescription>
                    Paste this into your facility website where you want the
                    widget to appear.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={snippet}
                    readOnly
                    rows={3}
                    className="font-mono text-xs resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleCopy} className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]">
                      <Copy className="h-4 w-4" />
                      Copy snippet
                    </Button>
                  </div>
                  <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 leading-relaxed">
                    <p className="font-medium text-slate-900 mb-1">Tips</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>Place the snippet near the end of your page body.</li>
                      <li>
                        Strict-CSP sites: allow <code className="bg-white px-1 rounded border border-slate-200">script-src rehablookup.com</code> and <code className="bg-white px-1 rounded border border-slate-200">frame-src rehablookup.com</code>.
                      </li>
                      <li>Multiple widgets per page are fine — the loader scans them all.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Live impression-analytics card. Anchored to the selected
              facility id so multi-facility providers always see the
              numbers for the listing the picker chrome is pointed at,
              not whatever was last viewed. Renders below the snippet
              card so the natural reading flow is configure → preview
              → copy → check performance. */}
          <EmbedAnalyticsCard facilityId={selectedFacility.id} />
        </div>
      </div>
    </>
  );
}

function PlaceholderState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 lg:p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function WidgetPickerCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  active,
  disabled,
  onClick,
  badge,
  badgeColor,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-left rounded-lg border bg-card p-4 transition-all",
        active ? "border-[#1B365D] ring-1 ring-[#1B365D]/30 shadow-sm" : "border-border hover:border-[#1B365D]/40",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      aria-pressed={active}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{title}</p>
            {active && <Check className="h-4 w-4 text-[#1B365D] shrink-0" aria-hidden />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {badge && (
            <span
              className={cn(
                "inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                badgeColor || "bg-slate-100 text-slate-700",
              )}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
