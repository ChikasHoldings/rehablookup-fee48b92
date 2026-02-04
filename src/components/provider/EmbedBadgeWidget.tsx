import { useState, useMemo } from "react";
import { Copy, Check, Code2, ExternalLink, Lock, Trophy, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFacilityBadges } from "@/hooks/useFacilityBadges";
import { BadgeCard } from "./badges/BadgeCard";
import { BadgeStyleSelector } from "./badges/BadgeStyleSelector";
import { BadgeStyle, BadgeTier } from "@/lib/badges/badgeTypes";
import { Skeleton } from "@/components/ui/skeleton";

interface EmbedBadgeWidgetProps {
  facilityId: string;
  facilitySlug: string;
  facilityName: string;
  isFeatured?: boolean;
  hasReviews?: boolean;
}

type BadgeSize = "small" | "medium" | "large";

const BADGE_SIZES: Record<BadgeSize, { width: number; height: number; label: string }> = {
  small: { width: 160, height: 160, label: "Small (160×160)" },
  medium: { width: 200, height: 200, label: "Medium (200×200)" },
  large: { width: 260, height: 260, label: "Large (260×260)" },
};

export function EmbedBadgeWidget({
  facilityId,
  facilitySlug,
  facilityName,
}: EmbedBadgeWidgetProps) {
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("verified");
  const [badgeSize, setBadgeSize] = useState<BadgeSize>("medium");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>("gradient");
  const [copied, setCopied] = useState(false);

  const { data: badgeData, isLoading } = useFacilityBadges(facilityId);

  const selectedBadge = useMemo(() => {
    return badgeData?.badges.find((b) => b.badge.id === selectedBadgeId);
  }, [badgeData, selectedBadgeId]);

  const baseUrl = "https://rehablookup.com";
  const edgeFunctionUrl = `https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${selectedBadgeId}&tier=${selectedBadge?.tier || "gold"}`;
  const badgeUrl = `${baseUrl}/api/badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${selectedBadgeId}&tier=${selectedBadge?.tier || "gold"}`;
  const profileUrl = `${baseUrl}/center/${facilitySlug}?utm_source=badge&utm_medium=embed`;

  const embedCode = `<a href="${profileUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${facilityName} - ${selectedBadge?.config?.label || "Verified"} on RehabLookup" width="${BADGE_SIZES[badgeSize].width}" height="${BADGE_SIZES[badgeSize].height}" />
</a>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success("Embed code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = badgeData?.unlockedBadges.length || 0;
  const totalCount = badgeData?.badges.length || 0;

  return (
    <div className="space-y-6">
      {/* Achievement Overview Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Badge Collection</h3>
                <p className="text-sm text-muted-foreground">
                  {unlockedCount} of {totalCount} badges unlocked
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{unlockedCount}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Badge Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Select a Badge
          </CardTitle>
          <CardDescription>
            Choose an unlocked badge to embed on your website. Earn more badges by improving your facility performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unlocked Badges */}
          {badgeData && badgeData.unlockedBadges.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlocked Badges ({badgeData.unlockedBadges.length})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {badgeData.unlockedBadges.map((item) => (
                  <BadgeCard
                    key={item.badge.id}
                    badge={item.badge}
                    tier={item.tier}
                    config={item.config}
                    nextTier={item.nextTier}
                    progress={item.progress}
                    isSelected={selectedBadgeId === item.badge.id}
                    onSelect={() => {
                      setSelectedBadgeId(item.badge.id);
                      // Reset style if not available for this badge
                      if (!item.badge.availableStyles.includes(badgeStyle)) {
                        setBadgeStyle(item.badge.availableStyles[0]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Locked Badges */}
          {badgeData && badgeData.lockedBadges.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Locked Badges ({badgeData.lockedBadges.length})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {badgeData.lockedBadges.map((item) => (
                  <BadgeCard
                    key={item.badge.id}
                    badge={item.badge}
                    tier={item.tier}
                    config={item.config}
                    nextTier={item.nextTier}
                    progress={item.progress}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Customization Card */}
      {selectedBadge && selectedBadge.tier !== "locked" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              Customize & Embed
            </CardTitle>
            <CardDescription>
              Choose your preferred style and size for the {selectedBadge.config?.label || selectedBadge.badge.name} badge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Style Selection */}
            <div className="space-y-3">
              <Label>Badge Style</Label>
              <BadgeStyleSelector
                selectedStyle={badgeStyle}
                availableStyles={selectedBadge.badge.availableStyles}
                onStyleChange={setBadgeStyle}
              />
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={badgeSize} onValueChange={(v) => setBadgeSize(v as BadgeSize)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BADGE_SIZES).map(([size, config]) => (
                    <SelectItem key={size} value={size}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className={cn(
                  "rounded-xl p-8 flex items-center justify-center border-2 border-dashed",
                  "bg-gradient-to-br from-muted/30 to-muted/10"
                )}
              >
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={edgeFunctionUrl}
                    alt={`${facilityName} - ${selectedBadge.config?.label} on RehabLookup`}
                    width={BADGE_SIZES[badgeSize].width}
                    height={BADGE_SIZES[badgeSize].height}
                    className="transition-transform hover:scale-105"
                  />
                </a>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Click the badge to see where it links
              </p>
            </div>

            {/* Embed Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Embed Code</Label>
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto border">
                <code>{embedCode}</code>
              </pre>
            </div>

            {/* Installation Instructions */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="instructions">
                <AccordionTrigger className="text-sm">
                  Installation Instructions
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                      <TabsTrigger value="squarespace">Squarespace</TabsTrigger>
                      <TabsTrigger value="wix">Wix</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="text-sm space-y-2 mt-3">
                      <p>Paste the embed code directly into your HTML where you want the badge to appear.</p>
                      <p className="text-muted-foreground">Common locations: footer, sidebar, or about page.</p>
                    </TabsContent>
                    <TabsContent value="wordpress" className="text-sm space-y-2 mt-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to Appearance → Widgets</li>
                        <li>Add a "Custom HTML" widget to your sidebar or footer</li>
                        <li>Paste the embed code and save</li>
                      </ol>
                    </TabsContent>
                    <TabsContent value="squarespace" className="text-sm space-y-2 mt-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Edit your page and add a "Code" block</li>
                        <li>Paste the embed code</li>
                        <li>Click "Apply" and save your changes</li>
                      </ol>
                    </TabsContent>
                    <TabsContent value="wix" className="text-sm space-y-2 mt-3">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open the Wix Editor</li>
                        <li>Click "Add" → "Embed" → "HTML iframe"</li>
                        <li>Click "Enter Code" and paste the embed code</li>
                        <li>Publish your site</li>
                      </ol>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* SEO Benefits Note */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">SEO Benefits</p>
                  <p className="text-muted-foreground mt-1">
                    This badge creates a dofollow backlink to your RehabLookup profile, helping improve your search engine rankings and driving qualified traffic to your listing.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
