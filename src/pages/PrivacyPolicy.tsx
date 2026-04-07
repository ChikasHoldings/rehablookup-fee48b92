import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { ArrowLeft, Shield, Lock, Eye, UserCheck, FileText, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <SEO
        title="Privacy Policy - HIPAA & GDPR Compliant"
        description="Read RehabLookup's privacy policy. Learn how we collect, use, and protect your personal and health information with HIPAA and GDPR compliance."
        canonical="/privacy-policy"
        keywords={["privacy policy", "HIPAA compliance", "GDPR", "health data protection", "addiction treatment privacy"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy-policy" },
        ]}
      />
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            variant="light"
            items={[{ label: "Privacy Policy" }]}
          />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Lock className="h-4 w-4" aria-hidden="true" />
              HIPAA Compliant
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <Globe className="h-4 w-4" aria-hidden="true" />
              GDPR Ready
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400">
              <Eye className="h-4 w-4" aria-hidden="true" />
              CCPA Compliant
            </div>
          </div>
        </div>
      </section>

      {/* Quick Summary Card */}
      <section className="py-8 border-b border-border">
        <div className="container">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                Privacy at a Glance
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">Your Data, Your Control</p>
                    <p className="text-sm text-muted-foreground">Request access, correction, or deletion anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">Never Sold</p>
                    <p className="text-sm text-muted-foreground">We never sell your personal information</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">Health Data Protected</p>
                    <p className="text-sm text-muted-foreground">Sensitive health info handled with extra care</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  protecting your personal information. We understand that seeking addiction treatment 
                  information is deeply personal and sensitive. This Privacy Policy explains how we 
                  collect, use, disclose, and safeguard your information when you visit our website 
                  or use our services.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  <strong className="text-foreground">Our Commitment:</strong> We treat all health-related 
                  information with the highest level of care and security, following HIPAA guidelines 
                  for protecting sensitive health data.
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
                  <li>Insurance information for coverage verification purposes</li>
                  <li>Location data to help find nearby treatment centers</li>
                  <li>Communications you send to us</li>
                  <li>Usage data and browsing information through cookies and similar technologies</li>
                </ul>

                <h3 className="font-display text-xl font-semibold text-foreground mt-6">
                  Sensitive Health Information
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you inquire about treatment options, you may share sensitive health-related 
                  information such as substance use history or mental health conditions. We handle 
                  this information with extra care:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Encrypted in transit and at rest using industry-standard protocols</li>
                  <li>Access limited to authorized personnel only</li>
                  <li>Never used for marketing purposes beyond connecting you with treatment</li>
                  <li>Deleted upon request in accordance with your rights</li>
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
                  <li>Connect you with treatment centers based on your preferences and needs</li>
                  <li>Verify insurance coverage with treatment facilities</li>
                  <li>Respond to your questions and provide customer support</li>
                  <li>Improve our website and services</li>
                  <li>Send you information you have requested</li>
                  <li>Comply with legal obligations</li>
                  <li>Analyze usage patterns to improve user experience (with anonymized data)</li>
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
                  <li>With service providers who assist in operating our website (under strict confidentiality agreements)</li>
                  <li>To comply with legal requirements or court orders</li>
                  <li>To protect our rights and the safety of others</li>
                  <li>In connection with a merger or acquisition (with notice to you)</li>
                </ul>
                <div className="mt-4 rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20">
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    We do not sell your personal information to third parties.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We never sell, rent, or trade your personal or health information to advertisers, 
                    data brokers, or any other third parties for their marketing purposes.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  GDPR Rights (European Users)
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you are located in the European Economic Area (EEA), you have certain rights 
                  under the General Data Protection Regulation (GDPR):
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li><strong className="text-foreground">Right to Access:</strong> Request a copy of all personal data we hold about you</li>
                  <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate data</li>
                  <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                  <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request that we limit how we use your data</li>
                  <li><strong className="text-foreground">Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
                  <li><strong className="text-foreground">Right to Object:</strong> Object to processing based on legitimate interests</li>
                  <li><strong className="text-foreground">Right to Withdraw Consent:</strong> Withdraw consent at any time for consent-based processing</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To exercise these rights, contact us at{" "}
                  <a href="mailto:privacy@rehablookup.com" className="text-primary hover:underline">
                    privacy@rehablookup.com
                  </a>. We will respond within 30 days.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  CCPA Rights (California Residents)
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you are a California resident, you have rights under the California Consumer 
                  Privacy Act (CCPA):
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li><strong className="text-foreground">Right to Know:</strong> Request disclosure of personal information collected about you</li>
                  <li><strong className="text-foreground">Right to Delete:</strong> Request deletion of your personal information</li>
                  <li><strong className="text-foreground">Right to Opt-Out:</strong> Opt-out of the sale of personal information (we do not sell data)</li>
                  <li><strong className="text-foreground">Right to Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement robust technical and organizational measures to protect your 
                  personal information:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li><strong className="text-foreground">Encryption:</strong> All data transmitted using TLS 1.3 (HTTPS)</li>
                  <li><strong className="text-foreground">Access Controls:</strong> Role-based access with multi-factor authentication</li>
                  <li><strong className="text-foreground">Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
                  <li><strong className="text-foreground">Regular Audits:</strong> Periodic security assessments and penetration testing</li>
                  <li><strong className="text-foreground">Data Minimization:</strong> We only collect data necessary for our services</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Regardless of your location, you have the following rights:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Access and receive a copy of your data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Withdraw consent at any time</li>
                  <li>File a complaint with a supervisory authority</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Cookies and Tracking
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to collect information about 
                  your browsing activities. You can manage your cookie preferences at any time 
                  through our cookie consent banner or browser settings.
                </p>
                <h3 className="font-display text-xl font-semibold text-foreground mt-6">
                  Types of Cookies We Use
                </h3>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li><strong className="text-foreground">Essential:</strong> Required for website functionality (always active)</li>
                  <li><strong className="text-foreground">Analytics:</strong> Help us understand how visitors use our site (optional)</li>
                  <li><strong className="text-foreground">Marketing:</strong> Used for relevant advertising (optional)</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Data Retention
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal information only for as long as necessary to fulfill 
                  the purposes for which it was collected:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Contact inquiries: 2 years after last interaction</li>
                  <li>Treatment referral data: 1 year after connection made</li>
                  <li>Analytics data: 26 months (anonymized after 14 months)</li>
                  <li>Account data: Until account deletion requested</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Children's Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not intended for individuals under 18 years of age. We do not 
                  knowingly collect personal information from children. If you believe we have 
                  collected information from a minor, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  International Data Transfers
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you are accessing our services from outside the United States, please be 
                  aware that your information may be transferred to, stored, and processed in 
                  the United States. We ensure appropriate safeguards are in place for such 
                  transfers in compliance with applicable data protection laws.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  material changes by posting the new policy on this page, updating the "Last updated" 
                  date, and sending you an email notification if you have an account with us.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy, want to exercise your rights, 
                  or have concerns about our practices, please contact us:
                </p>
                <ul className="mt-4 list-none space-y-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Privacy Officer:</strong>{" "}
                    <a href="mailto:privacy@rehablookup.com" className="text-primary hover:underline">
                      privacy@rehablookup.com
                    </a>
                  </li>
                  <li>
                    <strong className="text-foreground">Data Subject Requests:</strong>{" "}
                    <a href="mailto:dsr@rehablookup.com" className="text-primary hover:underline">
                      dsr@rehablookup.com
                    </a>
                  </li>
                  <li>
                    <strong className="text-foreground">General Support:</strong>{" "}
                    <a href="mailto:Support@rehablookup.com" className="text-primary hover:underline">
                      Support@rehablookup.com
                    </a>
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We will respond to all privacy-related inquiries within 30 days.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;