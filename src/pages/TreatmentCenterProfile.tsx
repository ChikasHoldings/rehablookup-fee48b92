import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ContactRequestForm } from "@/components/forms/ContactRequestForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { treatmentCenters } from "@/data/treatmentCenters";
import {
  MapPin,
  Phone,
  Star,
  CheckCircle,
  Shield,
  Clock,
  ArrowLeft,
  Building,
  Heart,
} from "lucide-react";

const TreatmentCenterProfile = () => {
  const { id } = useParams<{ id: string }>();
  const center = treatmentCenters.find((c) => c.id === id);

  if (!center) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="mb-4 font-display text-3xl font-bold text-foreground">
            Center Not Found
          </h1>
          <p className="mb-8 text-muted-foreground">
            The treatment center you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/rehab-centers">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link to="/rehab-centers" className="hover:text-primary transition-colors">Find Treatment</Link>
            <span>/</span>
            <span className="text-foreground">{center.name}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="border-b border-border bg-secondary/30 py-8 md:py-12">
        <div className="container">
          <Link to="/rehab-centers" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Search Results
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {center.featured && (
                  <Badge className="gap-1 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 fill-current" />
                    Featured
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified Facility
                </Badge>
              </div>

              <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
                {center.name}
              </h1>

              <p className="mb-4 flex items-center gap-2 text-lg text-muted-foreground">
                <MapPin className="h-5 w-5" />
                {center.address}
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5">
                  <Star className="h-4 w-4 fill-success text-success" />
                  <span className="font-semibold text-success">{center.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({center.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={`tel:${center.phone}`}>
                <Button variant="success" size="lg" className="w-full gap-2">
                  <Phone className="h-5 w-5" />
                  Call Now: {center.phone}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-10">
              {/* About */}
              <div>
                <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
                  About This Facility
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {center.description}
                </p>
              </div>

              {/* Program Overview */}
              <div>
                <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
                  Program Overview
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {center.programOverview}
                </p>
              </div>

              {/* Treatment Types */}
              <div>
                <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
                  Treatment Programs
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {center.treatmentTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-3 rounded-lg bg-secondary/50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div>
                <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
                  Insurance Accepted
                </h2>
                <div className="flex flex-wrap gap-2">
                  {center.insuranceAccepted.map((ins) => (
                    <Badge key={ins} variant="secondary" className="gap-1 text-sm py-1.5 px-3">
                      <Shield className="h-3.5 w-3.5" />
                      {ins}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">
                  Facility Amenities
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {center.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div>
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-6 text-center">
                  <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                    Request Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A specialist will contact you within 24 hours
                  </p>
                </div>
                <ContactRequestForm centerName={center.name} />

                <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-6">
                  <Clock className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    Available 24/7 for urgent inquiries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="border-t border-border bg-secondary/30 py-12">
        <div className="container text-center">
          <div className="mx-auto max-w-2xl">
            <Building className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-3 font-display text-2xl font-semibold text-foreground">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Call now to speak directly with {center.name}'s admissions team.
            </p>
            <a href={`tel:${center.phone}`}>
              <Button variant="success" size="xl" className="gap-2">
                <Phone className="h-5 w-5" />
                Call {center.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TreatmentCenterProfile;
