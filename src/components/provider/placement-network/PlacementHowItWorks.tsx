import { Users, ClipboardCheck, MessageSquare, BadgeDollarSign } from "lucide-react";

const STEPS = [
  {
    icon: Users,
    title: "Family Submits Request",
    desc: "Detailed intake from families seeking treatment",
  },
  {
    icon: ClipboardCheck,
    title: "We Match Cases",
    desc: "Our team matches to your facility criteria",
  },
  {
    icon: MessageSquare,
    title: "You Receive Introductions",
    desc: "Review details and respond with availability",
  },
  {
    icon: BadgeDollarSign,
    title: "Pay on Admission",
    desc: "Fee charged only when patient is admitted",
  },
];

export function PlacementHowItWorks() {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        How It Works
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STEPS.map((step, index) => (
          <div key={index} className="text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <step.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-sm text-foreground mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
