import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import {
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Crown, Star, Utensils, Waves, Dumbbell, Flower2 } from "lucide-react";

const luxuryAmenities = [
  { icon: Crown, title: "Private Suites", description: "Spacious private accommodations with premium bedding and en-suite bathrooms" },
  { icon: Utensils, title: "Gourmet Dining", description: "Chef-prepared meals, nutritional counseling, and specialized dietary options" },
  { icon: Waves, title: "Oceanfront Locations", description: "Serene beachfront and mountain settings for healing in nature" },
  { icon: Flower2, title: "Spa Services", description: "Massage therapy, acupuncture, and holistic wellness treatments" },
  { icon: Dumbbell, title: "Fitness Centers", description: "Personal trainers, yoga studios, and state-of-the-art gym facilities" },
  { icon: Star, title: "Concierge Service", description: "24/7 personal assistance, airport transfers, and travel coordination" },
];

const LuxuryRehabAmerica = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Luxury Rehab in America",
    "description": "Exclusive luxury addiction treatment centers in the United States offering five-star amenities, private accommodations, and world-class clinical care.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "What defines a luxury rehab center?", answer: "Luxury rehab centers offer premium accommodations (private rooms/suites), gourmet cuisine, spa services, scenic locations, high staff-to-patient ratios, and exclusive amenities like pools, gyms, and concierge services—all while providing evidence-based clinical treatment." },
    { question: "How much does luxury rehab in America cost?", answer: "Luxury treatment programs typically range from $30,000-$100,000+ per month. Ultra-luxury programs can exceed $150,000 monthly. These prices reflect premium accommodations, high staff ratios, specialized therapies, and exclusive amenities." },
    { question: "Is luxury rehab more effective than standard treatment?", answer: "While clinical outcomes depend on treatment quality rather than amenities, luxury settings often provide advantages: lower stress environments, longer stays, more individual attention, access to cutting-edge therapies, and comprehensive aftercare support." },
    { question: "What amenities do luxury US rehabs offer?", answer: "Premium amenities include private rooms/suites, gourmet chef-prepared meals, spa services, fitness centers with personal trainers, equine therapy, yoga studios, meditation gardens, oceanfront or mountain locations, and 24/7 concierge services." },
    { question: "Can I work remotely during luxury rehab?", answer: "Many luxury programs offer executive tracks allowing limited work access with private offices, WiFi, and flexible scheduling. However, most programs recommend fully disconnecting for optimal recovery. Executive-specific programs are designed for continued work needs." }
  ];

  return (
    <Layout>
      <SEO
        title="Luxury Rehab in America | Five-Star Addiction Treatment USA"
        description="Experience luxury addiction treatment in America. Five-star accommodations, gourmet dining, spa amenities, and world-class clinical care. Premium rehab for international clients."
        canonical="/us-rehab/luxury-rehab-america"
        keywords={["luxury rehab America", "five-star rehab USA", "premium addiction treatment", "luxury drug rehab", "high-end rehab America", "exclusive rehab centers USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Luxury Rehab America", url: "/us-rehab/luxury-rehab-america" },
        ]}
      />

      <InternationalHero
        title="Luxury Rehab in America"
        subtitle="Five-Star Treatment, World-Class Recovery"
        description="Experience addiction treatment in America's most exclusive facilities. Private suites, gourmet dining, spa amenities, and unparalleled clinical care in stunning locations."
        keywords={["luxury rehab USA", "five-star treatment", "premium rehab America", "exclusive addiction treatment"]}
        breadcrumbItems={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Luxury Rehab America" },
        ]}
      />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Premium Amenities & Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Luxury facilities combine world-class addiction treatment with resort-quality accommodations and personalized service.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {luxuryAmenities.map((amenity, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                  <amenity.icon className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{amenity.title}</h3>
                <p className="text-muted-foreground">{amenity.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Luxury Treatment FAQs" subtitle="Common questions about premium addiction treatment in the United States." faqs={customFAQs} schemaId="luxury-rehab-america-faq" />
      <PlacementCTA title="Experience Luxury Recovery" description="Let us connect you with America's most exclusive treatment facilities. Personalized placement into the perfect luxury program." />
    </Layout>
  );
};

export default LuxuryRehabAmerica;
