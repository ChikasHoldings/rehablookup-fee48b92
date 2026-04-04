import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, CountriesServed, InternationalFAQ, PlacementCTA } from "./components";
import { Plane, FileCheck, Home, CreditCard, Clock, Shield, CheckCircle, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-international-rehab.jpg";

const travelSteps = [
  { icon: FileCheck, title: "1. Initial Assessment", description: "Confidential clinical intake and treatment matching. Our advisors evaluate your needs and recommend ideal U.S. programs." },
  { icon: Plane, title: "2. Visa & Travel Planning", description: "Guidance on B-2 visa applications, ESTA waivers, and medical travel documentation. We coordinate with the facility for admission letters." },
  { icon: Home, title: "3. Arrival & Admission", description: "Airport pickup, luxury transport to your facility, and seamless check-in. Many centers offer private transfer services." },
  { icon: CreditCard, title: "4. Treatment & Aftercare", description: "World-class clinical care followed by comprehensive discharge planning and international aftercare coordination." },
];

const whyTravel = [
  { title: "FDA-Approved Medications", description: "Access cutting-edge pharmacological treatments unavailable in many countries, including the latest MAT protocols." },
  { title: "Privacy & Anonymity", description: "Treat far from home, away from social stigma. U.S. HIPAA laws guarantee the strictest medical confidentiality." },
  { title: "Diverse Treatment Options", description: "From beachfront luxury to mountain retreats—the U.S. offers more treatment modalities than any other country." },
  { title: "English-Speaking Staff", description: "Most facilities also offer multilingual counselors for Arabic, Spanish, French, Mandarin, and more." },
];

const TravelToUSAForRehab = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Travel to USA for Rehab",
    description: "Complete guide to traveling to the United States for addiction treatment. Visa guidance, facility selection, and personalized placement for international patients.",
    provider: { "@type": "Organization", name: "RehabLookup", url: "https://rehablookup.com" },
    areaServed: { "@type": "Country", name: "United States" },
  };

  const faqs = [
    { question: "Do I need a visa to attend rehab in the USA?", answer: "Most international patients enter on a B-2 (tourist/medical) visa or, for eligible countries like the UK and Australia, an ESTA waiver. Treatment facilities provide admission letters to support your visa application. Our team guides you through the entire process." },
    { question: "How long does the travel planning process take?", answer: "Most patients are admitted within 7–14 days of initial contact. Emergency admissions can be arranged in 24–72 hours for urgent cases. Visa processing time varies by country but ESTA approvals are typically instant." },
    { question: "Will the facility help with airport transfers?", answer: "Yes. Most premium U.S. facilities offer private airport pickup and transportation. Some provide luxury vehicle or helicopter transfers for VIP clients." },
    { question: "Can my family visit during treatment?", answer: "Many facilities welcome family involvement and offer dedicated family therapy programs, visiting hours, and even on-site guest accommodations at luxury centers." },
    { question: "What happens after treatment ends?", answer: "Facilities create comprehensive aftercare plans including referrals to therapists in your home country, virtual counseling options, alumni support networks, and relapse prevention strategies." },
  ];

  return (
    <Layout>
      <SEO
        title="Travel to USA for Rehab | International Treatment Guide"
        description="Complete guide to traveling to the United States for addiction treatment. Visa guidance, travel logistics, facility selection, and personalized placement for international patients."
        canonical="/travel-to-usa-for-rehab"
        keywords={["travel to USA for rehab", "fly to America for treatment", "international rehab travel", "medical travel rehab USA", "rehab abroad in USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "International", url: "/international" },
          { name: "Travel to USA for Rehab", url: "/travel-to-usa-for-rehab" },
        ]}
      />

      <InternationalPageHero
        flag="✈️"
        badge="International Treatment Travel"
        title="Travel to the USA for World-Class Rehab"
        subtitle="Your Complete Guide to Addiction Treatment Abroad"
        description="Thousands of international patients travel to the United States each year for addiction treatment. We handle the logistics so you can focus on recovery."
        trustPoints={["Visa Guidance", "Airport Transfers", "24/7 Concierge", "HIPAA Protected"]}
        heroImage={heroImg}
        heroAlt="International patient traveling to USA for addiction treatment"
      />

      {/* Why Travel Section */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why Travel to the USA for Treatment?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">The United States leads the world in addiction medicine, offering unmatched clinical expertise and treatment diversity.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {whyTravel.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-4 p-5 rounded-xl bg-muted/30 border border-border/50">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Step-by-step Process */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works: From Inquiry to Admission</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Our streamlined process gets you from first contact to facility admission in as little as one week.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {travelSteps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center p-6 rounded-xl bg-background border border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Links */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Guides by Country</h2>
            <p className="text-muted-foreground">Country-specific information on visas, travel, and treatment options.</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { flag: "🇬🇧", label: "United Kingdom", href: "/us-rehab/uk-patients" },
              { flag: "🇨🇦", label: "Canada", href: "/us-rehab/canadian-patients" },
              { flag: "🇦🇪", label: "UAE & Gulf", href: "/us-rehab/uae-middle-east" },
              { flag: "🇦🇺", label: "Australia", href: "/us-rehab/australian-patients" },
              { flag: "🇪🇺", label: "Europe", href: "/us-rehab/european-patients" },
            ].map((c) => (
              <Link key={c.href} to={c.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-colors">
                <span className="text-3xl">{c.flag}</span>
                <span className="text-sm font-medium text-foreground">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Travel to USA for Rehab FAQs" subtitle="Common questions about traveling internationally for addiction treatment." faqs={faqs} schemaId="travel-usa-rehab-faq" />
      <PlacementCTA title="Ready to Travel for Treatment?" description="Our international placement team coordinates everything—from facility selection to airport pickup. Start your journey today." />
    </Layout>
  );
};

export default TravelToUSAForRehab;
