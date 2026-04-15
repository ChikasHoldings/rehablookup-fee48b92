import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  HelpCircle, 
  MessageSquare, 
  Mail,
  FileText,
  Clock,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Send,
  Loader2,
  Shield,
  Handshake,
  CreditCard,
  Crown,
  Users,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;
const COOLDOWN_MS = 60_000;

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
        answer: "Yes. Pro members can manage up to 5 facility listings from a single account. Use the facility selector in the header to switch between locations."
      },
    ],
  },
  {
    title: "Leads & Credits",
    icon: Users,
    items: [
      {
        question: "How do leads work?",
        answer: "When someone views your profile and submits a contact or tour request, it becomes a lead. You'll see a preview with basic details. Each lead is exclusive to your facility for a 24-hour window before being redistributed."
      },
      {
        question: "How do credits work?",
        answer: "Purchase credits to unlock lead contact details. Each inquiry type has a set unlock price. Pro subscribers save 20% on every unlock. Credits can be purchased in tiers: $200, $500 (+10% bonus), or $1,000 (+20% bonus). You can also enable auto-reload to top up automatically when your balance runs low."
      },
      {
        question: "How do I export my lead data?",
        answer: "In the Leads section, use the export button to download your lead data as a CSV file for use with your CRM or for record-keeping."
      },
    ],
  },
  {
    title: "Placement Network",
    icon: Handshake,
    items: [
      {
        question: "What is the Placement Network?",
        answer: "Our Placement Network connects your facility with pre-screened families actively seeking treatment. Our concierge team matches cases to your facility criteria, and you only pay a placement fee when a patient is actually admitted—no upfront costs."
      },
      {
        question: "How do I join the Placement Network?",
        answer: "Go to 'Placements' in the sidebar and opt in. You'll set your admissions contact, accepted care types, and insurance. Once opted in, you'll start receiving matched introductions from our team."
      },
      {
        question: "How does Placement billing work?",
        answer: "There is no cost to join or receive introductions. A placement fee is charged only after a patient is admitted to your facility. Pro subscribers receive a $200 discount on each placement fee."
      },
      {
        question: "What happens when I receive an introduction?",
        answer: "You'll see the case details (anonymized) in your Placements tab. Review the case, then respond with 'Interested' or 'Not Interested.' If interested, our team coordinates the next steps including tours and admission."
      },
    ],
  },
  {
    title: "Billing & Pro Membership",
    icon: CreditCard,
    items: [
      {
        question: "What does Pro membership include?",
        answer: "Pro ($399/mo) includes: featured listing placement, 20% off all lead unlocks, $200 off placement fees, up to 5 facility listings, priority support, analytics dashboard, and an embeddable trust badge."
      },
      {
        question: "How does billing work?",
        answer: "Your base listing is free. You pay per lead unlock using credits. Pro membership is billed monthly via Stripe. Placement fees are invoiced separately only upon successful admission."
      },
      {
        question: "How do I manage my subscription?",
        answer: "Go to Settings > Billing to view your current plan, update payment methods, view invoices, or manage your Pro subscription."
      },
    ],
  },
  {
    title: "Analytics & Settings",
    icon: BarChart3,
    items: [
      {
        question: "What analytics are available?",
        answer: "The Analytics page shows profile views, lead volume, unlock rates, response times, and placement activity. You can filter by date range including weekly, monthly, quarterly, or custom periods."
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
    title: "Placement Network",
    description: "Learn how placements work",
    link: "/provider/placements"
  },
  {
    icon: Crown,
    title: "Pro Membership",
    description: "See Pro benefits and pricing",
    link: "/provider/pro-upgrade"
  },
];

const CATEGORIES = [
  { value: "account", label: "Account Issues" },
  { value: "billing", label: "Billing & Payments" },
  { value: "listing", label: "Listing Help" },
  { value: "leads", label: "Leads & Credits" },
  { value: "placements", label: "Placement Network" },
  { value: "technical", label: "Technical Support" },
  { value: "other", label: "Other" },
] as const;

export default function ProviderHelpPage() {
  const [contactSubject, setContactSubject] = useState("");
  const [contactCategory, setContactCategory] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const trimmedSubject = contactSubject.trim();
  const trimmedMessage = contactMessage.trim();
  const isFormValid = !!contactCategory && trimmedSubject.length >= 3 && trimmedMessage.length >= 10;

  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= SUBJECT_MAX) setContactSubject(val);
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MESSAGE_MAX) setContactMessage(val);
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Please fill in all required fields with valid content.");
      return;
    }

    const now = Date.now();
    if (now - lastSubmitRef.current < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - (now - lastSubmitRef.current)) / 1000);
      toast.error(`Please wait ${secondsLeft}s before sending another message.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-support-request", {
        body: {
          category: contactCategory,
          subject: trimmedSubject,
          message: trimmedMessage,
        },
      });

      if (error) throw new Error(error.message || "Failed to submit support request");
      if (data?.error) throw new Error(data.error);

      lastSubmitRef.current = Date.now();
      setSubmitted(true);
      toast.success("Message sent! Our team will respond within 24-48 hours.");

      setContactSubject("");
      setContactCategory("");
      setContactMessage("");
      
      setTimeout(() => setSubmitted(false), 8000);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
            Help & Support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find answers, learn about features, or contact our support team
          </p>
        </div>

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

          {/* Contact Support Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription className="text-sm">
                Send us a message and we'll respond within 24-48 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-base">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Our support team will get back to you within 24-48 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-sm">Category <span className="text-destructive">*</span></Label>
                    <Select value={contactCategory} onValueChange={setContactCategory}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subject" className="text-sm">Subject <span className="text-destructive">*</span></Label>
                      <span className={cn(
                        "text-xs tabular-nums",
                        contactSubject.length > SUBJECT_MAX * 0.9 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {contactSubject.length}/{SUBJECT_MAX}
                      </span>
                    </div>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={contactSubject}
                      onChange={handleSubjectChange}
                      className="h-9"
                      maxLength={SUBJECT_MAX}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message" className="text-sm">Message <span className="text-destructive">*</span></Label>
                      <span className={cn(
                        "text-xs tabular-nums",
                        contactMessage.length > MESSAGE_MAX * 0.9 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {contactMessage.length}/{MESSAGE_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      value={contactMessage}
                      onChange={handleMessageChange}
                      maxLength={MESSAGE_MAX}
                    />
                    {trimmedMessage.length > 0 && trimmedMessage.length < 10 && (
                      <p className="text-xs text-destructive">Please provide at least 10 characters.</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !isFormValid}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
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
                  use the contact form with <strong>"Urgent"</strong> in the subject line.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
