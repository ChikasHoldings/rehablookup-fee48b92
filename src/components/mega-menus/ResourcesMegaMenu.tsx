import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info, ChevronRight,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-resources.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", desc: "Recognize warning signs early", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", desc: "Step-by-step treatment journey", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage Guide", desc: "Understand your benefits", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", desc: "Financing options explained", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens during detox", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing the Right Program", desc: "Match your needs to care level", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", desc: "Get instant cost estimates", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", desc: "Verify your coverage", icon: Shield },
  { href: "/faq", label: "FAQ", desc: "Common questions answered", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", desc: "Our matching process", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[740px] max-w-[90vw]">
      <div className="grid grid-cols-[1fr_220px]">
        {/* Left: Guides + Tools */}
        <div className="p-5">
          <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            Guides & Articles
          </h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-5">
            {guides.map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 group-hover:shadow-sm transition-all">
                  <guide.icon className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{guide.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{guide.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink
            to="/resources"
            onClick={onNavigate}
            className="flex items-center gap-1.5 px-2.5 text-[13px] font-semibold text-primary hover:underline"
          >
            All Articles <ArrowRight className="h-3.5 w-3.5" />
          </PrefetchLink>

          <div className="border-t border-border/40 mt-4 pt-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2.5">
              Interactive Tools
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {tools.map((tool) => (
                <PrefetchLink
                  key={tool.href}
                  to={tool.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <tool.icon className="h-4 w-4 text-accent/70 group-hover:text-accent transition-colors" />
                  <div>
                    <p className="font-medium">{tool.label}</p>
                    <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                  </div>
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="border-l border-border/50 p-4 flex flex-col bg-muted/20 rounded-r-xl">
          <div className="rounded-xl overflow-hidden mb-4 shadow-sm">
            <img
              src={megaMenuImg}
              alt="Recovery resources"
              className="w-full h-28 object-cover"
              loading="lazy"
              width={220}
              height={112}
            />
          </div>

          <div className="rounded-xl bg-gradient-to-br from-primary/[0.08] to-accent/[0.08] border border-primary/10 p-4 flex-1 flex flex-col">
            <p className="text-sm font-bold text-foreground mb-1">Need Help Now?</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3 flex-1">
              Free, confidential treatment matching by our expert team.
            </p>
            <Link to="/concierge" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold shadow-sm">
                Get Help <ArrowRight className="h-3 w-3" />
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
    <div className="space-y-4 px-1">
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2">Popular Guides</p>
        {guides.slice(0, 4).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <guide.icon className="h-4 w-4 text-accent" />
            {guide.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium">
          All Resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-2">Tools</p>
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
