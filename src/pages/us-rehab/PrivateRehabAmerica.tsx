import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Lock, EyeOff, Shield, UserX, MapPin, Key } from "lucide-react";

const privacyFeatures = [
  { icon: EyeOff, title: "Anonymous Intake", description: "Use aliases and discrete registration processes to protect your identity" },
  { icon: Shield, title: "Enhanced HIPAA", description: "Beyond standard protections with additional confidentiality agreements" },
  { icon: UserX, title: "No Social Media", description: "Strict no-photography policies and social media blackout zones" },
  { icon: MapPin, title: "Secluded Locations", description: "Remote, gated facilities away from public view" },
  { icon: Lock, title: "Private Entrances", description: "Discrete arrival/departure procedures and private transport" },
  { icon: Key, title: "NDAs for Staff", description: "All staff sign confidentiality agreements beyond standard requirements" }
];

const PrivateRehabAmerica = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Private Rehab in America",
    "description": "Maximum confidentiality addiction treatment in the United States for celebrities, executives, and high-profile individuals requiring complete privacy and discretion.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "How confidential is private rehab really?", answer: "The highest-tier private programs offer complete anonymity: alias registration, private entrances, staff NDAs, no-photography policies, and secluded locations. Your presence is known only to essential clinical staff, and they're legally bound to protect your information." },
    { question: "Can anyone find out I was in treatment?", answer: "Without your explicit consent, no one can access your treatment information—not employers, family members, or government agencies. US HIPAA laws provide strong protections, and private facilities add additional layers of confidentiality." },
    { question: "What if I'm a public figure or celebrity?", answer: "Many private rehab centers specialize in treating celebrities, politicians, and public figures. They have extensive experience protecting high-profile clients with security protocols, media management, and absolute discretion." },
    { question: "Is treatment abroad from my home country more private?", answer: "Yes, seeking treatment in the US provides geographic distance from your community, eliminating the risk of being recognized. Combined with enhanced privacy protocols, international treatment offers maximum discretion." },
    { question: "How do private facilities prevent information leaks?", answer: "Elite private facilities use comprehensive protocols: staff background checks, confidentiality training, restricted access to patient information, secure communication systems, and legal consequences for breaches." },
    { question: "Can I be photographed or filmed at a private rehab?", answer: "Absolutely not. Private facilities have strict no-photography policies. Personal phones may be restricted, and facilities often have counter-surveillance measures to protect against unauthorized photography." }
  ];

  return (
    <Layout>
      <SEO
        title="Private Rehab America | Confidential Addiction Treatment USA"
        description="Maximum privacy addiction treatment in America. Anonymous intake, secluded locations, and celebrity-level confidentiality for high-profile clients and privacy-conscious individuals."
        canonical="/us-rehab/private-rehab-america"
        keywords={["private rehab America", "confidential addiction treatment", "anonymous rehab USA", "celebrity rehab privacy", "discrete drug rehab", "secret treatment center"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Private Rehab", url: "/us-rehab/private-rehab-america" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Private Rehab America" },
        ]} />
      </div>

      <InternationalHero title="Private Rehab in America" subtitle="Maximum Confidentiality, Complete Discretion" description="Protect your reputation while healing. America's most private addiction treatment facilities offer anonymous intake, secluded locations, and comprehensive privacy protocols." keywords={["private rehab", "confidential treatment", "anonymous rehab", "discrete recovery"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Lock className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">Privacy Protections</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Complete Confidentiality Guaranteed</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Private treatment facilities implement multiple layers of protection to ensure your recovery remains completely confidential.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {privacyFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Private Treatment FAQs" subtitle="Common questions about confidential addiction treatment in America." faqs={customFAQs} schemaId="private-rehab-faq" />
      <PlacementCTA title="Your Privacy is Our Priority" description="Discrete, confidential placement into America's most private treatment facilities. Your secret is safe with us." />
    </Layout>
  );
};

export default PrivateRehabAmerica;
