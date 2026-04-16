import { Shield, CheckCircle, Lock, Clock } from "lucide-react";

const trustItems = [
  { icon: Shield, text: "No Placement Fees for Clients" },
  { icon: CheckCircle, text: "Verified Rehab Facilities" },
  { icon: Lock, text: "Private & Secure Inquiries" },
  { icon: Clock, text: "Fast Provider Response" },
];

export function TrustBar() {
  return (
    <section className="border-b bg-card/80 backdrop-blur-sm">
      <div className="container py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-10">
          {trustItems.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
              <Icon className="h-4 w-4 text-accent shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
