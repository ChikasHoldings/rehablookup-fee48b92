import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  HelpCircle,
  MessageSquare,
  Mail,
  FileText,
  Clock,
  AlertCircle,
  Shield,
  Megaphone,
  CreditCard,
  Crown,
  Users,
  BarChart3,
  Ticket,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { NewSupportTicketForm } from "@/components/support/NewSupportTicketForm";
import { useSupportTickets } from "@/lib/support/useSupportTickets";

/**
 * Provider FAQ.
 *
 * Rewritten in the directory cutover. The previous version was the single
 * densest concentration of directory-contradicting copy in the panel:
 *   • "Pro members get featured placement in search results and a higher
 *     ranking score" — Pro buys neither.
 *   • a whole "Concierge Add-On" section selling a retired product, including
 *     "advisor-matched introductions" and a $1,000/month price.
 *   • a Pro benefit list led by "verified badge" and "inquiries delivered
 *     directly to your inbox" — trust is earned, and inquiries are not a paid
 *     entitlement.
 *   • "Leads" framing with a 24-hour exclusivity window and redistribution,
 *     which is the lead-broker model the directory replaced.
 *
 * Answers here must stay consistent with src/lib/proDirectoryBenefits.ts.
 */
const faqSections = [
  {
    title: "Listing & Profile",
    icon: FileText,
    items: [
      {
        question: "How do I update my facility listing?",
        answer: "Open Listings in the sidebar. You can edit services, insurance accepted, images, description, and contact info. Changes save automatically and go live after a brief review."
      },
      {
        question: "How can I make my listing easier to choose?",
        answer: "Complete every profile field, add high-quality images (WebP recommended), keep services and insurance accurate, and respond quickly to inquiries. A complete, accurate listing gives families more to evaluate. Organic directory position is computed from listing signals and is not affected by your plan or by advertising."
      },
      {
        question: "What is the Enhanced Profile?",
        answer: "Enhanced Profile (Listings → Enhanced Profile) holds your programs, amenities, staff, accreditation highlights, video, and virtual tour. Any plan can build this content; Pro is what publishes those modules on your public listing."
      },
      {
        question: "Can I have multiple facilities?",
        answer: "Yes. The Free plan includes 1 facility listing; Pro manages up to 5 from a single account. Use the facility selector in the header to switch between locations."
      },
    ],
  },
  {
    title: "Inquiries",
    icon: Users,
    items: [
      {
        question: "How do inquiries work?",
        answer: "When someone submits a contact or tour request from your listing, it arrives in your Inquiries inbox. An inquiry stays pinned to the one facility the person selected — it is never reassigned, resold, or shared with competitors."
      },
      {
        question: "Do I need Pro to receive inquiries?",
        answer: "No. Every eligible approved facility receives inquiries from its listing, on any plan, at no cost. There are no per-inquiry fees, credits, or unlock steps on any plan."
      },
      {
        question: "How do I export my inquiry data?",
        answer: "In the Inquiries section, use the export button to download your data as a CSV file for your CRM or for record-keeping."
      },
    ],
  },
  {
    title: "Verification",
    icon: Shield,
    items: [
      {
        question: "How does a facility become verified?",
        answer: "Verification is earned through our review process. We check your listing against authoritative sources — state licensing records, accreditation bodies, and SAMHSA data — and re-check them on an ongoing basis. Keeping current credentials on your listing is what puts you into the review queue."
      },
      {
        question: "Can I purchase verification or the verified badge?",
        answer: "No. Verification is never sold, and it is not part of Pro or of Featured. It reflects what we can confirm about your facility, independently of what you spend."
      },
      {
        question: "Why is my verified badge hidden?",
        answer: "If a licence or accreditation lapses, or an authoritative source changes, the badge is paused while we re-confirm. Your listing stays live. The Verification card on your dashboard shows what is needed and the remediation window."
      },
    ],
  },
  {
    title: "Plan & Billing",
    icon: CreditCard,
    items: [
      {
        question: "What does Pro include?",
        answer: "Pro ($99/month, or $1,009.80/yr — save 15%) publishes your facility phone number and a Call button on your public listing, publishes your enhanced profile (programs, amenities, staff, accreditation highlights), adds rich media (up to 10 photos, video, virtual tour), manages up to 5 facility listings, and unlocks full performance reporting. Pro enhances your listing and provider tools — verification and organic directory position are determined independently and are never purchased with Pro."
      },
      {
        question: "How does billing work?",
        answer: "Your base listing is free. Pro is a flat $99/month (or annual) subscription billed via Stripe — no per-inquiry fees, no credits, no per-placement charges. Featured advertising is billed separately as its own flat subscription, per location, when you activate it."
      },
      {
        question: "How do I manage my subscription?",
        answer: "Open Plan & Billing from the sidebar to view your current plan, update payment methods, view invoices, or cancel."
      },
    ],
  },
  {
    title: "Featured advertising",
    icon: Megaphone,
    items: [
      {
        question: "What is Featured?",
        answer: "Featured is advertising. It places your facility in the sponsored slots on the state, city, near-me, treatment-type, and insurance pages for your area, rotating fairly among the paying facilities in that geography. Every placement carries a visible sponsored label."
      },
      {
        question: "Does Featured improve my organic position?",
        answer: "No. Featured is clearly labeled advertising shown alongside organic results. It does not change your organic directory position, which is computed from listing signals only."
      },
      {
        question: "Is Featured part of Pro?",
        answer: "No. Featured is a separate product with its own price, billed per location. It is not included with Pro and Pro does not include any Featured placement."
      },
    ],
  },
  {
    title: "Performance & Settings",
    icon: BarChart3,
    items: [
      {
        question: "What performance data is available?",
        answer: "Performance shows search appearances, profile views, click-to-call, website clicks, and inquiries, with date-range filters. Pro adds traffic sources, 30-day trends, and your position among peers in your state. Featured has its own placement reporting while it is active."
      },
      {
        question: "How do I change my notification preferences?",
        answer: "Go to Settings → Notifications to customize email alerts for new inquiries, reviews, billing events, and system updates."
      },
    ],
  },
];

