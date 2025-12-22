import { useState, useEffect } from "react";
import { Star, ExternalLink, Info, Loader2, Save, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGoogleReviews } from "@/hooks/useGoogleReviews";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface GoogleReviewsSectionProps {
  facilityId: string;
  expanded: boolean;
  onToggle: () => void;
}

export function GoogleReviewsSection({ facilityId, expanded, onToggle }: GoogleReviewsSectionProps) {
  const { toast } = useToast();
  const { data: subscription } = useSubscription();
  const { reviewsConfig, isLoading, saveReviews, isSaving } = useGoogleReviews(facilityId);
  
  const isPaidPlan = subscription?.plan === "professional" || subscription?.plan === "featured";
  
  const [googleUrl, setGoogleUrl] = useState("");
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing config
  useEffect(() => {
    if (reviewsConfig) {
      setGoogleUrl(reviewsConfig.google_place_url || "");
      setRating(reviewsConfig.google_rating?.toString() || "");
      setReviewCount(reviewsConfig.google_review_count?.toString() || "");
      setShowOnProfile(reviewsConfig.show_on_profile ?? true);
    }
  }, [reviewsConfig]);

  const handleSave = async () => {
    const ratingNum = parseFloat(rating);
    const countNum = parseInt(reviewCount, 10);

    if (rating && (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      toast({
        title: "Invalid rating",
        description: "Rating must be between 1.0 and 5.0",
        variant: "destructive",
      });
      return;
    }

    if (reviewCount && (isNaN(countNum) || countNum < 0)) {
      toast({
        title: "Invalid review count",
        description: "Review count must be a positive number",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveReviews({
        google_place_url: googleUrl || null,
        google_rating: rating ? ratingNum : null,
        google_review_count: reviewCount ? countNum : null,
        show_on_profile: showOnProfile,
      });
      
      setHasChanges(false);
      toast({
        title: "Reviews saved",
        description: "Your Google Reviews settings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error saving",
        description: "Failed to save reviews configuration.",
        variant: "destructive",
      });
    }
  };

  const handleChange = () => {
    setHasChanges(true);
  };

  // Locked state for basic plan
  if (!isPaidPlan) {
    return (
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <Card className="border-border/60 shadow-sm opacity-75">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/5 to-transparent cursor-pointer hover:bg-amber-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-semibold">Google Reviews</CardTitle>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="h-3 w-3" />
                        Pro Feature
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Display your Google rating on your profile
                    </CardDescription>
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-2">
              <div className="text-center py-6 px-4 rounded-lg bg-muted/50 border border-dashed border-border">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Professional or Featured to display your Google Reviews on your profile.
                </p>
                <Button asChild size="sm">
                  <Link to="/provider/billing">Upgrade Plan</Link>
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card className="border-border/60 shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/5 to-transparent cursor-pointer hover:bg-amber-500/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                  <Star className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-semibold">Google Reviews</CardTitle>
                    {reviewsConfig?.google_rating && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {reviewsConfig.google_rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Display your Google rating on your profile
                  </CardDescription>
                </div>
              </div>
              {expanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Info Box */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">How to find your Google Business URL:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Search for your business on Google Maps</li>
                      <li>Click on your business listing</li>
                      <li>Click "Share" and copy the link</li>
                    </ol>
                  </div>
                </div>

                {/* Google Place URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Google Business URL
                  </Label>
                  <Input
                    placeholder="https://maps.google.com/?cid=123456..."
                    value={googleUrl}
                    onChange={(e) => { setGoogleUrl(e.target.value); handleChange(); }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your Google Maps share link or g.page URL
                  </p>
                </div>

                {/* Rating and Review Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Your Google Rating
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      placeholder="4.8"
                      value={rating}
                      onChange={(e) => { setRating(e.target.value); handleChange(); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Number of Reviews
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="127"
                      value={reviewCount}
                      onChange={(e) => { setReviewCount(e.target.value); handleChange(); }}
                    />
                  </div>
                </div>

                {/* Preview */}
                {rating && reviewCount && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                    <div className="flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < Math.floor(parseFloat(rating) || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-muted text-muted"
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-bold">{parseFloat(rating).toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({parseInt(reviewCount).toLocaleString()} reviews)
                      </span>
                    </div>
                  </div>
                )}

                {/* Show on Profile Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <Label className="text-sm font-medium">Show on public profile</Label>
                    <p className="text-xs text-muted-foreground">
                      Display your Google rating to visitors
                    </p>
                  </div>
                  <Switch
                    checked={showOnProfile}
                    onCheckedChange={(checked) => { setShowOnProfile(checked); handleChange(); }}
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="w-full gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Reviews Settings
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
