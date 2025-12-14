import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Building2, 
  Phone, 
  Globe, 
  FileText, 
  CheckCircle,
  MapPin,
  Mail,
  Users,
  Bed,
  Eye,
  ArrowUpRight,
  Shield,
  AlertCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  status: string;
}

const facilityTypes = [
  "Residential Treatment",
  "Outpatient Program",
  "Detox Center",
  "Sober Living",
  "Dual Diagnosis",
  "Luxury Rehab",
];

const genderOptions = [
  { value: "all", label: "All Genders" },
  { value: "male", label: "Men Only" },
  { value: "female", label: "Women Only" },
];

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function ProviderListingPage() {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFacility = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("facilities")
        .select("*")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setFacility(data);
      }
      setIsLoading(false);
    };

    fetchFacility();
  }, []);

  const handleSave = async () => {
    if (!facility) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from("facilities")
      .update({
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zip_code: facility.zip_code,
        phone: facility.phone,
        email: facility.email,
        website: facility.website,
        description: facility.description,
        facility_type: facility.facility_type,
        gender_served: facility.gender_served,
        bed_count: facility.bed_count,
      })
      .eq("id", facility.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error saving",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } else {
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      toast({
        title: "Changes saved",
        description: "Your listing has been updated successfully.",
      });
    }
  };

  const updateField = (field: keyof Facility, value: string | null) => {
    if (facility) {
      setFacility({ ...facility, [field]: value });
      setHasChanges(true);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Live", 
          description: "Your listing is visible to families searching for treatment",
          icon: CheckCircle, 
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 border-green-200"
        };
      case "pending":
        return { 
          label: "Under Review", 
          description: "Our team is reviewing your listing. This usually takes 24-48 hours.",
          icon: Clock, 
          variant: "secondary" as const,
          className: "bg-amber-500/10 text-amber-700 border-amber-200"
        };
      default:
        return { 
          label: "Draft", 
          description: "Complete all required fields and submit for review",
          icon: AlertCircle, 
          variant: "outline" as const,
          className: "bg-muted text-muted-foreground border-border"
        };
    }
  };

  if (isLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your listing...</p>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  if (!facility) {
    return (
      <ProviderLayout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
          <p className="mt-2 text-muted-foreground">
            Create your facility listing to start receiving inquiries from families.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link to="/provider-signup">Create Your Listing</Link>
          </Button>
        </div>
      </ProviderLayout>
    );
  }

  const statusConfig = getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;

  return (
    <ProviderLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-foreground">My Listing</h1>
              <Badge className={`gap-1.5 ${statusConfig.className}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {statusConfig.description}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {facility.status === "approved" && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`/rehab-centers/${facility.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges} 
              size="sm"
              className="gap-2 min-w-[120px]"
            >
              {showSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                    <CardDescription className="text-xs">Core details about your facility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium">
                    Facility Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={facility.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-xs font-medium">
                    Facility Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={facility.facility_type}
                    onValueChange={(value) => updateField("facility_type", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {facilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={facility.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    placeholder="Describe your facility, treatment approach, and what makes you unique..."
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your public profile.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Location</CardTitle>
                    <CardDescription className="text-xs">Where families can find you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-xs font-medium">
                    Street Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address"
                    value={facility.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs font-medium">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={facility.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs font-medium">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={facility.state}
                      onValueChange={(value) => updateField("state", value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-card max-h-[200px]">
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-xs font-medium">
                      ZIP Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="zip"
                      value={facility.zip_code}
                      onChange={(e) => updateField("zip_code", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                    <CardDescription className="text-xs">How families can reach you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={facility.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="h-10 pl-10"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={facility.email || ""}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="h-10 pl-10"
                        placeholder="contact@facility.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      value={facility.website || ""}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://www.yourfacility.com"
                      className="h-10 pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Program Details */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Program Details</CardTitle>
                    <CardDescription className="text-xs">Treatment capacity and demographics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-xs font-medium">
                      <Users className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Population Served
                    </Label>
                    <Select
                      value={facility.gender_served || "all"}
                      onValueChange={(value) => updateField("gender_served", value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beds" className="text-xs font-medium">
                      <Bed className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      Bed Count / Capacity
                    </Label>
                    <Input
                      id="beds"
                      value={facility.bed_count || ""}
                      onChange={(e) => updateField("bed_count", e.target.value)}
                      placeholder="e.g., 24"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Listing Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    facility.status === 'approved' ? 'bg-green-500/10' : 
                    facility.status === 'pending' ? 'bg-amber-500/10' : 'bg-muted'
                  }`}>
                    <StatusIcon className={`h-4 w-4 ${
                      facility.status === 'approved' ? 'text-green-600' : 
                      facility.status === 'pending' ? 'text-amber-600' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{statusConfig.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {facility.status === 'approved' ? 'Visible to families' : 
                       facility.status === 'pending' ? 'Under review' : 'Not published'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="font-medium">
                      {facility.status === 'approved' ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Listing Type</span>
                    <span className="font-medium">Standard</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Need Help?</p>
                  <p className="text-xs text-muted-foreground">
                    Contact our support team for assistance with your listing.
                  </p>
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link to="/provider-support">Contact Support</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Add a detailed description to improve visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Keep contact information up to date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Respond to inquiries within 24 hours</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Save Button - add padding to main content to prevent overlap */}
        <div className="lg:hidden h-20" /> {/* Spacer for fixed button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-30">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges} 
            className="w-full h-11 gap-2"
          >
            {showSaved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </ProviderLayout>
  );
}
