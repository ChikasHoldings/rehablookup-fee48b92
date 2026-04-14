import { TrendingUp, Lightbulb, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tips = [
  {
    text: "Write a compelling description highlighting your unique approach",
    priority: "high"
  },
  {
    text: "Upload 5+ high-quality photos of your facility",
    priority: "high"
  },
  {
    text: "Respond to leads within 24 hours for best conversion",
    priority: "medium"
  },
  {
    text: "Keep insurance and services list current",
    priority: "medium"
  },
  {
    text: "Encourage clients to leave reviews on your listing",
    priority: "low"
  }
];

export function ListingTipsCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/10 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <span>Optimization Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {tip.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
