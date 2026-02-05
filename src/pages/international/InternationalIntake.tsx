import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { CheckCircle, Globe, Loader2, AlertTriangle } from "lucide-react";

const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh",
  "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Czech Republic", "Denmark",
  "Egypt", "Finland", "France", "Germany", "Greece", "Hong Kong", "Hungary", "India",
  "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Kuwait",
  "Lebanon", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Oman", "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain",
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "UAE", "Ukraine",
  "United Kingdom", "Venezuela", "Vietnam", "Other"
];

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "Portuguese", "French", "German", "Italian", "Arabic",
  "Mandarin", "Cantonese", "Japanese", "Korean", "Russian", "Hindi", "Other"
];

const PRIMARY_CONCERN_OPTIONS = [
  "Alcohol addiction",
  "Opioid addiction (heroin, fentanyl, prescription)",
  "Cocaine / stimulant addiction",
  "Prescription drug addiction",
  "Cannabis dependency",
  "Polysubstance use",
  "Process addiction (gambling, sex, gaming)",
  "Mental health (depression, anxiety, trauma)",
  "Dual diagnosis (substance + mental health)",
  "Other"
];

const URGENCY_OPTIONS = [
  { value: "immediate", label: "Immediate (within days)" },
  { value: "1-2-weeks", label: "Within 1-2 weeks" },
  { value: "30-days", label: "Within 30 days" },
  { value: "flexible", label: "Flexible / Planning ahead" }
];

const BUDGET_OPTIONS = [
  { value: "under-10k", label: "Under $10,000/month" },
  { value: "10k-25k", label: "$10,000 - $25,000/month" },
  { value: "25k-50k", label: "$25,000 - $50,000/month" },
  { value: "50k-100k", label: "$50,000 - $100,000/month" },
  { value: "100k-plus", label: "$100,000+/month" },
  { value: "need-guidance", label: "Need guidance on budget" }
];

const REHAB_STYLE_OPTIONS = [
  { value: "standard", label: "Standard clinical program" },
  { value: "luxury", label: "Luxury / Resort-style" },
  { value: "executive", label: "Executive (work-friendly)" },
  { value: "discreet-vip", label: "Discreet VIP / High-profile" }
];

const TRAVEL_OPTIONS = [
  { value: "yes", label: "Yes, ready to travel" },
  { value: "no", label: "No, prefer virtual options" },
  { value: "need-guidance", label: "Need guidance on travel" }
];

