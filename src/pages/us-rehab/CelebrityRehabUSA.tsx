import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Star, Lock, Crown, Shield, Users, Eye } from "lucide-react";

const privacyFeatures = [
  { icon: Lock, title: "Maximum Confidentiality", description: "NDAs for all staff, no photography policies, and secure isolated facilities away from public view" },
  { icon: Shield, title: "Media Protection", description: "Professional protocols for media inquiries, paparazzi deterrence, and reputation management support" },
  { icon: Crown, title: "VIP Accommodations", description: "Private villas, exclusive suites, and personalized luxury amenities befitting your lifestyle" },
  { icon: Users, title: "Curated Clientele", description: "Programs with carefully screened, high-profile patient populations who understand discretion" },
  { icon: Eye, title: "Alias Admission", description: "Register under alternate names, private billing arrangements, and untraceable treatment records" },
  { icon: Star, title: "Concierge Everything", description: "Personal assistants, private chefs, security details, and 24/7 concierge services" },
];

const CelebrityRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Celebrity Rehab in USA",
    "description": "Ultra-private addiction treatment for celebrities, public figures, and high-profile individuals. Maximum confidentiality, VIP accommodations, media protection.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "How do celebrity rehab programs protect privacy?", answer: "Elite US facilities employ multiple privacy layers: staff NDAs, no-phone policies for other patients, private entrances, alias registration, isolated locations, and professional media management. Some facilities exclusively serve high-profile clients to ensure mutual discretion." },
    { question: "Can I maintain my public career during treatment?", answer: "Depending on your needs, select programs allow limited work activities—private meetings, voice recording, or essential communications. However, most recommend full disconnection for optimal recovery. Your team can handle public messaging during your absence." },
    { question: "What if my treatment leaks to the media?", answer: "Legitimate celebrity programs have zero tolerance for leaks. Staff undergo rigorous vetting, patients sign mutual NDAs, and facilities have legal teams ready to pursue violations. Reputation management consultants can also help control any narrative." },
    { question: "How much does celebrity rehab cost?", answer: "Ultra-private celebrity programs range from $50,000-$200,000+ per month. This reflects private accommodations, security measures, exclusive amenities, and the premium placed on absolute confidentiality. Consider it an investment in your career and life." },
    { question: "Can my security team accompany me?", answer: "Many celebrity facilities accommodate personal security. Some integrate your team into the facility's security protocols, while others provide their own discrete professional protection. Arrangements are made on a case-by-case basis." }
  ];

  return (
    <Layout>
      <SEO
        title="Celebrity Rehab USA | Ultra-Private VIP Addiction Treatment"
        description="Ultra-private addiction treatment for celebrities and public figures. Maximum confidentiality, VIP accommodations, media protection, alias admission. America's most discrete programs."
        canonical="/us-rehab/celebrity-rehab-usa"
        keywords={["celebrity rehab USA", "VIP addiction treatment", "private rehab celebrities", "famous people rehab", "high profile rehab America", "confidential rehab stars"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Celebrity Rehab", url: "/us-rehab/celebrity-rehab-usa" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Celebrity Rehab USA" },
        ]} />
      </div>

      <InternationalHero title="Celebrity Rehab in the USA" subtitle="Ultra-Private Treatment for Public Figures" description="Access America's most confidential treatment programs designed for celebrities, athletes, executives, and high-profile individuals. Maximum privacy, VIP accommodations, and world-class clinical care." keywords={["celebrity rehab", "VIP addiction treatment", "private rehab famous", "confidential rehab"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Uncompromising Privacy & Luxury</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Elite programs designed for those who require absolute discretion and premium care.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {privacyFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Celebrity Treatment FAQs" subtitle="Answers to confidential inquiries about ultra-private addiction treatment." faqs={customFAQs} schemaId="celebrity-rehab-usa-faq" />
      <PlacementCTA title="Confidential Consultation" description="Speak privately with our VIP placement specialists. Complete discretion guaranteed from first contact." />
    </Layout>
  );
};

export default CelebrityRehabUSA;
