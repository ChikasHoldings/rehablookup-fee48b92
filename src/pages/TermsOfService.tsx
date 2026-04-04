import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  return (
    <Layout>
      <SEO
        title="Terms of Service"
        description="Read RehabLookup's terms of service. Understand the terms and conditions for using our addiction treatment directory and services."
        canonical="/terms-of-service"
        canonical="/terms-of-service"
      />
      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="mb-4 text-center sm:text-left">
            <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Terms of Service</span>
            </span>
          </nav>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Terms of Service
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
                  Acceptance of Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using RehabLookup ("the Service"), you agree to be bound by these 
                  Terms of Service. If you do not agree to these terms, please do not use our Service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  RehabLookup is a directory and referral service that connects individuals and families 
                  with addiction treatment centers. We provide information about treatment facilities 
                  but do not provide medical treatment, advice, or healthcare services.
                </p>
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="font-semibold text-foreground">Important Disclaimer:</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    RehabLookup is NOT a treatment provider. We do not provide medical advice, 
                    diagnosis, or treatment. Always seek the advice of qualified healthcare 
                    professionals regarding any medical conditions or treatment decisions.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  User Responsibilities
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  When using our Service, you agree to:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Provide accurate and truthful information</li>
                  <li>Use the Service for lawful purposes only</li>
                  <li>Not misuse or attempt to disrupt the Service</li>
                  <li>Not submit false or misleading information</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Treatment Center Listings
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  While we make reasonable efforts to verify the information provided by treatment 
                  centers listed on our platform, we do not guarantee the accuracy, completeness, 
                  or quality of any treatment facility. Users are responsible for conducting their 
                  own due diligence before selecting a treatment provider.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Treatment centers listed on our platform are solely responsible for:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>The accuracy of their listing information</li>
                  <li>Maintaining proper licensing and accreditation</li>
                  <li>The quality and safety of their treatment services</li>
                  <li>Their communications and interactions with users</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  No Medical Advice
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The information provided on RehabLookup is for informational purposes only and 
                  should not be considered medical advice. Our Service does not create a 
                  physician-patient relationship. Always consult with qualified healthcare 
                  professionals for medical decisions.
                </p>
                <p className="mt-4 font-semibold text-foreground">
                  In case of a medical emergency, call 911 immediately.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Limitation of Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  To the fullest extent permitted by law, RehabLookup shall not be liable for any 
                  indirect, incidental, special, consequential, or punitive damages arising from 
                  your use of the Service or any treatment facility listed on our platform.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  We are not responsible for:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>The actions or omissions of treatment centers</li>
                  <li>Treatment outcomes or experiences</li>
                  <li>Any damages resulting from reliance on information provided</li>
                  <li>Third-party content or external links</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Intellectual Property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content on RehabLookup, including text, graphics, logos, and software, is the 
                  property of RehabLookup or its licensors and is protected by copyright and other 
                  intellectual property laws. You may not reproduce, distribute, or create derivative 
                  works without our express written permission.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your use of the Service is also governed by our{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  , which is incorporated into these Terms by reference.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Changes to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. Changes will be effective 
                  immediately upon posting to the website. Your continued use of the Service after 
                  any changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Governing Law
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the 
                  United States, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Contact Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <ul className="mt-4 list-none space-y-2 text-muted-foreground">
                  <li>Email: <a href="mailto:legal@rehablookup.com" className="text-primary hover:underline">legal@rehablookup.com</a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TermsOfService;
