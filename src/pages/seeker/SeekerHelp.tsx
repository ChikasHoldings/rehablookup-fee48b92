import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, HelpCircle, MessageSquare, BookOpen, Mail, Phone, ExternalLink, ChevronRight, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const faqs = [
  {
    question: "How do I find the right treatment center?",
    answer: "Use our search feature to filter by location, treatment type, and facility type. You can save facilities to your favorites and request more information from those that interest you."
  },
  {
    question: "Is my information kept private?",
    answer: "Yes, your privacy is our priority. Your personal information is protected and only shared with treatment centers when you explicitly request to contact them."
  },
  {
    question: "How do I contact a treatment center?",
    answer: "On any facility's profile page, you can use the 'Request Help' button to send your contact information directly to the facility. They will reach out to you based on your preferred contact method."
  },
  {
    question: "Can I save facilities to review later?",
    answer: "Yes! Click the heart icon on any facility card to save it to your favorites. Access your saved facilities anytime from the 'Saved' section in the navigation."
  },
  {
    question: "How do I leave a review for a facility?",
    answer: "Navigate to the facility's profile page and scroll to the reviews section. Click 'Write a Review' and share your experience. Reviews help others make informed decisions."
  },
  {
    question: "What if I need immediate help?",
    answer: "If you're experiencing a medical emergency, please call 911. For immediate crisis support, contact the SAMHSA National Helpline at 1-800-662-4357 (available 24/7)."
  },
  {
    question: "How do I update my account settings?",
    answer: "Go to Settings in the More menu. There you can update your profile information, notification preferences, and manage your account."
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account from the Settings page. Please note that this action is permanent and will remove all your saved facilities, reviews, and account data."
  }
];

const helpTopics = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn how to search and connect with treatment centers",
    link: "#getting-started"
  },
  {
    icon: HelpCircle,
    title: "Account Help",
    description: "Manage your profile, settings, and preferences",
    link: "#account"
  },
  {
    icon: MessageSquare,
    title: "Reviews & Feedback",
    description: "How to leave reviews and report issues",
    link: "#reviews"
  }
];

export default function SeekerHelp() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !category || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-support-request", {
        body: {
          subject,
          category,
          message,
          source: "seeker"
        }
      });

      if (error) throw error;

      toast.success("Your message has been sent! We'll get back to you soon.");
      setSubject("");
      setCategory("");
      setMessage("");
    } catch (error) {
      console.error("Error sending support request:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Help & Support | Recovery Directory</title>
        <meta name="description" content="Get help finding treatment centers and managing your account." />
      </Helmet>

      <div className="min-h-screen bg-slate-950 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center gap-3 px-4 py-4">
            <Link 
              to="/account" 
              className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">Help & Support</h1>
              <p className="text-xs text-slate-400">Get assistance and find answers</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Quick Help Topics */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Help
            </h2>
            <div className="space-y-2">
              {helpTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <Card key={topic.title} className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white">{topic.title}</h3>
                          <p className="text-sm text-slate-400 line-clamp-1">{topic.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Crisis Resources */}
          <section>
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Need Immediate Help?</h3>
                    <p className="text-sm text-slate-300 mb-3">
                      For emergencies call 911. For crisis support:
                    </p>
                    <a 
                      href="tel:1-800-662-4357"
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      <Phone className="h-4 w-4" />
                      SAMHSA: 1-800-662-4357
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-slate-400 mt-1">Available 24/7, free and confidential</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* FAQs */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Frequently Asked Questions
            </h2>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`faq-${index}`}
                      className="border-slate-800 last:border-b-0"
                    >
                      <AccordionTrigger className="px-4 py-3 text-left text-sm text-white hover:no-underline hover:bg-slate-800/50">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-sm text-slate-400">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Contact Form */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Contact Support
            </h2>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-300">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Issues</SelectItem>
                        <SelectItem value="search">Search & Filters</SelectItem>
                        <SelectItem value="facility">Facility Information</SelectItem>
                        <SelectItem value="reviews">Reviews</SelectItem>
                        <SelectItem value="privacy">Privacy Concerns</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-300">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your question or issue in detail..."
                      rows={4}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Direct Contact */}
          <section>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Email Support</h3>
                    <a 
                      href="mailto:support@recoverydirectory.com"
                      className="text-sm text-primary hover:underline"
                    >
                      support@recoverydirectory.com
                    </a>
                    <p className="text-xs text-slate-500 mt-0.5">We typically respond within 24 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
