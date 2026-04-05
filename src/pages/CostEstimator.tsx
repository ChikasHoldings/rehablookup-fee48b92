import { useState } from "react";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { costEstimatorFaqs } from "@/data/pageFaqs";
import { Calculator, DollarSign, Shield, Clock, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

interface TreatmentOption {
  id: string;
  name: string;
  description: string;
  avgDuration: string;
  baseCostMin: number;
  baseCostMax: number;
}

interface InsuranceOption {
  id: string;
  name: string;
  coveragePercent: number;
  typicalDeductible: number;
  outOfPocketMax: number;
}

const treatmentOptions: TreatmentOption[] = [
  {
    id: "detox",
    name: "Medical Detox",
    description: "24/7 medical supervision during withdrawal",
    avgDuration: "3-7 days",
    baseCostMin: 1500,
    baseCostMax: 3500,
  },
  {
    id: "inpatient",
    name: "Inpatient Rehabilitation",
    description: "Residential treatment with full-time care",
    avgDuration: "28-90 days",
    baseCostMin: 20000,
    baseCostMax: 80000,
  },
  {
    id: "php",
    name: "Partial Hospitalization (PHP)",
    description: "Intensive day program, 5-7 days/week",
    avgDuration: "2-4 weeks",
    baseCostMin: 8000,
    baseCostMax: 20000,
  },
  {
    id: "iop",
    name: "Intensive Outpatient (IOP)",
    description: "3-5 days/week, 3-4 hours/day",
    avgDuration: "8-12 weeks",
    baseCostMin: 5000,
    baseCostMax: 15000,
  },
  {
    id: "outpatient",
    name: "Standard Outpatient",
    description: "Weekly therapy sessions",
    avgDuration: "3-6 months",
    baseCostMin: 2000,
    baseCostMax: 8000,
  },
  {
    id: "mat",
    name: "Medication-Assisted Treatment",
    description: "Medications combined with counseling",
    avgDuration: "Ongoing",
    baseCostMin: 4000,
    baseCostMax: 12000,
  },
];

const insuranceOptions: InsuranceOption[] = [
  { id: "none", name: "No Insurance / Self-Pay", coveragePercent: 0, typicalDeductible: 0, outOfPocketMax: 999999 },
  { id: "bcbs", name: "Blue Cross Blue Shield", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6000 },
  { id: "united", name: "UnitedHealthcare", coveragePercent: 65, typicalDeductible: 2000, outOfPocketMax: 7000 },
  { id: "aetna", name: "Aetna", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6500 },
  { id: "cigna", name: "Cigna", coveragePercent: 65, typicalDeductible: 1800, outOfPocketMax: 6000 },
  { id: "humana", name: "Humana", coveragePercent: 60, typicalDeductible: 2000, outOfPocketMax: 7500 },
  { id: "anthem", name: "Anthem", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6000 },
  { id: "kaiser", name: "Kaiser Permanente", coveragePercent: 80, typicalDeductible: 1000, outOfPocketMax: 5000 },
  { id: "medicare", name: "Medicare", coveragePercent: 80, typicalDeductible: 500, outOfPocketMax: 4000 },
  { id: "medicaid", name: "Medicaid", coveragePercent: 95, typicalDeductible: 0, outOfPocketMax: 500 },
  { id: "tricare", name: "TRICARE", coveragePercent: 85, typicalDeductible: 300, outOfPocketMax: 3000 },
  { id: "other", name: "Other Insurance", coveragePercent: 60, typicalDeductible: 2000, outOfPocketMax: 7000 },
];

const CostEstimator = () => {
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedInsurance, setSelectedInsurance] = useState<string>("");
  const [hasDeductibleMet, setHasDeductibleMet] = useState<string>("no");
  const [showResults, setShowResults] = useState(false);

  const treatment = treatmentOptions.find((t) => t.id === selectedTreatment);
  const insurance = insuranceOptions.find((i) => i.id === selectedInsurance);

  const calculateEstimate = () => {
    if (!treatment || !insurance) return null;

    const avgBaseCost = (treatment.baseCostMin + treatment.baseCostMax) / 2;
    
    if (insurance.id === "none") {
      return {
        lowEstimate: treatment.baseCostMin,
        highEstimate: treatment.baseCostMax,
        insurancePays: 0,
        yourCost: avgBaseCost,
        notes: ["Self-pay rates may be negotiable", "Many facilities offer payment plans", "Sliding scale fees may be available based on income"],
      };
    }

    const deductibleRemaining = hasDeductibleMet === "yes" ? 0 : insurance.typicalDeductible;
    const afterDeductible = Math.max(0, avgBaseCost - deductibleRemaining);
    const yourShare = afterDeductible * (1 - insurance.coveragePercent / 100);
    const totalYourCost = Math.min(deductibleRemaining + yourShare, insurance.outOfPocketMax);
    const insurancePays = avgBaseCost - totalYourCost;

    return {
      lowEstimate: Math.round(totalYourCost * 0.7),
      highEstimate: Math.round(totalYourCost * 1.3),
      insurancePays: Math.round(insurancePays),
      yourCost: Math.round(totalYourCost),
      notes: [
        hasDeductibleMet === "no" ? `Includes estimated $${insurance.typicalDeductible.toLocaleString()} deductible` : "Assumes deductible already met",
        `Your out-of-pocket maximum is typically $${insurance.outOfPocketMax.toLocaleString()}`,
        "Actual costs vary based on your specific plan",
      ],
    };
  };

  const estimate = calculateEstimate();

  const handleCalculate = () => {
    if (selectedTreatment && selectedInsurance) {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setSelectedTreatment("");
    setSelectedInsurance("");
    setHasDeductibleMet("no");
    setShowResults(false);
  };

  return (
    <Layout>
      <SEO
        title="Treatment Cost Estimator | Estimate Rehab Costs with Insurance"
        description="Use our free treatment cost estimator to understand potential addiction treatment costs based on your treatment type and insurance coverage."
        canonical="/cost-estimator"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            className="mb-4"
            variant="light"
            items={[{ label: "Cost Estimator" }]}
          />
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calculator className="h-4 w-4" />
              Free Cost Estimation Tool
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Treatment Cost Estimator
            </h1>
            <p className="text-lg text-muted-foreground">
              Get an estimate of what addiction treatment might cost based on the type of care you need and your insurance coverage. 
              These are general estimates to help you plan—actual costs may vary.
            </p>
          </div>
        </div>
      </section>

      {/* Estimator Tool */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Input Section */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Enter Your Information
                  </CardTitle>
                  <CardDescription>
                    Select your treatment type and insurance to get an estimate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Treatment Type */}
                  <div className="space-y-2">
                    <Label htmlFor="treatment" className="flex items-center gap-2">
                      Treatment Type
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The level of care recommended depends on the severity of addiction and individual needs.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                      <SelectTrigger id="treatment">
                        <SelectValue placeholder="Select treatment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.name}</span>
                              <span className="text-xs text-muted-foreground">{option.avgDuration}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {treatment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {treatment.description}
                      </p>
                    )}
                  </div>

                  {/* Insurance */}
                  <div className="space-y-2">
                    <Label htmlFor="insurance" className="flex items-center gap-2">
                      Insurance Provider
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Select your insurance provider. Coverage varies by plan—this is an estimate.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={selectedInsurance} onValueChange={setSelectedInsurance}>
                      <SelectTrigger id="insurance">
                        <SelectValue placeholder="Select insurance" />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deductible Question */}
                  {selectedInsurance && selectedInsurance !== "none" && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        Have you met your deductible this year?
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The deductible is the amount you pay before insurance starts covering costs.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <RadioGroup value={hasDeductibleMet} onValueChange={setHasDeductibleMet} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="deductible-yes" />
                          <Label htmlFor="deductible-yes" className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="deductible-no" />
                          <Label htmlFor="deductible-no" className="font-normal cursor-pointer">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="partial" id="deductible-partial" />
                          <Label htmlFor="deductible-partial" className="font-normal cursor-pointer">Partially</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleCalculate} 
                      className="flex-1"
                      disabled={!selectedTreatment || !selectedInsurance}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate Estimate
                    </Button>
                    {showResults && (
                      <Button variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card className={`border-2 transition-all ${showResults && estimate ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Your Estimate
                  </CardTitle>
                  <CardDescription>
                    Based on your selections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showResults && estimate ? (
                    <div className="space-y-6">
                      {/* Main Estimate */}
                      <div className="text-center p-6 bg-background rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-2">Estimated Out-of-Pocket Cost</p>
                        <p className="text-4xl font-bold text-primary">
                          ${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()}
                        </p>
                        {insurance?.id !== "none" && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Insurance may cover ~${estimate.insurancePays.toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Breakdown */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Treatment Type</span>
                          <span className="font-medium">{treatment?.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Typical Duration</span>
                          <span className="font-medium">{treatment?.avgDuration}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">Base Cost Range</span>
                          <span className="font-medium">
                            ${treatment?.baseCostMin.toLocaleString()} - ${treatment?.baseCostMax.toLocaleString()}
                          </span>
                        </div>
                        {insurance?.id !== "none" && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Typical Coverage</span>
                            <span className="font-medium">{insurance?.coveragePercent}%</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Important Notes
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {estimate.notes.map((note, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA */}
                      <div className="pt-4 space-y-3">
                        <Button asChild className="w-full">
                          <Link to="/concierge">Find Treatment</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                          <Link to="/insurance">Learn About Insurance Coverage</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Calculator className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Select a treatment type and insurance to see your estimated costs
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Factors Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Factors That Affect Treatment Cost
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Clock className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Length of Stay</h3>
                  <p className="text-sm text-muted-foreground">
                    Longer programs cost more but often provide better outcomes for severe addictions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Shield className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Insurance Plan Type</h3>
                  <p className="text-sm text-muted-foreground">
                    In-network facilities typically cost less than out-of-network options.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Facility Amenities</h3>
                  <p className="text-sm text-muted-foreground">
                    Luxury amenities increase costs but clinical quality varies independently.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Disclaimer:</strong> This tool provides general estimates only and should not be considered financial or medical advice. 
              Actual costs depend on your specific insurance plan, facility choice, treatment needs, and other factors. 
              Contact treatment facilities directly or speak with your insurance provider for accurate cost information.
            </p>
          </div>
        </div>
      </section>

      <PageFAQ faqs={costEstimatorFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default CostEstimator;
