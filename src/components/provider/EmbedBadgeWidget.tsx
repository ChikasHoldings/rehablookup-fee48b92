import { useState } from "react";
import { Copy, Check, Code2, ExternalLink, Shield, Star, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmbedBadgeWidgetProps {
  facilityId: string;
  facilitySlug: string;
  facilityName: string;
  isFeatured?: boolean;
  hasReviews?: boolean;
}

type BadgeType = "verified" | "featured" | "rating";
type BadgeSize = "small" | "medium" | "large";
type BadgeStyle = "light" | "dark" | "transparent";

const BADGE_SIZES: Record<BadgeSize, { width: number; height: number; label: string }> = {
  small: { width: 120, height: 40, label: "Small (120×40)" },
  medium: { width: 180, height: 60, label: "Medium (180×60)" },
  large: { width: 240, height: 80, label: "Large (240×80)" },
};

const BADGE_STYLES: Record<BadgeStyle, { label: string; description: string }> = {
  light: { label: "Light", description: "White background" },
  dark: { label: "Dark", description: "Dark background" },
  transparent: { label: "Transparent", description: "Adapts to site" },
};

const BADGE_TYPES: Record<BadgeType, { label: string; icon: typeof Shield; description: string }> = {
  verified: { label: "Verified", icon: Shield, description: "Shows verification status" },
  featured: { label: "Featured", icon: Star, description: "Highlights featured status" },
  rating: { label: "Rating", icon: BarChart3, description: "Displays star rating" },
};

export function EmbedBadgeWidget({
  facilityId,
  facilitySlug,
  facilityName,
  isFeatured = false,
  hasReviews = false,
}: EmbedBadgeWidgetProps) {
  const [badgeType, setBadgeType] = useState<BadgeType>("verified");
  const [badgeSize, setBadgeSize] = useState<BadgeSize>("medium");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>("light");
  const [copied, setCopied] = useState(false);

  const baseUrl = "https://rehablookup.com";
  // Use edge function URL directly for preview (avoids cross-origin blocking)
  const edgeFunctionUrl = `https://plckxokpyiubuekvodtc.supabase.co/functions/v1/serve-badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${badgeType}`;
  // Use production URL for embed code (will be proxied through _redirects in production)
  const badgeUrl = `${baseUrl}/api/badge/${facilityId}?style=${badgeStyle}&size=${badgeSize}&type=${badgeType}`;
  const profileUrl = `${baseUrl}/center/${facilitySlug}?utm_source=badge&utm_medium=embed`;

  const embedCode = `<a href="${profileUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${facilityName} - Verified on RehabLookup" width="${BADGE_SIZES[badgeSize].width}" height="${BADGE_SIZES[badgeSize].height}" />
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

  // Filter available badge types based on facility status
  const availableBadgeTypes = Object.entries(BADGE_TYPES).filter(([type]) => {
    if (type === "featured" && !isFeatured) return false;
    if (type === "rating" && !hasReviews) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          Embed Badge
        </CardTitle>
        <CardDescription>
          Add a badge to your website to increase visibility and get quality backlinks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Badge Type Selection */}
        <div className="space-y-2">
          <Label>Badge Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {availableBadgeTypes.map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant={badgeType === type ? "default" : "outline"}
                  className={cn(
                    "h-auto py-3 flex-col gap-1",
                    badgeType === type && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setBadgeType(type as BadgeType)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{config.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Size and Style Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Size</Label>
            <Select value={badgeSize} onValueChange={(v) => setBadgeSize(v as BadgeSize)}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={badgeStyle} onValueChange={(v) => setBadgeStyle(v as BadgeStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BADGE_STYLES).map(([style, config]) => (
                  <SelectItem key={style} value={style}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className={cn(
              "rounded-lg p-6 flex items-center justify-center border",
              badgeStyle === "dark" ? "bg-gray-900" : "bg-muted/50"
            )}
          >
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={edgeFunctionUrl}
                alt={`${facilityName} - Verified on RehabLookup`}
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
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto border">
              <code>{embedCode}</code>
            </pre>
          </div>
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
  );
}
