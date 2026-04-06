import { useState, useMemo } from "react";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { costEstimatorFaqs } from "@/data/pageFaqs";
import { Calculator, DollarSign, Shield, Clock, AlertCircle, CheckCircle2, Info, MapPin, Building2, ArrowRight, RotateCcw, TrendingDown, Heart, Stethoscope } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TreatmentOption {
  id: string;
  name: string;
  description: string;
  avgDuration: string;
  baseCostMin: number;
  baseCostMax: number;
  icon: typeof Stethoscope;
}

interface InsuranceOption {
  id: string;
  name: string;
  coveragePercent: number;
  typicalDeductible: number;
  outOfPocketMax: number;
}

// Updated 2026 cost data from industry sources
const treatmentOptions: TreatmentOption[] = [
  {
    id: "detox",
    name: "Medical Detox",
    description: "24/7 medical supervision during withdrawal, typically the first step in treatment",
    avgDuration: "3–7 days",
    baseCostMin: 1750,
    baseCostMax: 5000,
    icon: Heart,
  },
  {
    id: "inpatient",
    name: "Inpatient / Residential",
    description: "Full-time residential treatment with structured therapy, housing, and meals",
    avgDuration: "28–90 days",
    baseCostMin: 25000,
    baseCostMax: 80000,
    icon: Building2,
  },
  {
    id: "php",
    name: "Partial Hospitalization (PHP)",
    description: "Intensive structured day program, 5–7 days/week, 6+ hours/day",
    avgDuration: "2–6 weeks",
    baseCostMin: 10000,
    baseCostMax: 25000,
    icon: Stethoscope,
  },
  {
    id: "iop",
    name: "Intensive Outpatient (IOP)",
    description: "Structured therapy 3–5 days/week, 3–4 hours/day while living at home",
    avgDuration: "8–12 weeks",
    baseCostMin: 5000,
    baseCostMax: 16000,
    icon: Clock,
  },
  {
    id: "outpatient",
    name: "Standard Outpatient",
    description: "Weekly individual and/or group therapy sessions",
    avgDuration: "3–6 months",
    baseCostMin: 2500,
    baseCostMax: 10000,
    icon: MapPin,
  },
  {
    id: "mat",
    name: "Medication-Assisted Treatment (MAT)",
    description: "FDA-approved medications (e.g. Suboxone, Vivitrol) combined with counseling",
    avgDuration: "Ongoing (12+ months)",
    baseCostMin: 5000,
    baseCostMax: 14500,
    icon: Shield,
  },
];

const insuranceOptions: InsuranceOption[] = [
  { id: "none", name: "No Insurance / Self-Pay", coveragePercent: 0, typicalDeductible: 0, outOfPocketMax: 999999 },
  { id: "bcbs", name: "Blue Cross Blue Shield", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6550 },
  { id: "united", name: "UnitedHealthcare", coveragePercent: 65, typicalDeductible: 2000, outOfPocketMax: 7500 },
  { id: "aetna", name: "Aetna / CVS Health", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6550 },
  { id: "cigna", name: "Cigna Healthcare", coveragePercent: 65, typicalDeductible: 1800, outOfPocketMax: 6550 },
  { id: "humana", name: "Humana", coveragePercent: 60, typicalDeductible: 2000, outOfPocketMax: 7500 },
  { id: "anthem", name: "Anthem BCBS", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6550 },
  { id: "kaiser", name: "Kaiser Permanente", coveragePercent: 80, typicalDeductible: 1000, outOfPocketMax: 5000 },
  { id: "molina", name: "Molina Healthcare", coveragePercent: 85, typicalDeductible: 500, outOfPocketMax: 3500 },
  { id: "ambetter", name: "Ambetter", coveragePercent: 65, typicalDeductible: 2000, outOfPocketMax: 7500 },
  { id: "oscar", name: "Oscar Health", coveragePercent: 65, typicalDeductible: 2000, outOfPocketMax: 7500 },
  { id: "highmark", name: "Highmark BCBS", coveragePercent: 70, typicalDeductible: 1500, outOfPocketMax: 6550 },
  { id: "medicare", name: "Medicare", coveragePercent: 80, typicalDeductible: 500, outOfPocketMax: 4000 },
  { id: "medicaid", name: "Medicaid", coveragePercent: 95, typicalDeductible: 0, outOfPocketMax: 500 },
  { id: "tricare", name: "TRICARE", coveragePercent: 85, typicalDeductible: 300, outOfPocketMax: 3000 },
  { id: "other", name: "Other Insurance", coveragePercent: 60, typicalDeductible: 2000, outOfPocketMax: 7500 },
];

