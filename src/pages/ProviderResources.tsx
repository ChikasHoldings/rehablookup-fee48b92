import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { FileText, BookOpen, Video, Download, HelpCircle, Users, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const resources = [
  {
    icon: FileText,
    title: "Listing Guidelines",
    description: "Learn how to optimize your facility listing for maximum visibility and engagement.",
    link: "#",
  },
  {
    icon: BookOpen,
    title: "Best Practices Guide",
    description: "Industry best practices for treatment centers to improve patient outcomes.",
    link: "#",
  },
  {
    icon: Video,
    title: "Training Videos",
    description: "Step-by-step video tutorials on managing your provider dashboard.",
    link: "#",
  },
  {
    icon: Download,
    title: "Marketing Materials",
    description: "Download brochures, flyers, and digital assets to promote your facility.",
    link: "#",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Understand your listing performance and visitor engagement metrics.",
    link: "#",
  },
  {
    icon: Shield,
    title: "Compliance Resources",
    description: "Stay up-to-date with regulatory requirements and compliance standards.",
    link: "#",
  },
];

const faqs = [
  {
    question: "How do I update my facility information?",
    answer: "Log into your provider dashboard and navigate to 'Edit Listing' to update your facility details, photos, and treatment programs.",
  },
  {
    question: "How long does verification take?",
    answer: "The verification process typically takes 2-3 business days. We'll notify you via email once your listing is verified.",
  },
  {
    question: "Can I respond to patient inquiries?",
    answer: "Yes, all inquiries are forwarded to your registered email. You can also manage them through your provider dashboard.",
  },
];

export default function ProviderResources() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Provider Resources
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
            Everything you need to manage your listing and connect with families seeking treatment.
          </p>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Tools & Resources
            </h2>
            <p className="mt-3 text-muted-foreground">
              Access guides, tutorials, and materials to maximize your presence on RehabLookup.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <div
                key={resource.title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <resource.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {resource.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {resource.description}
                </p>
                <a
                  href={resource.link}
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Learn more →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border bg-muted/30 py-16 md:py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <HelpCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card p-6"
              >
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="mt-2 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-8 text-center md:p-12">
            <Users className="mx-auto h-12 w-12 text-primary-foreground/80" />
            <h2 className="mt-6 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Need Help?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Our provider support team is here to help you succeed. Contact us for personalized assistance.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">Contact Support</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <a href="tel:1-800-555-0199">Call 1-800-555-0199</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
