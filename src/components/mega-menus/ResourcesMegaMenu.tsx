import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", desc: "Recognize warning signs early", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", desc: "Your treatment journey", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage", desc: "Understanding your benefits", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", desc: "Financing & payment options", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens during detox", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing a Program", desc: "Match needs to the right care", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", desc: "Get instant estimates", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", desc: "Verify your coverage", icon: Shield },
  { href: "/faq", label: "FAQ", desc: "Common questions", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", desc: "Our matching process", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[620px] max-w-[92vw] p-4">
      {/* Top: Featured guides as compact cards — 3-col */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {guides.slice(0, 3).map((guide) => (
          <PrefetchLink
            key={guide.href}
            to={guide.href}
            onClick={onNavigate}
            className="group rounded-lg border border-border/50 p-3 hover:border-accent/30 hover:shadow-sm transition-all"
          >
            <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/15 transition-colors">
              <guide.icon className="h-3.5 w-3.5 text-accent" />
            </div>
            <p className="text-[12px] font-semibold text-foreground leading-tight mb-0.5 group-hover:text-primary transition-colors">{guide.label}</p>
            <p className="text-[10px] text-muted-foreground leading-snug">{guide.desc}</p>
          </PrefetchLink>
        ))}
      </div>

      {/* Bottom: remaining guides + tools + CTA */}
      <div className="flex gap-4 border-t border-border/40 pt-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1.5">More Guides</p>
          <div className="space-y-0">
            {guides.slice(3).map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <guide.icon className="h-3.5 w-3.5 text-accent/60 group-hover:text-accent" />
                {guide.label}
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/resources" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-1.5 pt-1.5 text-[11px] font-semibold text-primary hover:text-primary/80">
            All articles <ArrowRight className="h-3 w-3" />
          </PrefetchLink>
        </div>

        <div className="w-px bg-border/40" />

        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1.5">Interactive Tools</p>
          <div className="space-y-0">
            {tools.map((tool) => (
              <PrefetchLink
                key={tool.href}
                to={tool.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/40 transition-colors"
              >
                <tool.icon className="h-3.5 w-3.5 text-accent/60 group-hover:text-accent" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground/90 group-hover:text-foreground">{tool.label}</p>
                  <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Compact CTA */}
        <div className="w-[130px] shrink-0">
          <div className="rounded-lg bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border border-primary/10 p-3 h-full flex flex-col justify-center">
            <p className="text-[12px] font-bold text-foreground mb-0.5">Need Help?</p>
            <p className="text-[10px] text-muted-foreground leading-snug mb-2">
              Free treatment matching.
            </p>
            <Link to="/concierge" onClick={onNavigate}>
              <Button size="sm" className="w-full h-7 bg-accent text-accent-foreground hover:bg-accent/90 text-[10px] font-semibold gap-1">
                Get Help <ArrowRight className="h-2.5 w-2.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourcesMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-3 px-1">
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5">Guides</p>
        {guides.slice(0, 4).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <guide.icon className="h-4 w-4 text-accent" />
            {guide.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary font-medium">
          All Resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-1.5">Tools</p>
        {tools.slice(0, 3).map((tool) => (
          <PrefetchLink key={tool.href} to={tool.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <tool.icon className="h-4 w-4 text-accent" />
            {tool.label}
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
