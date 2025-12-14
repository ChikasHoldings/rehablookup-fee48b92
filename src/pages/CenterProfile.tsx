import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LeadSubmissionForm } from "@/components/forms/LeadSubmissionForm";
import {
  MapPin,
  Phone,
  Globe,
  Star,
  CheckCircle,
  Shield,
  ArrowLeft,
  Clock,
  Users,
  Heart,
  Stethoscope,
  Building2,
  BadgeCheck,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

interface FacilityData {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  featured: boolean;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
}

const CenterProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const contactFormRef = useRef<HTMLDivElement>(null);
  const [showAllInsurance, setShowAllInsurance] = useState(false);
  const fromSearch = location.state?.fromSearch;

  // Fetch facility data by slug
  const { data: facility, isLoading, error } = useQuery({
    queryKey: ["facility", slug],
    queryFn: async (): Promise<FacilityData | null> => {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id,
          name,
          slug,
          city,
          state,
          zip_code,
          address,
          phone,
          email,
          website,
          description,
          facility_type,
          gender_served,
          bed_count,
          featured,
          facility_services (service_name),
          facility_insurance (insurance_name),
          facility_age_groups (age_group),
          facility_credentials (accreditations, licensing_info)
        `)
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();

      if (error) throw error;
      return data as FacilityData | null;
    },
    enabled: !!slug,
  });

  // Track view
  useEffect(() => {
    if (facility?.id) {
      supabase.functions.invoke("track-view", {
        body: { facilityId: facility.id },
      });
    }
  }, [facility?.id]);

  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full mb-6" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !facility) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="mb-3 font-display text-2xl font-bold text-foreground">
              Center Not Found
            </h1>
            <p className="mb-8 text-muted-foreground">
              The treatment center you're looking for doesn't exist or is no longer available.
            </p>
            <Link to="/rehab-centers">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Search Results
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const services = facility.facility_services.map((s) => s.service_name);
  const insuranceList = facility.facility_insurance.map((i) => i.insurance_name);
  const ageGroups = facility.facility_age_groups.map((a) => a.age_group);
  const credentials = facility.facility_credentials[0];

  return (
    <Layout>
      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <div className="flex gap-2">
          <a href={`tel:${facility.phone}`} className="flex-1">
            <Button className="w-full gap-2">
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Button variant="outline" className="flex-1" onClick={scrollToContact}>
            Contact
          </Button>
        </div>
      </div>

      {/* Header Section */}
      <section className="bg-primary py-8 md:py-12">
        <div className="container">
          {/* Back Link */}
          {fromSearch && (
            <Link
              to="/rehab-centers"
              className="mb-4 inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search results
            </Link>
          )}

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {/* Logo Placeholder */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-card shadow-lg md:h-20 md:w-20">
                <span className="font-display text-2xl font-bold text-primary md:text-3xl">
                  {facility.name.charAt(0)}
                </span>
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {facility.featured && (
                    <Badge className="bg-accent text-accent-foreground border-0 gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
                  {facility.name}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-primary-foreground/80">
                  <MapPin className="h-4 w-4" />
                  {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="hidden md:flex flex-col gap-2 md:flex-row">
              <a href={`tel:${facility.phone}`}>
                <Button variant="hero-light" size="lg" className="gap-2 shadow-lg">
                  <Phone className="h-4 w-4" />
                  Call Now
                </Button>
              </a>
              {facility.website && (
                <a href={facility.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-white/10">
                    <Globe className="h-4 w-4" />
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
              <Button variant="outline" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-white/10" onClick={scrollToContact}>
                Contact Center
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Info Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            {services.slice(0, 4).map((service) => (
              <Badge key={service} variant="secondary" className="px-3 py-1.5">
                {service}
              </Badge>
            ))}
            {services.length > 4 && (
              <Badge variant="outline" className="px-3 py-1.5">
                +{services.length - 4} more
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 md:py-14 pb-24 md:pb-14">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    About This Facility
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {facility.description || "A trusted treatment center providing quality care and support for individuals seeking recovery. Our dedicated team is committed to helping patients achieve lasting wellness."}
                </p>
              </div>

              {/* Details Section */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Facility Details
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {facility.address}<br />
                        {facility.city}, {facility.state} {facility.zip_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                    <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Phone</p>
                      <a href={`tel:${facility.phone}`} className="text-sm text-primary hover:underline">
                        {facility.phone}
                      </a>
                    </div>
                  </div>
                  {facility.website && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                      <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Website</p>
                        <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                    <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Facility Type</p>
                      <p className="text-sm text-muted-foreground">{facility.facility_type}</p>
                    </div>
                  </div>
                  {facility.gender_served && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                      <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Gender Served</p>
                        <p className="text-sm text-muted-foreground">{facility.gender_served}</p>
                      </div>
                    </div>
                  )}
                  {facility.bed_count && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                      <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Bed Count</p>
                        <p className="text-sm text-muted-foreground">{facility.bed_count} beds</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Services & Programs */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Services & Programs
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => (
                    <Badge key={service} variant="secondary" className="px-3 py-1.5 text-sm">
                      {service}
                    </Badge>
                  ))}
                </div>
                {ageGroups.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-3">Age Groups Served</p>
                    <div className="flex flex-wrap gap-2">
                      {ageGroups.map((age) => (
                        <Badge key={age} variant="outline" className="px-3 py-1.5 text-sm">
                          {age}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance Accepted */}
              {insuranceList.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      Insurance Accepted
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(showAllInsurance ? insuranceList : insuranceList.slice(0, 8)).map((insurance) => (
                      <Badge key={insurance} variant="secondary" className="px-3 py-1.5 text-sm">
                        {insurance}
                      </Badge>
                    ))}
                  </div>
                  {insuranceList.length > 8 && (
                    <button
                      onClick={() => setShowAllInsurance(!showAllInsurance)}
                      className="mt-4 flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {showAllInsurance ? "Show less" : `View all ${insuranceList.length} insurances`}
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAllInsurance ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Trust & Compliance */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <BadgeCheck className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Trust & Compliance
                  </h2>
                </div>
                {credentials?.accreditations && (
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium text-foreground">Accreditations:</span> {credentials.accreditations}
                  </p>
                )}
                {credentials?.licensing_info && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-medium text-foreground">Licensing:</span> {credentials.licensing_info}
                  </p>
                )}
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Disclaimer:</strong> RehabLookup is a directory service and does not provide medical advice or treatment. 
                    By contacting this provider, you consent to share your information for follow-up purposes. 
                    Always verify credentials and insurance coverage directly with the facility.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:col-span-1">
              <div ref={contactFormRef} className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                    <Phone className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Contact This Center
                    </h2>
                    <p className="text-sm text-muted-foreground">Get help today</p>
                  </div>
                </div>
                
                <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Quick Response</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A treatment specialist will contact you within 24 hours.
                  </p>
                </div>

                <LeadSubmissionForm 
                  facilityId={facility.id} 
                  facilityName={facility.name}
                  facilityEmail={facility.email}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-12 md:py-16 hidden md:block">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-8 text-primary-foreground/80">
              Take the first step today. Our admissions team is available 24/7 to help.
            </p>
            <a href={`tel:${facility.phone}`}>
              <Button variant="hero-light" size="lg" className="gap-2 shadow-lg">
                <Phone className="h-4 w-4" />
                Call {facility.name}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CenterProfile;
