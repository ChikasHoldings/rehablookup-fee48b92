import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Link } from "react-router-dom";
import { MapPin, Sun, Palmtree, Anchor, Building2 } from "lucide-react";

const floridaHighlights = [
  { region: "South Florida (Miami/Fort Lauderdale)", description: "America's recovery capital with the highest concentration of treatment centers and sober living", icon: Palmtree, specialties: ["Diverse Programs", "Sober Living Networks", "Year-Round Sunshine"] },
  { region: "Palm Beach", description: "Upscale treatment in Florida's most prestigious communities with beach access", icon: Sun, specialties: ["Luxury Treatment", "Executive Programs", "Private Beach Access"] },
  { region: "Tampa Bay Area", description: "Growing treatment hub with excellent facilities and more affordable options", icon: Anchor, specialties: ["Value-Focused Care", "Family Programs", "Medical Excellence"] },
  { region: "Jacksonville & North Florida", description: "Quieter settings with quality treatment away from the busier south", icon: Building2, specialties: ["Peaceful Settings", "Long-Term Programs", "Faith-Based Options"] }
];

const LuxuryRehabFlorida = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Luxury Rehab in Florida",
    "description": "Premium addiction treatment centers in Florida including Palm Beach luxury facilities, Miami treatment centers, and comprehensive recovery programs throughout the Sunshine State.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "State", "name": "Florida" }
  };

  const customFAQs = [
    { question: "Why is Florida called America's recovery capital?", answer: "Florida has the highest concentration of addiction treatment centers in the United States. The combination of year-round warm weather, extensive sober living networks, supportive recovery communities, and favorable insurance regulations makes it the top destination for treatment seekers." },
    { question: "What's the difference between South Florida and other regions?", answer: "South Florida (Miami, Fort Lauderdale, Palm Beach) offers the most treatment options and established recovery communities but can be busy. Tampa, Jacksonville, and North Florida provide excellent care in quieter, often more affordable settings." },
    { question: "How much does Florida luxury rehab cost?", answer: "Florida luxury treatment ranges from $25,000-$80,000+ per month. Palm Beach commands premium prices, while excellent facilities in Tampa or North Florida may offer similar quality at lower costs. Florida generally offers better value than California." },
    { question: "Is Florida good for international patients?", answer: "Excellent. Florida's diverse population means multilingual staff is common, international communities provide cultural familiarity, and major airports (Miami, Fort Lauderdale, Tampa) offer easy access from global destinations." },
    { question: "What about hurricanes and treatment?", answer: "Florida treatment centers have comprehensive hurricane protocols including evacuation plans and backup facilities. Hurricane season (June-November) rarely disrupts treatment, and facilities are well-prepared for weather events." }
  ];

  return (
    <Layout>
      <SEO
        title="Luxury Rehab Florida | Palm Beach & Miami Treatment Centers"
        description="Find luxury rehab in Florida including Palm Beach executive centers, Miami addiction treatment, and South Florida recovery programs. Year-round sunshine for international patients."
        canonical="/us-rehab/luxury-rehab-florida"
        keywords={["luxury rehab Florida", "Palm Beach rehab", "Miami addiction treatment", "Florida drug rehab", "South Florida recovery", "Fort Lauderdale treatment centers"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Luxury Rehab Florida", url: "/us-rehab/luxury-rehab-florida" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Luxury Rehab Florida" },
        ]} />
      </div>

      <InternationalHero title="Luxury Rehab in Florida" subtitle="Palm Beach • Miami • Fort Lauderdale • Tampa" description="America's recovery capital offers world-class addiction treatment in the Sunshine State. From Palm Beach luxury to South Florida's extensive recovery community, find your path to healing." keywords={["Florida rehab", "Palm Beach treatment", "Miami rehab", "South Florida recovery"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <MapPin className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">Florida Regions</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Treatment Destinations in Florida</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From bustling South Florida to peaceful North Florida, find the right environment for your recovery.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {floridaHighlights.map((region, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <region.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{region.region}</h3>
                    <p className="text-muted-foreground mb-4">{region.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {region.specialties.map((specialty, idx) => (
                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">{specialty}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/rehab-centers/florida" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold">Browse All Florida Facilities →</Link>
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Florida Treatment FAQs" subtitle="Everything you need to know about luxury rehab in the Sunshine State." faqs={customFAQs} schemaId="luxury-rehab-florida-faq" />
      <PlacementCTA title="Find Your Florida Treatment Center" description="From Palm Beach luxury to South Florida's recovery community, we'll place you in the perfect Florida facility." />
    </Layout>
  );
};

export default LuxuryRehabFlorida;
