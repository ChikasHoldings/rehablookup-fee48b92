import { Card, CardContent } from "@/components/ui/card";
import { Users, ClipboardList, Send, CheckCircle } from "lucide-react";

const STEPS = [
  {
    num: 1,
    icon: Users,
    title: "Families Request Help",
    desc: "Families submit detailed intake forms through our placement service",
  },
  {
    num: 2,
    icon: ClipboardList,
    title: "We Match to Your Facility",
    desc: "Our team reviews cases and matches families to facilities that fit their needs",
  },
  {
    num: 3,
    icon: Send,
    title: "You Receive Introductions",
    desc: "Review case details and respond with your availability",
  },
  {
    num: 4,
    icon: CheckCircle,
    title: "Pay on Success",
    desc: "Commission or flat fee—only when a patient is admitted",
  },
];

export function PlacementHowItWorks() {
  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
      <div className="grid gap-3">
        {STEPS.map((step) => (
          <Card key={step.num} className="border border-border/60 hover:border-border transition-colors">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted shrink-0">
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Step {step.num}
                  </span>
                </div>
                <h3 className="font-medium text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