const helpTopics = [
  {
    icon: FileText,
    title: "Knowledge Base",
    description: "Search articles and guides",
    link: "/provider/knowledge-base"
  },
  {
    icon: Crown,
    title: "Plan & Billing",
    description: "See Pro benefits and pricing",
    link: "/provider/billing"
  },
  {
    icon: Megaphone,
    title: "Featured advertising",
    description: "Sponsored placement, separate from your plan",
    link: "/provider/marketing"
  },
];

const CATEGORIES = [
  { value: "billing", label: "Billing & Payments" },
  { value: "listing", label: "Listing Help" },
  { value: "leads", label: "Leads & Placements" },
  { value: "account", label: "Account Issues" },
  { value: "technical", label: "Technical Support" },
  { value: "other", label: "Other" },
];

export default function ProviderHelpPage() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTicketId = searchParams.get("ticket");
  const [creating, setCreating] = useState(false);

  // Provider's own tickets + their facility team's (RLS scopes the rows).
  const {
    data: myTickets,
    isLoading: loadingTickets,
    isError: ticketsError,
    refetch: refetchTickets,
  } = useSupportTickets("provider");

  const selectTicket = (ticketId: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (ticketId) next.set("ticket", ticketId);
        else next.delete("ticket");
        return next;
      },
      { replace: true },
    );
  };

  const handleCreated = (ticketId: string) => {
    setCreating(false);
    refetchTickets();
    selectTicket(ticketId);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <ProviderPageHeader
        title="Help & Support"
        description="Find answers, browse guides, or message support (24-48h response)."
        icon={<HelpCircle className="h-4 w-4" />}
      />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

        {/* Quick Help Topics */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          {helpTopics.map((topic) => (
            <Link key={topic.title} to={topic.link}>
              <Card className="hover:shadow-md transition-all cursor-pointer group h-full border-border/60 hover:border-primary/30">
                <CardContent className="p-4 sm:pt-5 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                      <topic.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{topic.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* FAQs — grouped by section */}
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription className="text-sm">
                Quick answers organized by topic
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              {faqSections.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-2 mb-2">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {section.title}
                    </h3>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {section.items.map((faq, index) => (
                      <AccordionItem key={index} value={`${section.title}-${index}`}>
                        <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-3">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Support — opens an in-app ticket (list + thread below) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription className="text-sm">
                {creating
                  ? "Tell us what's going on — we'll reply in the thread below."
                  : "Open a request and we'll respond within 24-48 hours, right here."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {creating ? (
                <NewSupportTicketForm
                  panel="provider"
                  facilityId={facilityId}
                  categories={CATEGORIES}
                  senderName={selectedFacility?.name}
                  onCreated={handleCreated}
                  onCancel={() => setCreating(false)}
                />
              ) : (
                <div className="space-y-3">
                  {selectedFacility && (
                    <p className="text-xs text-muted-foreground">
                      Filing as <span className="font-medium text-foreground">{selectedFacility.name}</span>.
                      Switch facilities from the header to file for another listing.
                    </p>
                  )}
                  <Button onClick={() => setCreating(true)} className="w-full gap-1.5">
                    <Plus className="h-4 w-4" />
                    New support request
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Include the word <strong>Urgent</strong> for time-sensitive lead, placement, or outage
                    issues — we'll route those first.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Direct Contact Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5 text-primary" />
                Direct Contact
              </CardTitle>
              <CardDescription className="text-sm">
                Need immediate assistance? Reach us directly
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Provider Support</p>
                  <a 
                    href="mailto:providers@rehablookup.com" 
                    className="text-sm text-primary hover:underline"
                  >
                    providers@rehablookup.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Response Time</p>
                  <p className="text-sm text-muted-foreground">Within 24-48 business hours</p>
                  <p className="text-xs text-muted-foreground">Mon–Fri, 9am–6pm EST</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For urgent matters regarding inquiries, billing, or system outages,
                  include <strong>Urgent</strong> in the subject line — those tickets are
                  automatically flagged and surfaced to our team first.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Support Tickets — list + thread (own + facility team via RLS) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ticket className="h-5 w-5 text-primary" />
                  Support Tickets
                </CardTitle>
                <CardDescription className="text-sm">
                  {selectedTicketId
                    ? "Reply to support or reopen a resolved request"
                    : "Your requests and your facility team's — track status and reply"}
                </CardDescription>
              </div>
              {selectedTicketId && (
                <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={() => selectTicket(null)}>
                  <ArrowLeft className="h-4 w-4" />
                  All tickets
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedTicketId ? (
              <div className="h-[70vh] min-h-[420px]">
                <SupportTicketThread
                  ticketId={selectedTicketId}
                  panel="provider"
                  onBack={() => selectTicket(null)}
                />
              </div>
            ) : ticketsError ? (
              <div className="text-center py-8">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">Couldn't load your tickets</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  There was a problem reaching support. Your tickets are still saved.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchTickets()}>
                  Try again
                </Button>
              </div>
            ) : (
              <SupportTicketList
                tickets={myTickets}
                onSelect={(id) => selectTicket(id)}
                isLoading={loadingTickets}
                emptyHint="Use the contact form above to reach our team."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
