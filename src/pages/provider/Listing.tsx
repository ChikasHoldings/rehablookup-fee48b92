import { useEffect, useState } from "react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

export default function ProviderListingPage() {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      toast({
        title: "Changes saved",
        description: "Your facility information has been updated.",
      });
    }
  };

  const updateField = (field: keyof Facility, value: string | null) => {
    if (facility) {
      setFacility({ ...facility, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ProviderLayout>
    );
  }

  if (!facility) {
    return (
      <ProviderLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">No Listing Found</h2>
          <p className="mt-2 text-muted-foreground">
            You haven't created a facility listing yet.
          </p>
          <Button asChild className="mt-4">
            <a href="/provider-signup">Create Listing</a>
          </Button>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">My Listing</h1>
            <p className="text-muted-foreground mt-1">
              Manage your facility information
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Facility Details */}
        <Card>
          <CardHeader>
            <CardTitle>Facility Details</CardTitle>
            <CardDescription>Basic information about your treatment center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Facility Name</Label>
                <Input
                  id="name"
                  value={facility.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Facility Type</Label>
                <Select
                  value={facility.facility_type}
                  onValueChange={(value) => updateField("facility_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={facility.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={facility.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={facility.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={facility.zip_code}
                  onChange={(e) => updateField("zip_code", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How families can reach your facility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={facility.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={facility.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={facility.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://"
              />
            </div>
          </CardContent>
        </Card>

        {/* Program Details */}
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
            <CardDescription>Information about your treatment programs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender Served</Label>
                <Select
                  value={facility.gender_served || "all"}
                  onValueChange={(value) => updateField("gender_served", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="beds">Bed Count</Label>
                <Input
                  id="beds"
                  value={facility.bed_count || ""}
                  onChange={(e) => updateField("bed_count", e.target.value)}
                  placeholder="e.g., 20-30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Program Description</Label>
              <Textarea
                id="description"
                value={facility.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                placeholder="Describe your treatment programs and approach..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Credentials & Accreditation</CardTitle>
            <CardDescription>Upload licenses and certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                PDF, JPG, or PNG up to 10MB
              </p>
              <Button variant="outline" className="mt-4">
                Upload Documents
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="lg:hidden pb-20">
          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </ProviderLayout>
  );
}