export default function InternationalIntake() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionId = searchParams.get("session_id");
  const paymentSuccess = searchParams.get("payment") === "success";
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "",
    phoneNumber: "",
    country: "",
    preferredLanguage: "English",
    seekingFor: "self",
    primaryConcern: "",
    primaryConcernOther: "",
    urgency: "",
    budgetRange: "",
    rehabStyle: "",
    willingToTravel: "",
    notes: ""
  });

  useEffect(() => {
    const verifyPaymentAndGetUser = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // Get current user email if logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          setFormData(prev => ({ ...prev, email: user.email || "" }));
        }
        
        setPaymentVerified(paymentSuccess);
      } catch (err) {
        console.error("Payment verification error:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPaymentAndGetUser();
  }, [sessionId, paymentSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast({
        title: "Payment Required",
        description: "Please complete payment first.",
        variant: "destructive",
      });
      navigate("/international");
      return;
    }

    setIsLoading(true);
    try {
      // Normalize keys to snake_case for backend consistency
      const intakeData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.countryCode && formData.phoneNumber 
          ? `${formData.countryCode} ${formData.phoneNumber}`
          : "",
        country: formData.country,
        preferred_language: formData.preferredLanguage,
        seeking_for: formData.seekingFor,
        primary_concern: formData.primaryConcern === "Other" 
          ? formData.primaryConcernOther 
          : formData.primaryConcern,
        urgency: formData.urgency,
        budget_range: formData.budgetRange,
        rehab_style: formData.rehabStyle,
        willing_to_travel: formData.willingToTravel,
        notes: formData.notes
      };

      const { data, error } = await supabase.functions.invoke("submit-international-intake", {
        body: {
          sessionId,
          intakeData,
        },
      });

      if (error) throw error;

      toast({
        title: "Intake Submitted",
        description: "Your information has been received. An advisor will contact you within 24 hours.",
      });

      navigate("/international/thank-you");
    } catch (err) {
      console.error("Submit error:", err);
      toast({
        title: "Submission Error",
        description: "Unable to submit intake. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !paymentVerified) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Required</h2>
              <p className="text-muted-foreground mb-4">
                Please complete payment to access the intake form.
              </p>
              <Button onClick={() => navigate("/international")}>
                Start Application
              </Button>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="International Placement Intake | RehabLookup"
        description="Complete your intake form for international treatment placement."
        canonical="/international/intake"
        noindex
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        
        <main className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            {/* Success Banner */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Payment Confirmed</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Complete your intake to be placed in US treatment facilities.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    International Placement
                  </Badge>
                </div>
                <CardTitle>Placement Intake Form</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This information helps us connect you with appropriate US facilities. All responses are confidential.
                </p>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Contact Information</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label>Phone (International) *</Label>
                      <InternationalPhoneInput
                        countryCode={formData.countryCode}
                        phoneNumber={formData.phoneNumber}
                        onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                        onPhoneNumberChange={(num) => setFormData({ ...formData, phoneNumber: num })}
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="country">Country *</Label>
                        <select
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          required
                        >
                          <option value="">Select country...</option>
                          {COUNTRY_OPTIONS.map((country) => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="preferredLanguage">Preferred Language</Label>
                        <select
                          id="preferredLanguage"
                          value={formData.preferredLanguage}
                          onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Treatment Details</h3>
                    
                    <div>
                      <Label htmlFor="seekingFor">Who needs help? *</Label>
                      <select
                        id="seekingFor"
                        value={formData.seekingFor}
                        onChange={(e) => setFormData({ ...formData, seekingFor: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="self">Myself</option>
                        <option value="loved-one">A loved one (family/friend)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="primaryConcern">Primary Substance / Issue *</Label>
                      <select
                        id="primaryConcern"
                        value={formData.primaryConcern}
                        onChange={(e) => setFormData({ ...formData, primaryConcern: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select primary concern...</option>
                        {PRIMARY_CONCERN_OPTIONS.map((concern) => (
                          <option key={concern} value={concern}>{concern}</option>
                        ))}
                      </select>
                      {formData.primaryConcern === "Other" && (
                        <Input
                          className="mt-2"
                          placeholder="Please specify..."
                          value={formData.primaryConcernOther}
                          onChange={(e) => setFormData({ ...formData, primaryConcernOther: e.target.value })}
                          required
                        />
                      )}
                    </div>

                    <div>
                      <Label htmlFor="urgency">Urgency *</Label>
                      <select
                        id="urgency"
                        value={formData.urgency}
                        onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select timeline...</option>
                        {URGENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Preferences</h3>
                    
                    <div>
                      <Label htmlFor="budgetRange">Budget Range (USD per month) *</Label>
                      <select
                        id="budgetRange"
                        value={formData.budgetRange}
                        onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select budget range...</option>
                        {BUDGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="rehabStyle">Preferred Rehab Style *</Label>
                      <select
                        id="rehabStyle"
                        value={formData.rehabStyle}
                        onChange={(e) => setFormData({ ...formData, rehabStyle: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select style...</option>
                        {REHAB_STYLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="willingToTravel">Willing to travel to U.S.? *</Label>
                      <select
                        id="willingToTravel"
                        value={formData.willingToTravel}
                        onChange={(e) => setFormData({ ...formData, willingToTravel: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select...</option>
                        {TRAVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional information that would help us find the right facility..."
                      rows={4}
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-muted/30 border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">
                      By submitting this form, you consent to our team contacting you regarding treatment options. 
                      Your information is kept strictly confidential and will only be shared with facilities you approve.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Intake"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <PublicFooter />
      </div>
    </>
  );
}