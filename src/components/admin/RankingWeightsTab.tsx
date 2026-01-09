import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Save, Sparkles, FileText, MessageSquare, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RankingWeights {
  pro_boost: number;
  listing_completeness: number;
  response_rate: number;
  recency: number;
  location_relevance: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  pro_boost: 50,
  listing_completeness: 20,
  response_rate: 15,
  recency: 10,
  location_relevance: 5,
};

export function RankingWeightsTab() {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_WEIGHTS);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current weights
  const { data: savedWeights, isLoading } = useQuery({
    queryKey: ["ranking-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "ranking_weights")
        .maybeSingle();

      if (error) throw error;
      return (data?.setting_value as unknown as RankingWeights) || DEFAULT_WEIGHTS;
    },
  });

  // Sync local state with saved data
  useEffect(() => {
    if (savedWeights) {
      setWeights(savedWeights);
      setHasChanges(false);
    }
  }, [savedWeights]);

  // Save weights mutation
  const saveWeightsMutation = useMutation({
    mutationFn: async (newWeights: RankingWeights) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({ setting_value: newWeights })
        .eq("setting_key", "ranking_weights");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranking-weights"] });
      toast.success("Ranking weights saved successfully");
      setHasChanges(false);
    },
    onError: () => {
      toast.error("Failed to save ranking weights");
    },
  });

  // Recalculate scores mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-ranking-scores");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
      toast.success(`Recalculated scores for ${data.updatedCount || 0} facilities`);
    },
    onError: () => {
      toast.error("Failed to recalculate ranking scores");
    },
  });

  const handleWeightChange = (key: keyof RankingWeights, value: number[]) => {
    setWeights((prev) => ({ ...prev, [key]: value[0] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveWeightsMutation.mutate(weights);
  };

  const handleRecalculate = () => {
    recalculateMutation.mutate();
  };

  const totalWeight = weights.pro_boost + weights.listing_completeness + weights.response_rate + weights.recency + weights.location_relevance;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ranking Algorithm Weights</h3>
          <p className="text-sm text-muted-foreground">
            Configure how different factors influence search ranking scores
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            Recalculate All Scores
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveWeightsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Weights
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weight Distribution</CardTitle>
          <CardDescription>
            Adjust sliders to change how much each factor contributes to the final ranking score.
            Total weight: <span className={totalWeight > 100 ? "text-destructive font-bold" : "font-medium"}>{totalWeight}</span> points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Pro Boost */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Pro Subscription Boost</Label>
                  <p className="text-xs text-muted-foreground">Bonus points for Pro subscribers</p>
                </div>
              </div>
              <span className="text-lg font-bold text-violet-600">{weights.pro_boost}</span>
            </div>
            <Slider
              value={[weights.pro_boost]}
              onValueChange={(v) => handleWeightChange("pro_boost", v)}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-violet-600"
            />
          </div>

          {/* Listing Completeness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Listing Completeness</Label>
                  <p className="text-xs text-muted-foreground">Photos, description, services, insurance</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-600">{weights.listing_completeness}</span>
            </div>
            <Slider
              value={[weights.listing_completeness]}
              onValueChange={(v) => handleWeightChange("listing_completeness", v)}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-blue-600"
            />
          </div>

          {/* Response Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Response Rate</Label>
                  <p className="text-xs text-muted-foreground">Speed of responding to unlocked leads</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-600">{weights.response_rate}</span>
            </div>
            <Slider
              value={[weights.response_rate]}
              onValueChange={(v) => handleWeightChange("response_rate", v)}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-green-600"
            />
          </div>

          {/* Recency/Activity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Recency / Activity</Label>
                  <p className="text-xs text-muted-foreground">Recent logins and profile updates</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-600">{weights.recency}</span>
            </div>
            <Slider
              value={[weights.recency]}
              onValueChange={(v) => handleWeightChange("recency", v)}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          {/* Location Relevance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Location Relevance</Label>
                  <p className="text-xs text-muted-foreground">Proximity to search location</p>
                </div>
              </div>
              <span className="text-lg font-bold text-pink-600">{weights.location_relevance}</span>
            </div>
            <Slider
              value={[weights.location_relevance]}
              onValueChange={(v) => handleWeightChange("location_relevance", v)}
              max={100}
              step={5}
              className="[&_[role=slider]]:bg-pink-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Score Calculation Preview</CardTitle>
          <CardDescription>
            Example of how a facility's score would be calculated with current weights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pro subscriber (100% boost):</span>
              <span className="font-mono">+{weights.pro_boost} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">90% listing completeness:</span>
              <span className="font-mono">+{Math.round(90 * (weights.listing_completeness / 100))} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">80% response rate:</span>
              <span className="font-mono">+{Math.round(80 * (weights.response_rate / 100))} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active in last 7 days (80%):</span>
              <span className="font-mono">+{Math.round(80 * (weights.recency / 100))} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Same city match (100%):</span>
              <span className="font-mono">+{Math.round(100 * (weights.location_relevance / 100))} pts</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total Score:</span>
              <span className="font-mono text-primary">
                {weights.pro_boost + 
                 Math.round(90 * (weights.listing_completeness / 100)) +
                 Math.round(80 * (weights.response_rate / 100)) +
                 Math.round(80 * (weights.recency / 100)) +
                 Math.round(100 * (weights.location_relevance / 100))} pts
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
