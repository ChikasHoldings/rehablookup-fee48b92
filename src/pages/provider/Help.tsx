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
  Handshake,
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

const faqSections = [
  {
    title: "Listing & Profile",
    icon: FileText,
    items: [
      {
        question: "How do I update my facility listing?",
        answer: "Navigate to 'My Listing' in the sidebar. You can edit services, insurance accepted, images, description, and contact info. Changes save automatically and go live after a brief review."
      },
      {
        question: "How can I improve my listing visibility?",
        answer: "Complete all profile fields, add high-quality images (WebP recommended), ensure services and insurance are accurate, and respond quickly to leads. Pro members get featured placement in search results and a higher ranking score."
      },
      {
        question: "Can I have multiple facilities?",
        answer: "Yes. You can add unlimited facility listings from a single account, on any plan. Use the facility selector in the header to switch between locations."
      },
    ],
  },
  {
    title: "Leads",
    icon: Users,
    items: [
      {
        question: "How do leads work?",
        answer: "When someone views your profile and submits a contact or tour request, it becomes a lead delivered to your inbox with full contact details immediately — no fees, no credits, no unlock step. Each lead is exclusive to your facility for a 24-hour window before being redistributed."
      },
      {
        question: "How do I export my lead data?",
        answer: "In the Leads section, use the export button to download your lead data as a CSV file for use with your CRM or for record-keeping."
      },
    ],
  },
  {
    title: "Concierge Add-On",
    icon: Handshake,
    items: [
      {
        question: "What is the Concierge Add-On?",
        answer: "The Concierge Add-On ($1,000/month) makes you a verified Concierge Partner. Our human advisors prioritize your facility when matching families whose geography and level of care fit your program. EKRA-compliant by design — never per-call, per-lead, or per-admission."
      },
      {
        question: "How do I enable the Concierge Add-On?",
        answer: "Subscribe to Pro first, then go to Marketing → Concierge and activate the add-on. You'll set your admissions contact, accepted care types, and geography. Once active, you'll start receiving advisor-matched introductions."
      },
      {
        question: "Are there any per-placement fees?",
        answer: "No. The Concierge Add-On is a flat monthly subscription. There are no per-admission, per-call, or per-lead fees on any plan — RehabLookup uses flat-fee subscriptions only."
      },
    ],
  },
  {
    title: "Billing & Pro Membership",
    icon: CreditCard,
    items: [
      {
        question: "What does Pro membership include?",
        answer: "Pro ($99/month, or $1,009.80/yr — save 15%) includes: verified badge, direct contact info visible to clients, inquiries delivered directly to your inbox with full contact details, review responses, 10 photos plus 1 video, unlimited facility listings, priority support, analytics dashboard, and an embeddable trust badge. Featured rotation placements and Concierge Partner surfacing are optional add-ons priced separately — see /for-providers for the full lineup."
      },
      {
        question: "How does billing work?",
        answer: "Your base listing is free. Pro is a flat $99/month (or annual) subscription billed via Stripe — no per-lead fees, no credits, no per-placement charges. Featured and Concierge add-ons are billed separately as flat monthly subscriptions when activated."
      },
      {
        question: "How do I manage my subscription?",
        answer: "Open Billing from the sidebar to view your current plan, update payment methods, view invoices, or manage your Pro subscription."
      },
    ],
  },
  {
    title: "Analytics & Settings",
    icon: BarChart3,
    items: [
      {
        question: "What analytics are available?",
        answer: "The Analytics page shows profile views, lead volume, response times, and placement activity. You can filter by date range including weekly, monthly, quarterly, or custom periods."
      },
      {
        question: "How do I change my notification preferences?",
        answer: "Go to Settings > Notifications to customize email alerts for new leads, placement introductions, billing events, and system updates."
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
    icon: Handshake,
    title: "Concierge Partner",
    description: "How advisor-matched cases reach your facility",
    link: "/provider/knowledge-base?category=placements"
  },
  {
    icon: Crown,
    title: "Pro Membership",
    description: "See Pro benefits and pricing",
    link: "/provider/billing?upgrade=pro"
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
                  For urgent matters regarding patient leads, placements, or system outages,
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
