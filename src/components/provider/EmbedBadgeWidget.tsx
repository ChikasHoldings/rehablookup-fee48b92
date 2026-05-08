import { useState, useMemo } from "react";
import { Copy, Check, Code2, ExternalLink, Lock, Unlock, ChevronRight, Palette, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFacilityBadges } from "@/hooks/useFacilityBadges";
import { BadgeCard } from "./badges/BadgeCard";
import { BadgeStyleSelector } from "./badges/BadgeStyleSelector";
import { BadgeStyle } from "@/lib/badges/badgeTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

interface EmbedBadgeWidgetProps {
  facilityId: string;
  facilitySlug: string;
  facilityName: string;
}

type BadgeSize = "small" | "medium" | "large";

const BADGE_SIZES: Record<BadgeSize, { width: number; height: number; label: string }> = {
  small: { width: 180, height: 180, label: "Small (180px)" },
  medium: { width: 220, height: 220, label: "Medium (220px)" },
  large: { width: 280, height: 280, label: "Large (280px)" },
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/serve-badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${selectedBadgeId}&tier=${selectedBadge?.tier || "gold"}`;
  const badgeUrl = `${baseUrl}/api/badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${selectedBadgeId}&tier=${selectedBadge?.tier || "gold"}`;
  const profileUrl = `${baseUrl}/center/${facilitySlug}?utm_source=badge&utm_medium=embed`;

  const embedCode = `<a href="${profileUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${facilityName} - ${selectedBadge?.config?.label || "Verified"} on RehabLookup" width="${BADGE_SIZES[badgeSize].width}" height="${BADGE_SIZES[badgeSize].height}" />
</a>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success("Embed code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const unlockedCount = badgeData?.unlockedBadges.length || 0;
  const totalCount = badgeData?.badges.length || 0;

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-muted/30 border border-border/50"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Unlock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{unlockedCount}</p>
            <p className="text-xs text-muted-foreground">Unlocked</p>
          </div>
        </div>
        <div className="h-10 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount - unlockedCount}</p>
            <p className="text-xs text-muted-foreground">Locked</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden lg:flex items-center gap-2">
          <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="h-full bg-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">{Math.round((unlockedCount / totalCount) * 100)}%</span>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-[1fr,400px] gap-6">
        {/* Left Column - Badge Selection */}
        <div className="space-y-6">
          {/* Unlocked Badges */}
          {badgeData && badgeData.unlockedBadges.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </div>
                <h3 className="font-semibold">Available Badges</h3>
                <span className="text-xs text-muted-foreground">({badgeData.unlockedBadges.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badgeData.unlockedBadges.map((item, index) => (
                  <motion.div
                    key={item.badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <BadgeCard
                      badge={item.badge}
                      tier={item.tier}
                      config={item.config}
                      nextTier={item.nextTier}
                      progress={item.progress}
                      isSelected={selectedBadgeId === item.badge.id}
                      onSelect={() => {
                        setSelectedBadgeId(item.badge.id);
                        if (!item.badge.availableStyles.includes(badgeStyle)) {
                          setBadgeStyle(item.badge.availableStyles[0]);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Locked Badges */}
          {badgeData && badgeData.lockedBadges.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-muted-foreground">Locked Badges</h3>
                <span className="text-xs text-muted-foreground">({badgeData.lockedBadges.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badgeData.lockedBadges.map((item, index) => (
                  <motion.div
                    key={item.badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <BadgeCard
                      badge={item.badge}
                      tier={item.tier}
                      config={item.config}
                      nextTier={item.nextTier}
                      progress={item.progress}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Customization Panel */}
        <AnimatePresence mode="wait">
          {selectedBadge && selectedBadge.tier !== "locked" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:sticky lg:top-6 space-y-5"
            >
              {/* Preview Card */}
              <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-transparent overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    Customize Badge
                  </h3>
                </div>
                
                {/* Live Preview */}
                <div className="p-6 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-muted/50 via-transparent to-transparent min-h-[240px]">
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <motion.img
                      key={`${badgeStyle}-${badgeSize}-${selectedBadgeId}`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={edgeFunctionUrl}
                      alt={`${facilityName} Badge`}
                      width={BADGE_SIZES[badgeSize].width}
                      height={BADGE_SIZES[badgeSize].height}
                      className="drop-shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                    />
                  </a>
                </div>

                {/* Style & Size Controls */}
                <div className="p-4 space-y-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5" />
                      Style
                    </Label>
                    <BadgeStyleSelector
                      selectedStyle={badgeStyle}
                      availableStyles={selectedBadge.badge.availableStyles}
                      onStyleChange={setBadgeStyle}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5" />
                      Size
                    </Label>
                    <Select value={badgeSize} onValueChange={(v) => setBadgeSize(v as BadgeSize)}>
                      <SelectTrigger className="w-full bg-background">
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
                </div>
              </div>

              {/* Embed Code Card */}
              <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-border/50">
                  <h3 className="font-semibold text-sm">Embed Code</h3>
                  <Button 
                    size="sm" 
                    variant={copied ? "default" : "secondary"}
                    onClick={handleCopy}
                    className="h-8"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-4 text-xs overflow-x-auto bg-background/50 font-mono text-muted-foreground">
                  <code>{embedCode}</code>
                </pre>
              </div>

              {/* Installation Help */}
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Tabs defaultValue="html" className="w-full">
                  <div className="p-3 border-b border-border/50 bg-muted/20">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-8">
                      <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
                      <TabsTrigger value="wordpress" className="text-xs">WordPress</TabsTrigger>
                      <TabsTrigger value="squarespace" className="text-xs">Squarespace</TabsTrigger>
                      <TabsTrigger value="wix" className="text-xs">Wix</TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="p-4">
                    <TabsContent value="html" className="text-sm space-y-2 mt-0">
                      <p className="text-muted-foreground">Paste the embed code directly into your HTML.</p>
                      <p className="text-xs text-muted-foreground/70">Common locations: footer, sidebar, about page.</p>
                    </TabsContent>
                    <TabsContent value="wordpress" className="text-sm space-y-2 mt-0">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to Appearance → Widgets</li>
                        <li>Add "Custom HTML" widget</li>
                        <li>Paste code and save</li>
                      </ol>
                    </TabsContent>
                    <TabsContent value="squarespace" className="text-sm space-y-2 mt-0">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Edit page, add "Code" block</li>
                        <li>Paste the embed code</li>
                        <li>Click "Apply" and save</li>
                      </ol>
                    </TabsContent>
                    <TabsContent value="wix" className="text-sm space-y-2 mt-0">
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Add → Embed → HTML iframe</li>
                        <li>Click "Enter Code"</li>
                        <li>Paste and publish</li>
                      </ol>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* SEO Note */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">SEO Benefits</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Creates a dofollow backlink to boost your search rankings and drive qualified traffic.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
