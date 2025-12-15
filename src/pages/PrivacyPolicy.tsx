import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <SEO
        title="Privacy Policy"
        description="Read RehabLookup's privacy policy. Learn how we collect, use, and protect your personal information when using our addiction treatment directory."
        canonical="/privacy-policy"
        noindex
      />
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="prose prose-lg mx-auto max-w-3xl">
            <div className="space-y-8 text-foreground">
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  RehabLookup ("we," "our," or "us") respects your privacy and is committed to 
                  protecting your personal information. This Privacy Policy explains how we collect, 
                  use, disclose, and safeguard your information when you visit our website or use 
                  our services.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Information We Collect
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may collect information you provide directly to us, including:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Name, email address, and phone number when you submit a contact form</li>
                  <li>Information about your treatment needs when you request information from facilities</li>
                  <li>Communications you send to us</li>
                  <li>Usage data and browsing information through cookies and similar technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  How We Use Your Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use the information we collect to:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Connect you with treatment centers based on your preferences</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Improve our website and services</li>
                  <li>Send you information you have requested</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Information Sharing
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  When you submit a request for information about a treatment center, we share your 
                  contact information with that facility so they can follow up with you. We may also 
                  share information:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>With service providers who assist in operating our website</li>
                  <li>To comply with legal requirements</li>
                  <li>To protect our rights and the safety of others</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">We do not sell your personal information to third parties.</strong>
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your 
                  personal information against unauthorized access, alteration, disclosure, or 
                  destruction. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Depending on your location, you may have certain rights regarding your personal 
                  information, including the right to:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Access and receive a copy of your data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of certain data processing activities</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to collect information about 
                  your browsing activities. You can control cookies through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or our practices, please contact us at:
                </p>
                <ul className="mt-4 list-none space-y-2 text-muted-foreground">
                  <li>Email: <a href="mailto:privacy@rehablookup.com" className="text-primary hover:underline">privacy@rehablookup.com</a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
