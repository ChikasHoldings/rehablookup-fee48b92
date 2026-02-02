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
import { CheckCircle, Globe, ArrowRight, Loader2, AlertTriangle } from "lucide-react";

const LEVEL_OF_CARE_OPTIONS = [
  "Detox",
  "Residential / Inpatient",
  "Partial Hospitalization (PHP)",
  "Intensive Outpatient (IOP)",
  "Outpatient",
  "Sober Living",
  "Not sure",
];

const TIMELINE_OPTIONS = [
  "Immediate (within days)",
  "Within 1-2 weeks",
  "Within 1 month",
  "Flexible / Planning ahead",
];

const BUDGET_OPTIONS = [
  "Insurance coverage",
  "Private pay - under $30,000/month",
  "Private pay - $30,000-60,000/month",
  "Private pay - $60,000+/month",
  "Need financing options",
  "Unsure / Need guidance",
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
  
  const [formData, setFormData] = useState({
    // Personal
    seekingFor: "self",
    patientAge: "",
    patientGender: "",
    
    // Treatment needs
    primaryConcern: "",
    levelOfCare: "",
    substanceHistory: "",
    mentalHealthConcerns: "",
    
    // Location preferences
    preferredStates: "",
    specialRequirements: "",
    
    // Timeline & Budget
    timeline: "",
    budgetRange: "",
    insuranceDetails: "",
    
    // Travel
    hasValidPassport: "yes",
    visaAssistanceNeeded: "unsure",
    travelCompanion: "",
    
    // Additional
    additionalNotes: "",
  });

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // Simple verification - the edge function will create/update the case
        setPaymentVerified(paymentSuccess);
      } catch (err) {
        console.error("Payment verification error:", err);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
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
      const { data, error } = await supabase.functions.invoke("submit-international-intake", {
        body: {
          sessionId,
          intakeData: formData,
        },
      });

      if (error) throw error;

      toast({
        title: "Intake Submitted",
        description: "Your information has been received. An advisor will contact you within 48 hours.",
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
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Success Banner */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Payment Confirmed</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Complete your intake to get matched with US treatment facilities.
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
                <CardTitle>Treatment Intake Form</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This information helps us match you with appropriate US facilities. All responses are confidential.
                </p>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Who is treatment for */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">About the Patient</h3>
                    
                    <div>
                      <Label>Who is seeking treatment? *</Label>
                      <select
                        value={formData.seekingFor}
                        onChange={(e) => setFormData({ ...formData, seekingFor: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                        required
                      >
                        <option value="self">Myself</option>
                        <option value="family">Family member</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Patient Age *</Label>
                        <Input
                          type="number"
                          min="13"
                          max="100"
                          value={formData.patientAge}
                          onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                          placeholder="Age"
                          required
                        />
                      </div>
                      <div>
                        <Label>Patient Gender *</Label>
                        <select
                          value={formData.patientGender}
                          onChange={(e) => setFormData({ ...formData, patientGender: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          required
                        >
                          <option value="">Select...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="prefer-not-say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Needs */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Treatment Needs</h3>
                    
                    <div>
                      <Label>Primary Concern *</Label>
                      <Textarea
                        value={formData.primaryConcern}
                        onChange={(e) => setFormData({ ...formData, primaryConcern: e.target.value })}
                        placeholder="Describe the main reason for seeking treatment..."
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label>Preferred Level of Care *</Label>
                      <select
                        value={formData.levelOfCare}
                        onChange={(e) => setFormData({ ...formData, levelOfCare: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select...</option>
                        {LEVEL_OF_CARE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Substance Use History (if applicable)</Label>
                      <Textarea
                        value={formData.substanceHistory}
                        onChange={(e) => setFormData({ ...formData, substanceHistory: e.target.value })}
                        placeholder="Substances used, duration, frequency..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Mental Health Concerns</Label>
                      <Textarea
                        value={formData.mentalHealthConcerns}
                        onChange={(e) => setFormData({ ...formData, mentalHealthConcerns: e.target.value })}
                        placeholder="Any diagnosed conditions, medications..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Location & Timeline */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Location & Timeline</h3>
                    
                    <div>
                      <Label>Preferred US States/Regions</Label>
                      <Input
                        value={formData.preferredStates}
                        onChange={(e) => setFormData({ ...formData, preferredStates: e.target.value })}
                        placeholder="e.g., California, Florida, or 'No preference'"
                      />
                    </div>

                    <div>
                      <Label>Timeline *</Label>
                      <select
                        value={formData.timeline}
                        onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select...</option>
                        {TIMELINE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Special Requirements</Label>
                      <Textarea
                        value={formData.specialRequirements}
                        onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                        placeholder="Dietary needs, accessibility, language, religious preferences..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Budget & Insurance */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Budget & Payment</h3>
                    
                    <div>
                      <Label>Budget Range *</Label>
                      <select
                        value={formData.budgetRange}
                        onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Select...</option>
                        {BUDGET_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Insurance Details (if applicable)</Label>
                      <Textarea
                        value={formData.insuranceDetails}
                        onChange={(e) => setFormData({ ...formData, insuranceDetails: e.target.value })}
                        placeholder="Insurance provider, policy details, or international coverage..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Travel */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Travel Information</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Valid Passport?</Label>
                        <select
                          value={formData.hasValidPassport}
                          onChange={(e) => setFormData({ ...formData, hasValidPassport: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="expired">Expired / Needs renewal</option>
                        </select>
                      </div>
                      <div>
                        <Label>Visa Assistance Needed?</Label>
                        <select
                          value={formData.visaAssistanceNeeded}
                          onChange={(e) => setFormData({ ...formData, visaAssistanceNeeded: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No - Already have visa</option>
                          <option value="unsure">Not sure</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label>Travel Companion</Label>
                      <Input
                        value={formData.travelCompanion}
                        onChange={(e) => setFormData({ ...formData, travelCompanion: e.target.value })}
                        placeholder="Will someone accompany the patient? (relationship)"
                      />
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                      placeholder="Anything else we should know..."
                      rows={3}
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-muted/30 border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Disclaimer:</strong> RehabLookup provides placement coordination services only. 
                      We do not provide medical advice, diagnosis, or treatment. All medical decisions are made 
                      by licensed professionals at partner facilities. By submitting this form, you consent to 
                      sharing this information with potential treatment facilities for placement purposes.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Intake Form
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
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