const steps = [
  { id: 1, label: "Treatment" },
  { id: 2, label: "Insurance" },
  { id: 3, label: "Results" },
];

const CostEstimator = () => {
  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedInsurance, setSelectedInsurance] = useState<string>("");
  const [hasDeductibleMet, setHasDeductibleMet] = useState<string>("no");
  const [currentStep, setCurrentStep] = useState(1);

  const treatment = treatmentOptions.find((t) => t.id === selectedTreatment);
  const insurance = insuranceOptions.find((i) => i.id === selectedInsurance);

  const estimate = useMemo(() => {
    if (!treatment || !insurance) return null;

    const avgBaseCost = (treatment.baseCostMin + treatment.baseCostMax) / 2;

    if (insurance.id === "none") {
      return {
        lowEstimate: treatment.baseCostMin,
        highEstimate: treatment.baseCostMax,
        insurancePays: 0,
        yourCost: avgBaseCost,
        savingsPercent: 0,
        notes: [
          "Self-pay rates may be negotiable — ask facilities about discounts",
          "Many facilities offer payment plans or sliding scale fees",
          "Some states offer free treatment through SAMHSA-funded programs",
        ],
      };
    }

    const deductibleRemaining = hasDeductibleMet === "yes" ? 0 : hasDeductibleMet === "partial" ? insurance.typicalDeductible * 0.5 : insurance.typicalDeductible;
    const afterDeductible = Math.max(0, avgBaseCost - deductibleRemaining);
    const yourShare = afterDeductible * (1 - insurance.coveragePercent / 100);
    const totalYourCost = Math.min(deductibleRemaining + yourShare, insurance.outOfPocketMax);
    const insurancePays = avgBaseCost - totalYourCost;
    const savingsPercent = Math.round((insurancePays / avgBaseCost) * 100);

    return {
      lowEstimate: Math.round(totalYourCost * 0.75),
      highEstimate: Math.round(totalYourCost * 1.25),
      insurancePays: Math.round(insurancePays),
      yourCost: Math.round(totalYourCost),
      savingsPercent,
      notes: [
        hasDeductibleMet === "no"
          ? `Includes estimated $${insurance.typicalDeductible.toLocaleString()} annual deductible`
          : hasDeductibleMet === "partial"
          ? `Includes ~$${Math.round(insurance.typicalDeductible * 0.5).toLocaleString()} remaining deductible`
          : "Deductible already met — lower out-of-pocket costs",
        `Your plan's out-of-pocket max is typically $${insurance.outOfPocketMax.toLocaleString()}/year`,
        "Actual costs depend on your specific plan, network status, and facility",
      ],
    };
  }, [treatment, insurance, hasDeductibleMet]);

  const handleNext = () => {
    if (currentStep === 1 && selectedTreatment) setCurrentStep(2);
    else if (currentStep === 2 && selectedInsurance) setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleReset = () => {
    setSelectedTreatment("");
    setSelectedInsurance("");
    setHasDeductibleMet("no");
    setCurrentStep(1);
  };

  const costBarPercent = useMemo(() => {
    if (!estimate || !treatment) return 0;
    const avgBase = (treatment.baseCostMin + treatment.baseCostMax) / 2;
    if (insurance?.id === "none") return 100;
    return Math.round((estimate.yourCost / avgBase) * 100);
  }, [estimate, treatment, insurance]);

  return (
    <Layout>
      <SEO
        title="Treatment Cost Estimator | Estimate Rehab Costs with Insurance"
        description="Use our free treatment cost estimator to understand potential addiction treatment costs based on your treatment type and insurance coverage. Updated for 2026."
        canonical="/cost-estimator"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Treatment Cost Estimator",
          description: "Free tool to estimate addiction treatment costs based on treatment type and insurance coverage.",
          url: "https://rehablookup.com/cost-estimator",
          applicationCategory: "HealthApplication",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Cost Estimator", url: "/cost-estimator" },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav className="mb-4" variant="light" items={[{ label: "Cost Estimator" }]} />
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Calculator className="h-4 w-4" />
              Free Tool · Updated for 2026
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Treatment Cost Estimator
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Get a personalized estimate of what addiction treatment might cost based on your care level and insurance. Costs reflect current 2026 national averages.
            </p>
          </div>
        </div>
      </section>

      {/* Stepper + Tool */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-10">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (step.id === 1) setCurrentStep(1);
                      else if (step.id === 2 && selectedTreatment) setCurrentStep(2);
                      else if (step.id === 3 && selectedTreatment && selectedInsurance) setCurrentStep(3);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : currentStep > step.id
                        ? "bg-primary/15 text-primary cursor-pointer"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      currentStep === step.id
                        ? "bg-primary-foreground text-primary"
                        : currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {currentStep > step.id ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className={cn(
                      "w-8 md:w-16 h-0.5 rounded",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* Step 1: Treatment Selection */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-xl font-semibold text-foreground mb-2">What type of treatment are you considering?</h2>
                  <p className="text-sm text-muted-foreground mb-6">Select the level of care that best fits your needs. Costs shown are 2026 national averages before insurance.</p>

                  <div className="grid gap-3">
                    {treatmentOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = selectedTreatment === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setSelectedTreatment(option.id)}
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30 hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 mt-0.5",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="font-semibold text-foreground">{option.name}</span>
                              <span className="text-xs font-medium text-primary whitespace-nowrap">
                                ${option.baseCostMin.toLocaleString()} – ${option.baseCostMax.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" /> {option.avgDuration}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button onClick={handleNext} disabled={!selectedTreatment} size="lg">
                      Continue to Insurance
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Insurance Selection */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-xl font-semibold text-foreground mb-2">What insurance do you have?</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your insurance can significantly reduce your out-of-pocket cost. Select your provider below.
                  </p>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="insurance" className="text-sm font-medium flex items-center gap-2">
                        Insurance Provider
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Coverage estimates are based on typical in-network behavioral health benefits. Your actual plan may differ.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Select value={selectedInsurance} onValueChange={setSelectedInsurance}>
                        <SelectTrigger id="insurance" className="h-12">
                          <SelectValue placeholder="Select your insurance provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {insuranceOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              <span className="flex items-center gap-2">
                                {option.name}
                                {option.id !== "none" && option.id !== "other" && (
                                  <span className="text-xs text-muted-foreground">~{option.coveragePercent}% coverage</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Deductible Question */}
                    {selectedInsurance && selectedInsurance !== "none" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <Label className="text-sm font-medium flex items-center gap-2">
                          Have you met your annual deductible?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Your deductible is the amount you pay out-of-pocket before insurance begins covering costs. The 2026 average individual deductible is ~$1,650.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <RadioGroup value={hasDeductibleMet} onValueChange={setHasDeductibleMet} className="flex flex-wrap gap-3">
                          {[
                            { value: "yes", label: "Yes, fully met" },
                            { value: "partial", label: "Partially met" },
                            { value: "no", label: "Not yet" },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium",
                                hasDeductibleMet === opt.value
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border hover:border-primary/30"
                              )}
                            >
                              <RadioGroupItem value={opt.value} className="sr-only" />
                              {opt.label}
                            </label>
                          ))}
                        </RadioGroup>
                      </motion.div>
                    )}

                    {/* Insurance summary card */}
                    {insurance && insurance.id !== "none" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-3 gap-3"
                      >
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                          <p className="text-lg font-bold text-primary">{insurance.coveragePercent}%</p>
                          <p className="text-xs text-muted-foreground">Typical Coverage</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                          <p className="text-lg font-bold text-foreground">${insurance.typicalDeductible.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Avg. Deductible</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                          <p className="text-lg font-bold text-foreground">${insurance.outOfPocketMax.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">OOP Max</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button onClick={handleNext} disabled={!selectedInsurance} size="lg">
                      See My Estimate
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Results */}
              {currentStep === 3 && estimate && treatment && insurance && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Main result card */}
                  <Card className="border-2 border-primary/30 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
                      <p className="text-sm font-medium opacity-90 mb-1">Your Estimated Out-of-Pocket Cost</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl md:text-5xl font-bold">
                          ${estimate.lowEstimate.toLocaleString()}
                        </span>
                        <span className="text-2xl md:text-3xl font-semibold opacity-80">
                          – ${estimate.highEstimate.toLocaleString()}
                        </span>
                      </div>
                      {insurance.id !== "none" && (
                        <div className="flex items-center gap-2 mt-3">
                          <TrendingDown className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Insurance saves you ~${estimate.insurancePays.toLocaleString()} ({estimate.savingsPercent}% of total cost)
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-6 md:p-8 space-y-6">
                      {/* Visual cost breakdown */}
                      <div>
                        <p className="text-sm font-medium text-foreground mb-3">Cost Breakdown</p>
                        <div className="h-4 rounded-full overflow-hidden bg-muted flex">
                          {insurance.id !== "none" && (
                            <div
                              className="h-full bg-primary/20 transition-all duration-500"
                              style={{ width: `${100 - costBarPercent}%` }}
                            />
                          )}
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${costBarPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          {insurance.id !== "none" ? (
                            <>
                              <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary/20 inline-block" />
                                Insurance pays: ${estimate.insurancePays.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                                You pay: ~${estimate.yourCost.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span>Full cost without insurance</span>
                          )}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Stethoscope className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Treatment</p>
                            <p className="text-sm font-medium text-foreground">{treatment.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium text-foreground">{treatment.avgDuration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Insurance</p>
                            <p className="text-sm font-medium text-foreground">{insurance.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Base Cost Range</p>
                            <p className="text-sm font-medium text-foreground">
                              ${treatment.baseCostMin.toLocaleString()} – ${treatment.baseCostMax.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30 p-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                          <AlertCircle className="h-4 w-4" />
                          Important Notes
                        </p>
                        <ul className="text-sm text-amber-700 dark:text-amber-300/80 space-y-1.5">
                          {estimate.notes.map((note, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTAs */}
                      <div className="grid sm:grid-cols-2 gap-3 pt-2">
                        <Button asChild size="lg" className="w-full">
                          <Link to="/concierge">
                            <Heart className="h-4 w-4 mr-2" />
                            Get Matched to Treatment
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="w-full">
                          <Link to="/insurance">
                            <Shield className="h-4 w-4 mr-2" />
                            Insurance Coverage Guide
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center mt-6">
                    <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over with New Options
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Cost Factors */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
              Factors That Affect Treatment Cost
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Understanding what drives the cost of treatment can help you make informed decisions and find affordable options.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Clock, title: "Length of Stay", desc: "30-day programs start around $25K; 90-day programs can exceed $60K. Longer stays often produce better long-term outcomes." },
                { icon: Shield, title: "Insurance & Network", desc: "In-network facilities can reduce costs by 40–80%. The ACA requires behavioral health coverage as an essential benefit." },
                { icon: MapPin, title: "Location & Setting", desc: "Costs vary significantly by state. Urban centers and coastal areas tend to be more expensive than rural or midwest facilities." },
                { icon: Building2, title: "Facility Type", desc: "Standard programs cost $6K–$30K/month. Luxury rehabs with private rooms and amenities can exceed $50K/month." },
              ].map((factor, idx) => (
                <Card key={idx} className="border-border">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <factor.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{factor.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{factor.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Disclaimer:</strong> This tool provides general estimates based on 2026 national averages and should not be considered financial or medical advice.
              Actual costs depend on your specific insurance plan, facility choice, location, treatment needs, and other factors.
              Contact treatment facilities directly or call the SAMHSA helpline at <strong>1-800-662-4357</strong> for free guidance.
            </p>
          </div>
        </div>
      </section>

      <PageFAQ faqs={costEstimatorFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default CostEstimator;
