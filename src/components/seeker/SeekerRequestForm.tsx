import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const requestFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  phone: z.string().trim().min(10, "Valid phone number required").max(20),
  email: z.string().trim().email("Valid email required").max(100),
  locationZip: z.string().trim().min(5, "ZIP code required").max(10),
  locationCityState: z.string().trim().max(100).optional(),
  whoSeekingHelp: z.enum(["self", "loved-one"]),
  urgency: z.enum(["immediate", "within-week", "flexible"]),
  preferredContact: z.enum(["call", "text", "email"]),
  levelOfCare: z.string().optional(),
  insuranceType: z.string().optional(),
  primarySubstance: z.array(z.string()).optional(),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // Honeypot
});

type RequestFormData = z.infer<typeof requestFormSchema>;

interface SeekerRequestFormProps {
  facilityId: string;
  facilityName: string;
  facilityCity?: string;
  facilityState?: string;
  prefillData?: Partial<RequestFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const URGENCY_OPTIONS = [
  { value: "immediate", label: "ASAP - Urgent need" },
  { value: "within-week", label: "Within a week" },
  { value: "flexible", label: "Flexible - Exploring options" },
];

const WHO_OPTIONS = [
  { value: "self", label: "Myself" },
  { value: "loved-one", label: "A loved one" },
];

const CONTACT_OPTIONS = [
  { value: "call", label: "Phone Call" },
  { value: "text", label: "Text Message" },
  { value: "email", label: "Email" },
];

const LEVEL_OF_CARE_OPTIONS = [
  { value: "detox", label: "Medical Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Standard Outpatient" },
  { value: "sober-living", label: "Sober Living" },
  { value: "not-sure", label: "Not sure - Need guidance" },
];

const INSURANCE_OPTIONS = [
  { value: "ppo", label: "PPO / Private Insurance" },
  { value: "medicaid", label: "Medicaid" },
  { value: "medicare", label: "Medicare" },
  { value: "self-pay", label: "Self-Pay / No Insurance" },
  { value: "not-sure", label: "Not sure" },
];

const SUBSTANCE_OPTIONS = [
  "Alcohol",
  "Opioids",
  "Prescription Drugs",
  "Cocaine/Crack",
  "Methamphetamine",
  "Marijuana",
  "Other",
];

export function SeekerRequestForm({
  facilityId,
  facilityName,
  facilityCity,
  facilityState,
  prefillData,
  onSuccess,
  onCancel,
}: SeekerRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSubstances, setSelectedSubstances] = useState<string[]>(prefillData?.primarySubstance || []);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      firstName: prefillData?.firstName || "",
      lastName: prefillData?.lastName || "",
      phone: prefillData?.phone || "",
      email: prefillData?.email || "",
      locationZip: prefillData?.locationZip || "",
      locationCityState: prefillData?.locationCityState || "",
      whoSeekingHelp: prefillData?.whoSeekingHelp || "self",
      urgency: prefillData?.urgency || "flexible",
      preferredContact: prefillData?.preferredContact || "call",
      levelOfCare: prefillData?.levelOfCare || "",
      insuranceType: prefillData?.insuranceType || "",
      message: prefillData?.message || "",
      website: "",
    },
  });

  // Fetch user profile to prefill
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch seeker profile with all available fields
      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('first_name, last_name, display_name, phone, zipcode, city, state')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Prefill email from session
      if (session.user.email && !prefillData?.email) {
        setValue('email', session.user.email);
      }

      // Prefill from profile data
      if (profile) {
        // Use first_name and last_name if available, otherwise parse display_name
        if (profile.first_name && !prefillData?.firstName) {
          setValue('firstName', profile.first_name);
        } else if (profile.display_name && !prefillData?.firstName) {
          const parts = profile.display_name.split(' ');
          if (parts.length >= 1) setValue('firstName', parts[0]);
        }

        if (profile.last_name && !prefillData?.lastName) {
          setValue('lastName', profile.last_name);
        } else if (profile.display_name && !prefillData?.lastName) {
          const parts = profile.display_name.split(' ');
          if (parts.length >= 2) setValue('lastName', parts.slice(1).join(' '));
        }

        // Phone number
        if (profile.phone && !prefillData?.phone) {
          setValue('phone', profile.phone);
        }

        // Location data
        if (profile.zipcode && !prefillData?.locationZip) {
          setValue('locationZip', profile.zipcode);
        }
        
        if (profile.city && profile.state && !prefillData?.locationCityState) {
          setValue('locationCityState', `${profile.city}, ${profile.state}`);
        }
      }
    };

    fetchUserProfile();
  }, [setValue, prefillData]);

  const onSubmit = async (data: RequestFormData) => {
    // Check honeypot
    if (data.website) {
      console.warn("Honeypot triggered");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('leads').insert({
        facility_id: facilityId,
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone,
        email: data.email,
        preferred_contact: data.preferredContact,
        message: data.message || null,
        who_seeking_help: data.whoSeekingHelp,
        urgency: data.urgency,
        location_zip: data.locationZip,
        location_city_state: data.locationCityState || null,
        level_of_care: data.levelOfCare || null,
        insurance_type: data.insuranceType || null,
        primary_substance: selectedSubstances.length > 0 ? selectedSubstances : null,
        source: 'seeker_direct',
        status: 'new',
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Request sent successfully!",
        description: `${facilityName} will contact you soon.`,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubstance = (substance: string) => {
    setSelectedSubstances(prev => 
      prev.includes(substance) 
        ? prev.filter(s => s !== substance)
        : [...prev, substance]
    );
  };

  if (isSuccess) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Request Sent!</h3>
          <p className="text-sm text-emerald-700 mb-4">
            Your request has been sent to {facilityName}. They will reach out to you soon via your preferred contact method.
          </p>
          <Button onClick={onCancel} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">Request Information</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <span className="truncate">{facilityName}</span>
              {facilityCity && facilityState && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {facilityCity}, {facilityState}
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Honeypot */}
          <input type="text" {...register("website")} className="hidden" tabIndex={-1} autoComplete="off" />

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
                className="mt-1.5"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Doe"
                className="mt-1.5"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
                className="mt-1.5"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="locationZip" className="text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              Your ZIP Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="locationZip"
              {...register("locationZip")}
              placeholder="12345"
              className="mt-1.5 max-w-[150px]"
            />
            {errors.locationZip && (
              <p className="text-xs text-destructive mt-1">{errors.locationZip.message}</p>
            )}
          </div>

          {/* Quick Options Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium">Who needs help? <span className="text-destructive">*</span></Label>
              <Select
                defaultValue={prefillData?.whoSeekingHelp || "self"}
                onValueChange={(val) => setValue("whoSeekingHelp", val as any)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WHO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Urgency <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={prefillData?.urgency || "flexible"}
                onValueChange={(val) => setValue("urgency", val as any)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Preferred Contact <span className="text-destructive">*</span></Label>
              <Select
                defaultValue={prefillData?.preferredContact || "call"}
                onValueChange={(val) => setValue("preferredContact", val as any)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expandable Details Section */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
                <span>Add more details (optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              {/* Level of Care & Insurance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Level of Care Needed</Label>
                  <Select onValueChange={(val) => setValue("levelOfCare", val)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OF_CARE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Insurance Type</Label>
                  <Select onValueChange={(val) => setValue("insuranceType", val)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Substances */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Primary Substance(s)</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBSTANCE_OPTIONS.map((substance) => (
                    <Badge
                      key={substance}
                      variant={selectedSubstances.includes(substance) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleSubstance(substance)}
                    >
                      {substance}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  <FileText className="h-3.5 w-3.5 inline mr-1" />
                  Additional Message
                </Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  placeholder="Any specific questions or information you'd like to share..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground">
            By submitting, you agree to be contacted by {facilityName}. Your information is kept confidential.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}