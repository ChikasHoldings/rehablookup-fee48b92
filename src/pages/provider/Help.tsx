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
  Shield
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
const COOLDOWN_MS = 60_000; // 1 minute between submissions

const faqs = [
  {
    question: "How do I update my facility listing?",
    answer: "Navigate to 'My Listing' in the sidebar to update your facility information, including services, insurance accepted, and facility images. Changes are saved automatically and will be reflected on your public profile after review."
  },
  {
    question: "How do leads work?",
    answer: "When someone interested in treatment views your facility profile and submits a contact request, it appears in your Leads tab. You'll receive an email notification (if enabled) and can manage lead status, add notes, and contact prospects directly."
  },
  {
    question: "How does billing work?",
    answer: "Your listing is free. When families submit inquiries, you see a preview with basic details. To view contact info and respond, unlock the inquiry using credits. Pro subscribers get 20% off all unlocks."
  },
  {
    question: "How can I improve my listing visibility?",
    answer: "Complete all profile fields, add high-quality images, ensure your services and insurance information is accurate, and consider upgrading to Pro for featured placement in search results."
  },
  {
    question: "How do I change my notification preferences?",
    answer: "Go to Settings > Notifications to customize which alerts you receive via email, SMS, or browser notifications. You can set up instant alerts or daily/weekly digests."
  },
  {
    question: "How do credits work?",
    answer: "Purchase credits to unlock inquiry contact details. Each inquiry type has a set unlock price. Pro subscribers save 20% on every unlock. View your balance and purchase more in the Billing section."
  },
  {
    question: "How do I download my lead data?",
    answer: "In the Leads section, use the export feature to download your lead data as a CSV file for use with your CRM or for record-keeping purposes."
  },
  {
    question: "Can I have multiple facilities?",
    answer: "Yes! Pro members can manage up to 5 facility listings from a single account. Use the facility selector in the header to switch between locations."
  },
];

const helpTopics = [
  {
    icon: FileText,
    title: "Knowledge Base",
    description: "Search articles and guides for answers",
    link: "/provider/knowledge-base"
  },
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn the basics of managing your listing",
    link: "/provider/knowledge-base"
  },
  {
    icon: AlertCircle,
    title: "Troubleshooting",
    description: "Common issues and how to resolve them",
    link: "/provider/knowledge-base"
  },
];

const CATEGORIES = [
  { value: "account", label: "Account Issues" },
  { value: "billing", label: "Billing & Payments" },
  { value: "listing", label: "Listing Help" },
  { value: "leads", label: "Leads & Contacts" },
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

    // Client-side cooldown
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
            Get help with your account, find answers, or contact our support team
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
          {/* FAQs */}
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription className="text-sm">
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-3">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-3">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
                  For urgent matters regarding patient leads or system outages, 
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
