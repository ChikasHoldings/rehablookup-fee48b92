import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrailingSlashRedirect } from "@/components/TrailingSlashRedirect";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";
import { Layout } from "@/components/layout/Layout";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { queryClient } from "@/lib/queryClient";
 import { NavigationProvider } from "@/contexts/NavigationContext";

// Eagerly load homepage for instant LCP
import Index from "./pages/Index";
import { SmartCatchAll } from "./components/SmartCatchAll";

// Lazy load all other public pages for reduced initial bundle
const RehabCenters = lazy(() => import("./pages/RehabCenters"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const StatePage = lazy(() => import("./pages/StatePage"));
const CityPage = lazy(() => import("./pages/CityPage"));
const CountyPage = lazy(() => import("./pages/CountyPage"));
const CountyTreatmentPage = lazy(() => import("./pages/seo/CountyTreatmentPage"));
const Locations = lazy(() => import("./pages/Locations"));
const TreatmentCenterProfile = lazy(() => import("./pages/TreatmentCenterProfile"));
const CenterProfile = lazy(() => import("./pages/CenterProfile"));
const TreatmentTypes = lazy(() => import("./pages/TreatmentTypes"));
const DrugAddictionTreatment = lazy(() => import("./pages/treatment-types/DrugAddictionTreatment"));
const StateDrugAddiction = lazy(() => import("./pages/treatment-types/StateDrugAddiction"));
const CityDrugAddiction = lazy(() => import("./pages/treatment-types/CityDrugAddiction"));
const AlcoholRehabilitation = lazy(() => import("./pages/treatment-types/AlcoholRehabilitation"));
const StateAlcoholRehab = lazy(() => import("./pages/treatment-types/StateAlcoholRehab"));
const CityAlcoholRehab = lazy(() => import("./pages/treatment-types/CityAlcoholRehab"));
const DualDiagnosisTreatment = lazy(() => import("./pages/treatment-types/DualDiagnosisTreatment"));
const ResidentialInpatient = lazy(() => import("./pages/treatment-types/ResidentialInpatient"));
const OutpatientPrograms = lazy(() => import("./pages/treatment-types/OutpatientPrograms"));
const HolisticTherapy = lazy(() => import("./pages/treatment-types/HolisticTherapy"));
const DetoxPrograms = lazy(() => import("./pages/treatment-types/DetoxPrograms"));
const LuxuryRehab = lazy(() => import("./pages/treatment-types/LuxuryRehab"));
const StateDetoxPrograms = lazy(() => import("./pages/treatment-types/StateDetoxPrograms"));
const CityDetoxPrograms = lazy(() => import("./pages/treatment-types/CityDetoxPrograms"));
const StateInpatientRehab = lazy(() => import("./pages/treatment-types/StateInpatientRehab"));
const CityInpatientRehab = lazy(() => import("./pages/treatment-types/CityInpatientRehab"));
const StateOutpatientPrograms = lazy(() => import("./pages/treatment-types/StateOutpatientPrograms"));
const CityOutpatientPrograms = lazy(() => import("./pages/treatment-types/CityOutpatientPrograms"));
const StateDualDiagnosis = lazy(() => import("./pages/treatment-types/StateDualDiagnosis"));
const CityDualDiagnosis = lazy(() => import("./pages/treatment-types/CityDualDiagnosis"));
const StateTreatmentExpandedPage = lazy(() => import("./pages/treatment-types/StateTreatmentExpandedPage"));
const ExpandedTreatmentHubPage = lazy(() => import("./pages/seo/ExpandedTreatmentHubPage"));
const CityTreatmentExpandedPage = lazy(() => import("./pages/treatment-types/CityTreatmentExpandedPage"));
const ExpandedTreatmentNationalHub = lazy(() => import("./pages/treatment-types/ExpandedTreatmentNationalHub"));
const CityInsurancePage = lazy(() => import("./pages/seo/CityInsurancePage"));
const CountyInsurancePage = lazy(() => import("./pages/seo/CountyInsurancePage"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const ForProviders = lazy(() => import("./pages/ForProviders"));
const ProviderResources = lazy(() => import("./pages/ProviderResources"));
const ProviderForgotPassword = lazy(() => import("./pages/ProviderForgotPassword"));
const ProviderResetPassword = lazy(() => import("./pages/ProviderResetPassword"));
const ProviderSupport = lazy(() => import("./pages/ProviderSupport"));
const ProviderFAQ = lazy(() => import("./pages/ProviderFAQ"));
const ProviderSignup = lazy(() => import("./pages/ProviderSignup"));
const ProviderROICalculator = lazy(() => import("./pages/ProviderROICalculator"));

// SEO Landing Pages - City+Treatment, Comparisons, Treatment Hubs, Cost/Insurance
// CityTreatmentPage routes handled by SmartCatchAll
const ComparisonPage = lazy(() => import("./pages/seo/ComparisonPage"));
const TreatmentHubPage = lazy(() => import("./pages/seo/TreatmentHubPage"));
const CostInsurancePage = lazy(() => import("./pages/seo/CostInsurancePage"));
const SubstanceTreatmentPage = lazy(() => import("./pages/seo/SubstanceTreatmentPage"));
const SubstanceStatePage = lazy(() => import("./pages/seo/SubstanceStatePage"));
const InsuranceStatePage = lazy(() => import("./pages/seo/InsuranceStatePage"));
const DemographicTreatmentPage = lazy(() => import("./pages/seo/DemographicTreatmentPage"));
const DemographicStatePage = lazy(() => import("./pages/seo/DemographicStatePage"));
const SeekerGuidePage = lazy(() => import("./pages/seo/SeekerGuidePage"));
const TherapyModalityPage = lazy(() => import("./pages/seo/TherapyModalityPage"));
const CoOccurringPage = lazy(() => import("./pages/seo/CoOccurringPage"));
const DurationSettingPage = lazy(() => import("./pages/seo/DurationSettingPage"));
const PaymentStatePage = lazy(() => import("./pages/seo/PaymentStatePage"));
const StateArticlePage = lazy(() => import("./pages/seo/StateArticlePage"));
const SubstanceCityPage = lazy(() => import("./pages/seo/SubstanceCityPage"));
const DemographicCityPage = lazy(() => import("./pages/seo/DemographicCityPage"));
const CoOccurringCityPage = lazy(() => import("./pages/seo/CoOccurringCityPage"));
const DurationCityPage = lazy(() => import("./pages/seo/DurationCityPage"));
const EducationalPage = lazy(() => import("./pages/seo/EducationalPage"));
const SubstanceRehabNearMe = lazy(() => import("./pages/near-me/SubstanceRehabNearMe"));
const GenericNearMePage = lazy(() => import("./pages/near-me/GenericNearMePage"));
const NearMeCityPage = lazy(() => import("./pages/near-me/NearMeCityPage"));
const NearMeCountyPage = lazy(() => import("./pages/near-me/NearMeCountyPage"));

const CityProviderPage = lazy(() => import("./pages/provider-guides/CityProviderPage"));
const CityTreatmentProviderPage = lazy(() => import("./pages/provider-guides/CityTreatmentProviderPage"));
const CityInsuranceProviderPage = lazy(() => import("./pages/provider-guides/CityInsuranceProviderPage"));
const CountyProviderPage = lazy(() => import("./pages/provider-guides/CountyProviderPage"));
const CountyTreatmentProviderPage = lazy(() => import("./pages/provider-guides/CountyTreatmentProviderPage"));
const CountyInsuranceProviderPage = lazy(() => import("./pages/provider-guides/CountyInsuranceProviderPage"));
const ListYourFacilityCity = lazy(() => import("./pages/provider-guides/ListYourFacilityCity"));
const TreatmentProviderPage = lazy(() => import("./pages/provider-guides/TreatmentProviderPage"));
const StateTreatmentProviderPage = lazy(() => import("./pages/provider-guides/StateTreatmentProviderPage"));
const InsuranceProviderPage = lazy(() => import("./pages/provider-guides/InsuranceProviderPage"));
const StateInsuranceProviderPage = lazy(() => import("./pages/provider-guides/StateInsuranceProviderPage"));
const ProviderComparisonPage = lazy(() => import("./pages/provider-guides/ProviderComparisonPage"));
const RehabMarketingHub = lazy(() => import("./pages/provider-guides/RehabMarketingHub"));
// BestInStatePage moved to SmartCatchAll

// Provider SEO Pages
const GetMoreRehabPatients = lazy(() => import("./pages/provider-guides/GetMoreRehabPatients"));
const RehabAdmissionsGrowth = lazy(() => import("./pages/provider-guides/RehabAdmissionsGrowth"));
const RehabMarketingStrategies = lazy(() => import("./pages/provider-guides/RehabMarketingStrategies"));
const AddictionTreatmentLeadGeneration = lazy(() => import("./pages/provider-guides/AddictionTreatmentLeadGeneration"));
const IncreaseRehabAdmissions = lazy(() => import("./pages/provider-guides/IncreaseRehabAdmissions"));
const RehabCenterMarketingIdeas = lazy(() => import("./pages/provider-guides/RehabCenterMarketingIdeas"));
const TreatmentCenterPatientAcquisition = lazy(() => import("./pages/provider-guides/TreatmentCenterPatientAcquisition"));
const BehavioralHealthLeadGeneration = lazy(() => import("./pages/provider-guides/BehavioralHealthLeadGeneration"));
const RehabCenterSEO = lazy(() => import("./pages/provider-guides/RehabCenterSEO"));
const MarketingLanding = lazy(() => import("./pages/MarketingLanding"));
const DrugRehabAdvertising = lazy(() => import("./pages/provider-guides/DrugRehabAdvertising"));
const RehabCensusManagement = lazy(() => import("./pages/provider-guides/RehabCensusManagement"));
const TreatmentCenterReferralSources = lazy(() => import("./pages/provider-guides/TreatmentCenterReferralSources"));
const HowToOpenRehabCenter = lazy(() => import("./pages/provider-guides/HowToOpenRehabCenter"));
const RehabInsuranceVerification = lazy(() => import("./pages/provider-guides/RehabInsuranceVerification"));
const IOPMarketingStrategies = lazy(() => import("./pages/provider-guides/IOPMarketingStrategies"));
const DetoxCenterMarketing = lazy(() => import("./pages/provider-guides/DetoxCenterMarketing"));
const SoberLivingMarketing = lazy(() => import("./pages/provider-guides/SoberLivingMarketing"));
const RehabReputationManagement = lazy(() => import("./pages/provider-guides/RehabReputationManagement"));
const RehabStaffingGuide = lazy(() => import("./pages/provider-guides/RehabStaffingGuide"));
const RehabAccreditationGuide = lazy(() => import("./pages/provider-guides/RehabAccreditationGuide"));
const SubstanceAbuseTreatmentMarketing = lazy(() => import("./pages/provider-guides/SubstanceAbuseTreatmentMarketing"));
const MATClinicMarketing = lazy(() => import("./pages/provider-guides/MATClinicMarketing"));
const TreatmentCenterWebsiteDesign = lazy(() => import("./pages/provider-guides/TreatmentCenterWebsiteDesign"));
const RehabComplianceGuide = lazy(() => import("./pages/provider-guides/RehabComplianceGuide"));
const RehabGoogleBusinessProfile = lazy(() => import("./pages/provider-guides/RehabGoogleBusinessProfile"));
const RehabPatientRetention = lazy(() => import("./pages/provider-guides/RehabPatientRetention"));
const RehabEmailMarketing = lazy(() => import("./pages/provider-guides/RehabEmailMarketing"));
const TelehealthAddictionTreatment = lazy(() => import("./pages/provider-guides/TelehealthAddictionTreatment"));
const RehabSocialMediaMarketing = lazy(() => import("./pages/provider-guides/RehabSocialMediaMarketing"));
const DualDiagnosisTreatmentMarketing = lazy(() => import("./pages/provider-guides/DualDiagnosisTreatmentMarketing"));
const RehabAdmissionsTeamTraining = lazy(() => import("./pages/provider-guides/RehabAdmissionsTeamTraining"));
const RehabPayPerClickAdvertising = lazy(() => import("./pages/provider-guides/RehabPayPerClickAdvertising"));
const RehabContentMarketing = lazy(() => import("./pages/provider-guides/RehabContentMarketing"));
const RehabInterventionistPartnerships = lazy(() => import("./pages/provider-guides/RehabInterventionistPartnerships"));
const BestRehabListingPlatforms = lazy(() => import("./pages/provider-guides/BestRehabListingPlatforms"));
const ExclusiveVsSharedLeads = lazy(() => import("./pages/provider-guides/ExclusiveVsSharedLeads"));
const HowToChooseRehabDirectory = lazy(() => import("./pages/provider-guides/HowToChooseRehabDirectory"));
const ProviderPersonaPage = lazy(() => import("./pages/provider-guides/ProviderPersonaPage"));
const ProviderPainPointPage = lazy(() => import("./pages/provider-guides/ProviderPainPointPage"));
const ProviderBusinessPage = lazy(() => import("./pages/provider-guides/ProviderBusinessPage"));
const ProviderOperationsPage = lazy(() => import("./pages/provider-guides/ProviderOperationsPage"));
const ProviderNichePage = lazy(() => import("./pages/provider-guides/ProviderNichePage"));
const ProviderGrowthPage = lazy(() => import("./pages/provider-guides/ProviderGrowthPage"));
const ProviderIndustryPage = lazy(() => import("./pages/provider-guides/ProviderIndustryPage"));
const ProviderDigitalPage = lazy(() => import("./pages/provider-guides/ProviderDigitalPage"));
const ProviderFinancePage = lazy(() => import("./pages/provider-guides/ProviderFinancePage"));
const ProviderHighKeywordPage = lazy(() => import("./pages/provider-guides/ProviderHighKeywordPage"));
const ProviderCompliancePage = lazy(() => import("./pages/provider-guides/ProviderCompliancePage"));
const ProviderRevenuePage = lazy(() => import("./pages/provider-guides/ProviderRevenuePage"));
const ProviderFacilityTypePage = lazy(() => import("./pages/provider-guides/ProviderFacilityTypePage"));
const ProviderTechnologyPage = lazy(() => import("./pages/provider-guides/ProviderTechnologyPage"));
const ProviderStartupPage = lazy(() => import("./pages/provider-guides/ProviderStartupPage"));
const ProviderClinicalPage = lazy(() => import("./pages/provider-guides/ProviderClinicalPage"));
const ProviderPayerPage = lazy(() => import("./pages/provider-guides/ProviderPayerPage"));
const ProviderRiskPage = lazy(() => import("./pages/provider-guides/ProviderRiskPage"));
const ProviderPartnershipsPage = lazy(() => import("./pages/provider-guides/ProviderPartnershipsPage"));
const ProviderStaffingPage = lazy(() => import("./pages/provider-guides/ProviderStaffingPage"));
const ProviderMarketingChannelPage = lazy(() => import("./pages/provider-guides/ProviderMarketingChannelPage"));
const ProviderPatientExperiencePage = lazy(() => import("./pages/provider-guides/ProviderPatientExperiencePage"));
const ProviderTelehealthPage = lazy(() => import("./pages/provider-guides/ProviderTelehealthPage"));
const ProviderDataAnalyticsPage = lazy(() => import("./pages/provider-guides/ProviderAnalyticsPage"));
const ProviderAccreditationPage = lazy(() => import("./pages/provider-guides/ProviderAccreditationPage"));
const ProviderBillingOpsPage = lazy(() => import("./pages/provider-guides/ProviderBillingPage"));
const ProviderFacilityDesignPage = lazy(() => import("./pages/provider-guides/ProviderFacilityDesignPage"));
const ProviderCrisisPage = lazy(() => import("./pages/provider-guides/ProviderCrisisPage"));
const ProviderFundingPage = lazy(() => import("./pages/provider-guides/ProviderFundingPage"));
const ProviderLicensingPage = lazy(() => import("./pages/provider-guides/ProviderLicensingPage"));
const ProviderBenchmarkPage = lazy(() => import("./pages/provider-guides/ProviderBenchmarkPage"));
const ProviderOutreachPage = lazy(() => import("./pages/provider-guides/ProviderOutreachPage"));
const ProviderEntrepreneurPage = lazy(() => import("./pages/provider-guides/ProviderEntrepreneurPage"));
const ProviderSpecializedMarketPage = lazy(() => import("./pages/provider-guides/ProviderSpecializedMarketPage"));
const ProviderInsuranceOpsPage = lazy(() => import("./pages/provider-guides/ProviderInsuranceOpsPage"));
const ProviderWorkforcePage = lazy(() => import("./pages/provider-guides/ProviderWorkforcePage"));
const ProviderGovContractPage = lazy(() => import("./pages/provider-guides/ProviderGovContractPage"));
const ProviderBrandingPage = lazy(() => import("./pages/provider-guides/ProviderBrandingPage"));

// ListYourFacilityState moved to SmartCatchAll

// Provider Resource Hub
const ProviderResourceHub = lazy(() => import("./pages/providers/ProviderResourceHub"));
const ProviderResourceArticle = lazy(() => import("./pages/providers/ProviderResourceArticle"));

// Concierge Placement (Paid Service) - lazy load
const ConciergeLanding = lazy(() => import("./pages/concierge/ConciergeLanding"));
const ConciergeIntake = lazy(() => import("./pages/concierge/ConciergeIntake"));
const ConciergeThankYou = lazy(() => import("./pages/concierge/ConciergeThankYou"));


// International Placement (Global Clients) - lazy load
const InternationalLanding = lazy(() => import("./pages/international/InternationalLanding"));
const InternationalApplication = lazy(() => import("./pages/international/InternationalApplication"));
const InternationalIntake = lazy(() => import("./pages/international/InternationalIntake"));
const InternationalThankYou = lazy(() => import("./pages/international/InternationalThankYou"));
const AdLanding = lazy(() => import("./pages/AdLanding"));
const SocialLanding = lazy(() => import("./pages/SocialLanding"));
const Resources = lazy(() => import("./pages/Resources"));
const Insurance = lazy(() => import("./pages/Insurance"));
const AetnaRehab = lazy(() => import("./pages/insurance/AetnaRehab"));
const BCBSTreatment = lazy(() => import("./pages/insurance/BCBSTreatment"));
const CignaRehab = lazy(() => import("./pages/insurance/CignaRehab"));
const UnitedHealthcareRehab = lazy(() => import("./pages/insurance/UnitedHealthcareRehab"));
const HumanaRehab = lazy(() => import("./pages/insurance/HumanaRehab"));
const KaiserRehab = lazy(() => import("./pages/insurance/KaiserRehab"));
const MedicareRehab = lazy(() => import("./pages/insurance/MedicareRehab"));
const MedicaidRehab = lazy(() => import("./pages/insurance/MedicaidRehab"));
const AnthemRehab = lazy(() => import("./pages/insurance/AnthemRehab"));
const TricareRehab = lazy(() => import("./pages/insurance/TricareRehab"));
const MolinaRehab = lazy(() => import("./pages/insurance/MolinaRehab"));
const MagellanRehab = lazy(() => import("./pages/insurance/MagellanRehab"));
const WellCareRehab = lazy(() => import("./pages/insurance/WellCareRehab"));
const AmbetterRehab = lazy(() => import("./pages/insurance/AmbetterRehab"));
const OscarRehab = lazy(() => import("./pages/insurance/OscarRehab"));
const HighmarkRehab = lazy(() => import("./pages/insurance/HighmarkRehab"));
const CostEstimator = lazy(() => import("./pages/CostEstimator"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const EditorialPolicy = lazy(() => import("./pages/EditorialPolicy"));
const MedicalDisclaimer = lazy(() => import("./pages/MedicalDisclaimer"));
const SeekerSignup = lazy(() => import("./pages/SeekerSignup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

// Seeker pages - lazy load
const SeekerHome = lazy(() => import("./pages/seeker/SeekerHome"));
const SeekerRequests = lazy(() => import("./pages/seeker/SeekerRequests"));
const SeekerSaved = lazy(() => import("./pages/seeker/SeekerSaved"));
const SeekerReviews = lazy(() => import("./pages/seeker/SeekerReviews"));
const SeekerSettings = lazy(() => import("./pages/seeker/SeekerSettings"));
const SeekerNotifications = lazy(() => import("./pages/seeker/SeekerNotifications"));
const SeekerNotificationPreferences = lazy(() => import("./pages/seeker/SeekerNotificationPreferences"));
const SeekerFacilityProfile = lazy(() => import("./pages/seeker/SeekerFacilityProfile"));
const SeekerSearch = lazy(() => import("./pages/seeker/SeekerSearch"));
const SeekerHelp = lazy(() => import("./pages/seeker/SeekerHelp"));
const SeekerConcierge = lazy(() => import("./pages/seeker/SeekerConcierge"));
const SeekerInternationalCase = lazy(() => import("./pages/seeker/SeekerInternationalCase"));

// Near Me SEO Pages - lazy load
const DrugRehabNearMe = lazy(() => import("./pages/near-me/DrugRehabNearMe"));
const AlcoholRehabNearMe = lazy(() => import("./pages/near-me/AlcoholRehabNearMe"));
const DetoxNearMe = lazy(() => import("./pages/near-me/DetoxNearMe"));
const DualDiagnosisNearMe = lazy(() => import("./pages/near-me/DualDiagnosisNearMe"));
const InpatientRehabNearMe = lazy(() => import("./pages/near-me/InpatientRehabNearMe"));
const OutpatientNearMe = lazy(() => import("./pages/near-me/OutpatientNearMe"));
const FreeRehabNearMe = lazy(() => import("./pages/near-me/FreeRehabNearMe"));
const LuxuryRehabNearMe = lazy(() => import("./pages/near-me/LuxuryRehabNearMe"));
const WomensRehabNearMe = lazy(() => import("./pages/near-me/WomensRehabNearMe"));
const MensRehabNearMe = lazy(() => import("./pages/near-me/MensRehabNearMe"));
const FentanylRehabNearMe = lazy(() => import("./pages/near-me/FentanylRehabNearMe"));
const SoberLivingNearMe = lazy(() => import("./pages/near-me/SoberLivingNearMe"));
const TeenRehabNearMe = lazy(() => import("./pages/near-me/TeenRehabNearMe"));
const VeteransRehabNearMe = lazy(() => import("./pages/near-me/VeteransRehabNearMe"));
const MedicaidRehabNearMe = lazy(() => import("./pages/near-me/MedicaidRehabNearMe"));
const CourtOrderedRehabNearMe = lazy(() => import("./pages/near-me/CourtOrderedRehabNearMe"));
const SuboxoneClinicNearMe = lazy(() => import("./pages/near-me/SuboxoneClinicNearMe"));
const MethadoneClinicNearMe = lazy(() => import("./pages/near-me/MethadoneClinicNearMe"));
const OutpatientRehabNearMe = lazy(() => import("./pages/near-me/OutpatientRehabNearMe"));
const DualDiagnosisRehabNearMe = lazy(() => import("./pages/near-me/DualDiagnosisRehabNearMe"));
const FaithBasedRehabNearMe = lazy(() => import("./pages/near-me/FaithBasedRehabNearMe"));
const HolisticRehabNearMe = lazy(() => import("./pages/near-me/HolisticRehabNearMe"));
const ChristianRehabNearMe = lazy(() => import("./pages/near-me/ChristianRehabNearMe"));
const LongTermRehabNearMe = lazy(() => import("./pages/near-me/LongTermRehabNearMe"));
const IOPNearMe = lazy(() => import("./pages/near-me/IOPNearMe"));
const PHPNearMe = lazy(() => import("./pages/near-me/PHPNearMe"));
const CouplesRehabNearMe = lazy(() => import("./pages/near-me/CouplesRehabNearMe"));
const ExecutiveRehabNearMe = lazy(() => import("./pages/near-me/ExecutiveRehabNearMe"));
const RehabNearMe = lazy(() => import("./pages/near-me/RehabNearMe"));
const MATClinicNearMe = lazy(() => import("./pages/near-me/MATClinicNearMe"));
const AffordableRehabNearMe = lazy(() => import("./pages/near-me/AffordableRehabNearMe"));

// US Rehab International SEO Pages - lazy load
const USRehabHub = lazy(() => import("./pages/us-rehab/USRehabHub"));
const BestRehabUSA = lazy(() => import("./pages/us-rehab/BestRehabUSA"));
const LuxuryRehabAmerica = lazy(() => import("./pages/us-rehab/LuxuryRehabAmerica"));
const LuxuryRehabCalifornia = lazy(() => import("./pages/us-rehab/LuxuryRehabCalifornia"));
const LuxuryRehabFlorida = lazy(() => import("./pages/us-rehab/LuxuryRehabFlorida"));
const LuxuryRehabArizona = lazy(() => import("./pages/us-rehab/LuxuryRehabArizona"));
const ExecutiveRehabUSA = lazy(() => import("./pages/us-rehab/ExecutiveRehabUSA"));
const PrivateRehabAmerica = lazy(() => import("./pages/us-rehab/PrivateRehabAmerica"));
const InternationalPatients = lazy(() => import("./pages/us-rehab/InternationalPatients"));
const MalibuRehabCenters = lazy(() => import("./pages/us-rehab/MalibuRehabCenters"));
// Country-specific SEO pages
const RehabUSAFromUK = lazy(() => import("./pages/us-rehab/RehabUSAFromUK"));
const RehabUSAFromUAE = lazy(() => import("./pages/us-rehab/RehabUSAFromUAE"));
const RehabUSAFromAustralia = lazy(() => import("./pages/us-rehab/RehabUSAFromAustralia"));
const RehabUSAFromCanada = lazy(() => import("./pages/us-rehab/RehabUSAFromCanada"));
const RehabUSAFromEurope = lazy(() => import("./pages/us-rehab/RehabUSAFromEurope"));
// Treatment-specific SEO pages
const AlcoholRehabUSA = lazy(() => import("./pages/us-rehab/AlcoholRehabUSA"));
const DrugRehabUSA = lazy(() => import("./pages/us-rehab/DrugRehabUSA"));
const DualDiagnosisUSA = lazy(() => import("./pages/us-rehab/DualDiagnosisUSA"));
const CelebrityRehabUSA = lazy(() => import("./pages/us-rehab/CelebrityRehabUSA"));
// High-intent international SEO pages
const TravelToUSAForRehab = lazy(() => import("./pages/us-rehab/TravelToUSAForRehab"));
const CostOfRehabUSA = lazy(() => import("./pages/us-rehab/CostOfRehabUSA"));
const ForeignersRehabUSA = lazy(() => import("./pages/us-rehab/ForeignersRehabUSA"));
const PayingForRehabUSANoInsurance = lazy(() => import("./pages/us-rehab/PayingForRehabUSANoInsurance"));
const AffordableRehabUSA = lazy(() => import("./pages/us-rehab/AffordableRehabUSA"));
const FastAdmissionRehabUSA = lazy(() => import("./pages/us-rehab/FastAdmissionRehabUSA"));
const SameDayDetoxUSA = lazy(() => import("./pages/us-rehab/SameDayDetoxUSA"));
const TopDetoxCentersUSA = lazy(() => import("./pages/us-rehab/TopDetoxCentersUSA"));

// Panel shells - lazy loaded to reduce initial bundle size
const ProviderShell = lazy(() => import("./components/provider/ProviderShell").then(m => ({ default: m.ProviderShell })));
const AdminShell = lazy(() => import("./components/admin/AdminShell").then(m => ({ default: m.AdminShell })));
const SeekerShell = lazy(() => import("./components/seeker/SeekerShell").then(m => ({ default: m.SeekerShell })));

// Provider Panel pages - lazy load (shell handles Suspense)
const ProviderDashboardPage = lazy(() => import("./pages/provider/Dashboard"));
const ProviderListingPage = lazy(() => import("./pages/provider/MyListings"));
const ProviderInquiriesPage = lazy(() => import("./pages/provider/Inquiries"));
const ProviderReviewsPage = lazy(() => import("./pages/provider/Reviews"));
const ProviderAnalyticsPage = lazy(() => import("./pages/provider/Analytics"));

const ProviderSettingsPage = lazy(() => import("./pages/provider/Settings"));
const ProviderEmbedBadgePage = lazy(() => import("./pages/provider/EmbedBadge"));
const ProviderNotificationsPage = lazy(() => import("./pages/provider/Notifications"));
const ProviderHelpPage = lazy(() => import("./pages/provider/Help"));
const ProviderKnowledgeBasePage = lazy(() => import("./pages/provider/KnowledgeBase"));
const ProviderImageGuidelines = lazy(() => import("./pages/provider/ImageGuidelines"));
const ProviderAddLocation = lazy(() => import("./pages/provider/AddLocation"));
const ProviderBillingPage = lazy(() => import("./pages/provider/Billing"));
const ProviderProUpgradePage = lazy(() => import("./pages/provider/ProUpgrade"));
const ProviderPlacementNetworkPage = lazy(() => import("./pages/provider/PlacementNetwork"));

// Admin Panel pages - lazy load (shell handles Suspense)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProviders = lazy(() => import("./pages/admin/AdminProviders"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminUsers = lazy(() => import("./pages/admin/AdminStaff"));
const AdminSeekers = lazy(() => import("./pages/admin/AdminSeekers"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminConcierge = lazy(() => import("./pages/admin/AdminConcierge"));
const InternationalAgreementTemplate = lazy(() => import("./pages/admin/InternationalAgreementTemplate"));
const PlacementRevenueDashboard = lazy(() => import("./pages/admin/PlacementRevenueDashboard"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdvisorInbox = lazy(() => import("./pages/admin/AdvisorInbox"));
const AdminEscalations = lazy(() => import("./pages/admin/AdminEscalations"));
const AdminBackOffice = lazy(() => import("./pages/admin/AdminBackOffice"));
const AdvisorProviderDirectory = lazy(() => import("./pages/admin/AdvisorProviderDirectory"));
const AdminEmailLogs = lazy(() => import("./pages/admin/AdminEmailLogs"));

function LegacyCenterRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/center/${slug}`} replace />;
}

function BlogRedirect() {
  const { id } = useParams();
  return <Navigate to={`/resources/${id}`} replace />;
}

// Some tooling injects `ref` into top-level elements; these wrappers safely absorb refs
// so we don't get noisy "Function components cannot be given refs" warnings.
//
// Some instrumentation attaches refs to the *top-level element returned* by a component.
// If that element is a function component (e.g. QueryClientProvider), React warns.
// We therefore return a ref-friendly DOM sink (div.contents) as the top-level element.

type QueryClientProviderProps = React.ComponentProps<typeof QueryClientProvider>;
type TooltipProviderProps = React.ComponentProps<typeof TooltipProvider>;
type BrowserRouterProps = React.ComponentProps<typeof BrowserRouter>;

const SafeQueryClientProvider = React.forwardRef<HTMLDivElement, QueryClientProviderProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} className="contents" data-ref-sink="query-client-provider">
        <QueryClientProvider {...props}>{children}</QueryClientProvider>
      </div>
    );
  }
);
SafeQueryClientProvider.displayName = "SafeQueryClientProvider";


const SafeTooltipProvider = React.forwardRef<HTMLDivElement, TooltipProviderProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} className="contents" data-ref-sink="tooltip-provider">
        <TooltipProvider {...props}>{children}</TooltipProvider>
      </div>
    );
  }
);
SafeTooltipProvider.displayName = "SafeTooltipProvider";


const SafeBrowserRouter = React.forwardRef<HTMLDivElement, BrowserRouterProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} className="contents" data-ref-sink="browser-router">
        <BrowserRouter {...props}>{children}</BrowserRouter>
      </div>
    );
  }
);
SafeBrowserRouter.displayName = "SafeBrowserRouter";


function DualDiagnosisStateRedirect() {
  const { stateSlug } = useParams();
  return <Navigate to={`/treatment-types/dual-diagnosis-treatment/${stateSlug}`} replace />;
}

function DetoxStateRedirect() {
  const { stateSlug } = useParams();
  return <Navigate to={`/treatment-types/detox-programs/${stateSlug}`} replace />;
}

function InpatientStateRedirect() {
  const { stateSlug } = useParams();
  return <Navigate to={`/treatment-types/residential-inpatient/${stateSlug}`} replace />;
}

function AlcoholStateRedirect() {
  const { stateSlug } = useParams();
  return <Navigate to={`/treatment-types/alcohol-rehabilitation/${stateSlug}`} replace />;
}

const AppInner = () => {
  // Global handler for unhandled promise rejections to prevent page blanking
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      import("@sentry/react").then((Sentry) => {
        Sentry.captureException(event.reason || new Error("Unhandled promise rejection"));
      }).catch(() => {});

      // Prevent default browser error handling which can crash/blank the app
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  // Dev-only: filter noisy ref-injection warnings so real provider errors stand out.
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const originalError = console.error;
    console.error = (...args: any[]) => {
      const first = args[0];
      if (
        typeof first === "string" &&
        first.includes("Function components cannot be given refs")
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <GlobalErrorBoundary>

      <HelmetProvider>
        <SafeQueryClientProvider client={queryClient}>
          <SafeTooltipProvider>
            <Toaster />
            <Sonner />
            <SafeBrowserRouter>
              <NavigationProvider>
                <ScrollToTop />
        <TrailingSlashRedirect />
        <CookieConsentBanner />
        <Suspense fallback={null}>
          <Routes>
            {/* Public Routes - Providers are redirected away */}
            <Route path="/" element={<PublicRouteGuard><Index /></PublicRouteGuard>} />
            <Route path="/locations" element={<PublicRouteGuard><Locations /></PublicRouteGuard>} />
            <Route path="/rehab-centers" element={<PublicRouteGuard><RehabCenters /></PublicRouteGuard>} />
            <Route path="/search-results" element={<PublicRouteGuard><SearchResults /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug/articles/:articleSlug" element={<PublicRouteGuard><StateArticlePage /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug/county/:countySlug/:treatmentSlug" element={<PublicRouteGuard><CountyTreatmentPage /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug/county/:countySlug" element={<PublicRouteGuard><CountyPage /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug/:citySlug" element={<PublicRouteGuard><CityPage /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug" element={<PublicRouteGuard><StatePage /></PublicRouteGuard>} />
            <Route path="/center/:slug" element={<PublicRouteGuard><CenterProfile /></PublicRouteGuard>} />
            <Route path="/treatment-types" element={<PublicRouteGuard><TreatmentTypes /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction" element={<Navigate to="/treatment-types/drug-addiction-treatment" replace />} />
            <Route path="/treatment-types/drug-addiction-treatment" element={<PublicRouteGuard><DrugAddictionTreatment /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction/:stateSlug" element={<PublicRouteGuard><StateDrugAddiction /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction/:stateSlug/:citySlug" element={<PublicRouteGuard><CityDrugAddiction /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation" element={<PublicRouteGuard><AlcoholRehabilitation /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation/:stateSlug" element={<PublicRouteGuard><StateAlcoholRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation/:stateSlug/:citySlug" element={<PublicRouteGuard><CityAlcoholRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/dual-diagnosis" element={<Navigate to="/treatment-types/dual-diagnosis-treatment" replace />} />
            <Route path="/treatment-types/dual-diagnosis-treatment" element={<PublicRouteGuard><DualDiagnosisTreatment /></PublicRouteGuard>} />
            <Route path="/treatment-types/dual-diagnosis-treatment/:stateSlug" element={<PublicRouteGuard><StateDualDiagnosis /></PublicRouteGuard>} />
            <Route path="/treatment-types/dual-diagnosis-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CityDualDiagnosis /></PublicRouteGuard>} />
            <Route path="/treatment-types/residential-inpatient" element={<PublicRouteGuard><ResidentialInpatient /></PublicRouteGuard>} />
            <Route path="/treatment-types/residential-inpatient/:stateSlug" element={<PublicRouteGuard><StateInpatientRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/residential-inpatient/:stateSlug/:citySlug" element={<PublicRouteGuard><CityInpatientRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/outpatient-programs" element={<PublicRouteGuard><OutpatientPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/outpatient-programs/:stateSlug" element={<PublicRouteGuard><StateOutpatientPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/outpatient-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><CityOutpatientPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/holistic-therapy" element={<PublicRouteGuard><HolisticTherapy /></PublicRouteGuard>} />
            <Route path="/treatment-types/holistic-therapy/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="holistic" /></PublicRouteGuard>} />
            <Route path="/treatment-types/holistic-treatment" element={<Navigate to="/treatment-types/holistic-therapy" replace />} />
            <Route path="/treatment-types/luxury-rehab" element={<PublicRouteGuard><LuxuryRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/luxury-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="luxury-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/sober-living/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="sober-living" /></PublicRouteGuard>} />
            <Route path="/treatment-types/free-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="free-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/faith-based-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="faith-based-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/fentanyl-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="fentanyl-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/veterans-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="veterans-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/womens-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="womens-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/mens-rehab/:stateSlug" element={<PublicRouteGuard><StateTreatmentExpandedPage treatmentKey="mens-rehab" /></PublicRouteGuard>} />

            {/* City-level expanded treatment pages */}
            <Route path="/treatment-types/luxury-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="luxury-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/sober-living/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="sober-living" /></PublicRouteGuard>} />
            <Route path="/treatment-types/free-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="free-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/faith-based-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="faith-based-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/fentanyl-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="fentanyl-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/veterans-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="veterans-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/womens-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="womens-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/mens-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><CityTreatmentExpandedPage treatmentKey="mens-rehab" /></PublicRouteGuard>} />

            {/* National hub pages for expanded treatment types */}
            <Route path="/treatment-types/sober-living" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="sober-living" /></PublicRouteGuard>} />
            <Route path="/treatment-types/free-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="free-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/faith-based-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="faith-based-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/fentanyl-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="fentanyl-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/veterans-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="veterans-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/womens-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="womens-rehab" /></PublicRouteGuard>} />
            <Route path="/treatment-types/mens-rehab" element={<PublicRouteGuard><ExpandedTreatmentNationalHub treatmentKey="mens-rehab" /></PublicRouteGuard>} />
            {/* luxury-rehab national hub defined at line 524 */}
            <Route path="/treatment-types/detox-programs" element={<PublicRouteGuard><DetoxPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/detox-programs/:stateSlug" element={<PublicRouteGuard><StateDetoxPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/detox-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><CityDetoxPrograms /></PublicRouteGuard>} />
            
            {/* SEO Treatment Hub Pages */}
            <Route path="/alcohol-rehab-centers" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/drug-rehab-centers" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/detox-centers" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/inpatient-rehab" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/outpatient-rehab" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-treatment" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            
            {/* New Treatment Hub Pages */}
            <Route path="/php-programs" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/iop-programs" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/mat-programs" element={<PublicRouteGuard><TreatmentHubPage /></PublicRouteGuard>} />
            
            {/* Expanded Treatment Hub Pages */}
            <Route path="/sober-living-homes" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/faith-based-rehab" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/fentanyl-rehab" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/veterans-rehab" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/womens-rehab" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/mens-rehab" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            <Route path="/free-rehab-options" element={<PublicRouteGuard><ExpandedTreatmentHubPage /></PublicRouteGuard>} />
            
            {/* SEO Comparison Pages */}
            <Route path="/inpatient-vs-outpatient-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/detox-vs-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/private-vs-public-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/php-vs-iop" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/30-day-vs-90-day-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/mat-vs-abstinence-based-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/12-step-vs-non-12-step-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/rehab-vs-therapy" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/inpatient-vs-residential-treatment" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/sober-living-vs-halfway-house" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            
            {/* SEO Cost & Insurance Pages */}
            <Route path="/rehab-cost" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/does-insurance-cover-rehab" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/free-rehab-centers" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/medicaid-rehab-centers" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/rehab-without-insurance" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/free-rehab-programs" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/rehab-financial-assistance" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            
            {/* Substance-Specific SEO Landing Pages */}
            <Route path="/cocaine-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/opioid-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/heroin-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/meth-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/prescription-drug-rehab" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/benzodiazepine-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/alcohol-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/marijuana-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/fentanyl-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/xanax-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/adderall-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/kratom-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/gabapentin-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
             <Route path="/tramadol-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />

             {/* Substance + State Pages */}
             <Route path="/cocaine-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/opioid-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/heroin-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/meth-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/prescription-drug-rehab/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/benzodiazepine-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/alcohol-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/marijuana-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/fentanyl-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/xanax-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/adderall-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/kratom-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/gabapentin-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />
             <Route path="/tramadol-addiction-treatment/:stateSlug" element={<PublicRouteGuard><SubstanceStatePage /></PublicRouteGuard>} />

             {/* Substance + City Pages */}
             <Route path="/cocaine-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/opioid-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/heroin-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/meth-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/prescription-drug-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/benzodiazepine-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/alcohol-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/marijuana-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/fentanyl-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/xanax-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/adderall-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/kratom-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/gabapentin-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             <Route path="/tramadol-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><SubstanceCityPage /></PublicRouteGuard>} />
             {/* Demographic/Population-Specific Pages */}
             <Route path="/young-adult-rehab" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/teen-rehab-programs" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/senior-addiction-treatment" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/lgbtq-rehab-programs" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/pregnant-women-addiction-treatment" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/first-responders-rehab" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/healthcare-professionals-rehab" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/executive-rehab-programs" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/teachers-rehab-programs" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />
             <Route path="/college-student-addiction-treatment" element={<PublicRouteGuard><DemographicTreatmentPage /></PublicRouteGuard>} />

             {/* Demographic + State Pages */}
             <Route path="/young-adult-rehab/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/teen-rehab-programs/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/senior-addiction-treatment/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/lgbtq-rehab-programs/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/pregnant-women-addiction-treatment/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/first-responders-rehab/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/healthcare-professionals-rehab/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/executive-rehab-programs/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/teachers-rehab-programs/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />
             <Route path="/college-student-addiction-treatment/:stateSlug" element={<PublicRouteGuard><DemographicStatePage /></PublicRouteGuard>} />

             {/* Demographic + City Pages */}
             <Route path="/young-adult-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/teen-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/senior-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/lgbtq-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/pregnant-women-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/first-responders-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/healthcare-professionals-rehab/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/executive-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/teachers-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             <Route path="/college-student-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><DemographicCityPage /></PublicRouteGuard>} />
             
             {/* Seeker Intent / Family Guide Pages */}
             <Route path="/how-to-stage-an-intervention" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/signs-loved-one-needs-rehab" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/how-to-help-alcoholic-family-member" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/what-to-expect-loved-one-in-rehab" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/how-to-find-rehab-for-family-member" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/how-to-pay-for-rehab-without-insurance" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/what-happens-after-rehab" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/how-to-choose-between-inpatient-and-outpatient" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/recovery-support-groups-guide" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/talking-to-your-employer-about-rehab" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/rehab-for-seniors-guide" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/understanding-rehab-levels-of-care" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />
             <Route path="/addiction-and-relationships-guide" element={<PublicRouteGuard><SeekerGuidePage /></PublicRouteGuard>} />

             {/* Therapy Modality & Educational Pages */}
             <Route path="/cbt-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/emdr-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/dbt-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/motivational-interviewing-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/art-music-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/adventure-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/aftercare-and-relapse-prevention" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/what-to-pack-for-rehab" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/questions-to-ask-rehab-center" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />

             {/* Co-Occurring Condition Pages */}
             <Route path="/anxiety-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/anxiety-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/depression-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/depression-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/ptsd-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/ptsd-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/bipolar-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/bipolar-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/adhd-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/adhd-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/eating-disorders-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/eating-disorders-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />

             {/* Co-Occurring + City Pages */}
             <Route path="/anxiety-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />
             <Route path="/depression-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />
             <Route path="/ptsd-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />
             <Route path="/bipolar-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />
             <Route path="/adhd-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />
             <Route path="/eating-disorders-and-addiction-treatment/:stateSlug/:citySlug" element={<PublicRouteGuard><CoOccurringCityPage /></PublicRouteGuard>} />

             {/* Duration & Setting Pages */}
             <Route path="/30-day-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/30-day-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/60-day-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/60-day-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/90-day-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/90-day-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/long-term-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/long-term-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/beach-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/beach-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/mountain-rehab-programs" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />
             <Route path="/mountain-rehab-programs/:stateSlug" element={<PublicRouteGuard><DurationSettingPage /></PublicRouteGuard>} />

             {/* Duration + City Pages */}
             <Route path="/30-day-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />
             <Route path="/60-day-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />
             <Route path="/90-day-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />
             <Route path="/long-term-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />
             <Route path="/beach-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />
             <Route path="/mountain-rehab-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><DurationCityPage /></PublicRouteGuard>} />

             <Route path="/medicaid-rehab/:stateSlug" element={<PublicRouteGuard><PaymentStatePage paymentType="medicaid" /></PublicRouteGuard>} />
             <Route path="/medicare-rehab/:stateSlug" element={<PublicRouteGuard><PaymentStatePage paymentType="medicare" /></PublicRouteGuard>} />
            
            {/* Insurance + State + City Cross Pages */}
            <Route path="/insurance/:slug/:stateSlug/county/:countySlug" element={<PublicRouteGuard><CountyInsurancePage /></PublicRouteGuard>} />
            <Route path="/insurance/:insurerSlug/:stateSlug/:citySlug" element={<PublicRouteGuard><CityInsurancePage /></PublicRouteGuard>} />
            {/* Insurance + State Cross Pages */}
            <Route path="/insurance/:slug/:stateSlug" element={<PublicRouteGuard><InsuranceStatePage /></PublicRouteGuard>} />
            
            {/* Best Rehab Centers in [State] Roundup Pages */}
            {/* Best Rehab Centers routes handled by SmartCatchAll below */}
            
            {/* SEO City+Treatment Combo Pages - handled by SmartCatchAll */}
            
            {/* Near Me SEO Routes */}
            <Route path="/drug-rehab-near-me" element={<PublicRouteGuard><DrugRehabNearMe /></PublicRouteGuard>} />
            <Route path="/drug-rehab-near-me/:stateSlug" element={<PublicRouteGuard><DrugRehabNearMe /></PublicRouteGuard>} />
            <Route path="/alcohol-rehab-near-me" element={<PublicRouteGuard><AlcoholRehabNearMe /></PublicRouteGuard>} />
            <Route path="/alcohol-rehab-near-me/:stateSlug" element={<PublicRouteGuard><AlcoholRehabNearMe /></PublicRouteGuard>} />
            <Route path="/detox-near-me" element={<PublicRouteGuard><DetoxNearMe /></PublicRouteGuard>} />
            <Route path="/detox-near-me/:stateSlug" element={<PublicRouteGuard><DetoxNearMe /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-near-me" element={<PublicRouteGuard><DualDiagnosisNearMe /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-near-me/:stateSlug" element={<PublicRouteGuard><DualDiagnosisNearMe /></PublicRouteGuard>} />
            <Route path="/inpatient-rehab-near-me" element={<PublicRouteGuard><InpatientRehabNearMe /></PublicRouteGuard>} />
            <Route path="/inpatient-rehab-near-me/:stateSlug" element={<PublicRouteGuard><InpatientRehabNearMe /></PublicRouteGuard>} />
            <Route path="/outpatient-near-me" element={<PublicRouteGuard><OutpatientNearMe /></PublicRouteGuard>} />
            <Route path="/outpatient-near-me/:stateSlug" element={<PublicRouteGuard><OutpatientNearMe /></PublicRouteGuard>} />
            <Route path="/free-rehab-near-me" element={<PublicRouteGuard><FreeRehabNearMe /></PublicRouteGuard>} />
            <Route path="/free-rehab-near-me/:stateSlug" element={<PublicRouteGuard><FreeRehabNearMe /></PublicRouteGuard>} />
            <Route path="/luxury-rehab-near-me" element={<PublicRouteGuard><LuxuryRehabNearMe /></PublicRouteGuard>} />
            <Route path="/luxury-rehab-near-me/:stateSlug" element={<PublicRouteGuard><LuxuryRehabNearMe /></PublicRouteGuard>} />
            <Route path="/womens-rehab-near-me" element={<PublicRouteGuard><WomensRehabNearMe /></PublicRouteGuard>} />
            <Route path="/womens-rehab-near-me/:stateSlug" element={<PublicRouteGuard><WomensRehabNearMe /></PublicRouteGuard>} />
            <Route path="/mens-rehab-near-me" element={<PublicRouteGuard><MensRehabNearMe /></PublicRouteGuard>} />
            <Route path="/mens-rehab-near-me/:stateSlug" element={<PublicRouteGuard><MensRehabNearMe /></PublicRouteGuard>} />
            <Route path="/fentanyl-rehab-near-me" element={<PublicRouteGuard><FentanylRehabNearMe /></PublicRouteGuard>} />
            <Route path="/fentanyl-rehab-near-me/:stateSlug" element={<PublicRouteGuard><FentanylRehabNearMe /></PublicRouteGuard>} />
            <Route path="/sober-living-near-me" element={<PublicRouteGuard><SoberLivingNearMe /></PublicRouteGuard>} />
            <Route path="/sober-living-near-me/:stateSlug" element={<PublicRouteGuard><SoberLivingNearMe /></PublicRouteGuard>} />
            <Route path="/teen-rehab-near-me" element={<PublicRouteGuard><TeenRehabNearMe /></PublicRouteGuard>} />
            <Route path="/teen-rehab-near-me/:stateSlug" element={<PublicRouteGuard><TeenRehabNearMe /></PublicRouteGuard>} />
            <Route path="/veterans-rehab-near-me" element={<PublicRouteGuard><VeteransRehabNearMe /></PublicRouteGuard>} />
            <Route path="/veterans-rehab-near-me/:stateSlug" element={<PublicRouteGuard><VeteransRehabNearMe /></PublicRouteGuard>} />
            <Route path="/medicaid-rehab-near-me" element={<PublicRouteGuard><MedicaidRehabNearMe /></PublicRouteGuard>} />
            <Route path="/medicaid-rehab-near-me/:stateSlug" element={<PublicRouteGuard><MedicaidRehabNearMe /></PublicRouteGuard>} />
            <Route path="/court-ordered-rehab-near-me" element={<PublicRouteGuard><CourtOrderedRehabNearMe /></PublicRouteGuard>} />
            <Route path="/court-ordered-rehab-near-me/:stateSlug" element={<PublicRouteGuard><CourtOrderedRehabNearMe /></PublicRouteGuard>} />
            <Route path="/suboxone-clinic-near-me" element={<PublicRouteGuard><SuboxoneClinicNearMe /></PublicRouteGuard>} />
            <Route path="/suboxone-clinic-near-me/:stateSlug" element={<PublicRouteGuard><SuboxoneClinicNearMe /></PublicRouteGuard>} />
            <Route path="/methadone-clinic-near-me" element={<PublicRouteGuard><MethadoneClinicNearMe /></PublicRouteGuard>} />
            <Route path="/methadone-clinic-near-me/:stateSlug" element={<PublicRouteGuard><MethadoneClinicNearMe /></PublicRouteGuard>} />
            <Route path="/outpatient-rehab-near-me" element={<PublicRouteGuard><OutpatientRehabNearMe /></PublicRouteGuard>} />
            <Route path="/outpatient-rehab-near-me/:stateSlug" element={<PublicRouteGuard><OutpatientRehabNearMe /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-rehab-near-me" element={<PublicRouteGuard><DualDiagnosisRehabNearMe /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-rehab-near-me/:stateSlug" element={<PublicRouteGuard><DualDiagnosisRehabNearMe /></PublicRouteGuard>} />
            <Route path="/faith-based-rehab-near-me" element={<PublicRouteGuard><FaithBasedRehabNearMe /></PublicRouteGuard>} />
            <Route path="/faith-based-rehab-near-me/:stateSlug" element={<PublicRouteGuard><FaithBasedRehabNearMe /></PublicRouteGuard>} />
            <Route path="/holistic-rehab-near-me" element={<PublicRouteGuard><HolisticRehabNearMe /></PublicRouteGuard>} />
            <Route path="/holistic-rehab-near-me/:stateSlug" element={<PublicRouteGuard><HolisticRehabNearMe /></PublicRouteGuard>} />
            <Route path="/christian-rehab-near-me" element={<PublicRouteGuard><ChristianRehabNearMe /></PublicRouteGuard>} />
            <Route path="/christian-rehab-near-me/:stateSlug" element={<PublicRouteGuard><ChristianRehabNearMe /></PublicRouteGuard>} />
            <Route path="/long-term-rehab-near-me" element={<PublicRouteGuard><LongTermRehabNearMe /></PublicRouteGuard>} />
            <Route path="/long-term-rehab-near-me/:stateSlug" element={<PublicRouteGuard><LongTermRehabNearMe /></PublicRouteGuard>} />
            <Route path="/iop-near-me" element={<PublicRouteGuard><IOPNearMe /></PublicRouteGuard>} />
            <Route path="/iop-near-me/:stateSlug" element={<PublicRouteGuard><IOPNearMe /></PublicRouteGuard>} />
            <Route path="/php-near-me" element={<PublicRouteGuard><PHPNearMe /></PublicRouteGuard>} />
            <Route path="/php-near-me/:stateSlug" element={<PublicRouteGuard><PHPNearMe /></PublicRouteGuard>} />
            <Route path="/couples-rehab-near-me" element={<PublicRouteGuard><CouplesRehabNearMe /></PublicRouteGuard>} />
            <Route path="/couples-rehab-near-me/:stateSlug" element={<PublicRouteGuard><CouplesRehabNearMe /></PublicRouteGuard>} />
            <Route path="/executive-rehab-near-me" element={<PublicRouteGuard><ExecutiveRehabNearMe /></PublicRouteGuard>} />
            <Route path="/executive-rehab-near-me/:stateSlug" element={<PublicRouteGuard><ExecutiveRehabNearMe /></PublicRouteGuard>} />
            <Route path="/rehab-near-me" element={<PublicRouteGuard><RehabNearMe /></PublicRouteGuard>} />
            <Route path="/rehab-near-me/:stateSlug" element={<PublicRouteGuard><RehabNearMe /></PublicRouteGuard>} />
            <Route path="/mat-clinic-near-me" element={<PublicRouteGuard><MATClinicNearMe /></PublicRouteGuard>} />
            <Route path="/mat-clinic-near-me/:stateSlug" element={<PublicRouteGuard><MATClinicNearMe /></PublicRouteGuard>} />
            <Route path="/affordable-rehab-near-me" element={<PublicRouteGuard><AffordableRehabNearMe /></PublicRouteGuard>} />
            <Route path="/affordable-rehab-near-me/:stateSlug" element={<PublicRouteGuard><AffordableRehabNearMe /></PublicRouteGuard>} />

             {/* Substance-Specific Near Me Pages (Batch 1) */}
             <Route path="/cocaine-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="cocaine-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/cocaine-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="cocaine-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/heroin-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="heroin-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/heroin-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="heroin-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/opioid-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="opioid-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/opioid-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="opioid-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/meth-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="meth-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/meth-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="meth-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/prescription-drug-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="prescription-drug-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/prescription-drug-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="prescription-drug-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/benzo-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="benzo-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/benzo-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="benzo-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/xanax-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="xanax-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/xanax-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="xanax-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/kratom-rehab-near-me" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="kratom-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/kratom-rehab-near-me/:stateSlug" element={<PublicRouteGuard><SubstanceRehabNearMe configSlug="kratom-rehab-near-me" /></PublicRouteGuard>} />

             {/* Expanded Near Me Pages - Urgency, Insurance, Demographics, Duration (Batch 5) */}
             <Route path="/emergency-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="emergency-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/emergency-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="emergency-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/same-day-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="same-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/same-day-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="same-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/24-7-detox-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="24-7-detox-near-me" /></PublicRouteGuard>} />
             <Route path="/24-7-detox-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="24-7-detox-near-me" /></PublicRouteGuard>} />
             <Route path="/immediate-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="immediate-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/immediate-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="immediate-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/low-cost-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="low-cost-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/low-cost-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="low-cost-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/medicare-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="medicare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/medicare-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="medicare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/blue-cross-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="blue-cross-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/blue-cross-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="blue-cross-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/aetna-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="aetna-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/aetna-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="aetna-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/cigna-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="cigna-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/cigna-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="cigna-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/united-healthcare-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="united-healthcare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/united-healthcare-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="united-healthcare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/tricare-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="tricare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/tricare-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="tricare-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/humana-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="humana-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/humana-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="humana-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/30-day-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="30-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/30-day-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="30-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/60-day-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="60-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/60-day-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="60-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/90-day-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="90-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/90-day-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="90-day-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/short-term-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="short-term-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/short-term-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="short-term-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/lgbtq-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="lgbtq-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/lgbtq-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="lgbtq-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/young-adult-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="young-adult-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/young-adult-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="young-adult-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/seniors-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="seniors-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/seniors-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="seniors-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/first-responder-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="first-responder-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/first-responder-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="first-responder-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/marijuana-rehab-near-me" element={<PublicRouteGuard><GenericNearMePage configSlug="marijuana-rehab-near-me" /></PublicRouteGuard>} />
             <Route path="/marijuana-rehab-near-me/:stateSlug" element={<PublicRouteGuard><GenericNearMePage configSlug="marijuana-rehab-near-me" /></PublicRouteGuard>} />

             {/* Educational "What Is" Pages (Batch 2) */}
             <Route path="/what-is-detox" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-mat" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-php" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-iop" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-dual-diagnosis" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-sober-living" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-residential-treatment" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/what-is-intensive-outpatient" element={<Navigate to="/what-is-iop" replace />} />

             {/* Withdrawal & Signs Pages (Batch 3) */}
             <Route path="/alcohol-withdrawal-symptoms" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/opioid-withdrawal-timeline" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/benzo-withdrawal-symptoms" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/meth-withdrawal-symptoms" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-alcohol-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-drug-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-opioid-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-meth-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/fentanyl-withdrawal-symptoms" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/cocaine-withdrawal-symptoms" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-benzo-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />
             <Route path="/signs-of-fentanyl-addiction" element={<PublicRouteGuard><EducationalPage /></PublicRouteGuard>} />

             {/* New Comparison Pages (Batch 4) */}
             <Route path="/rehab-vs-self-detox" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/faith-based-vs-secular-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/luxury-vs-standard-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/short-term-vs-long-term-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />

             {/* Decision-Stage & Educational Comparison Pages */}
             <Route path="/how-to-choose-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/what-to-expect-in-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/how-much-does-rehab-cost" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
             <Route path="/rehab-for-families" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />

             {/* New Therapy Modality Pages (Batch 5) */}
             <Route path="/equine-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/yoga-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/meditation-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/family-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/group-therapy-for-addiction" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />
             <Route path="/12-step-facilitation-therapy" element={<PublicRouteGuard><TherapyModalityPage /></PublicRouteGuard>} />

             {/* New Co-Occurring Pages (Batch 6) */}
             <Route path="/ocd-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/ocd-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/bpd-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/bpd-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/schizophrenia-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/schizophrenia-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/chronic-pain-and-addiction-treatment" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />
             <Route path="/chronic-pain-and-addiction-treatment/:stateSlug" element={<PublicRouteGuard><CoOccurringPage /></PublicRouteGuard>} />

             {/* Additional City+Treatment Combo Routes - handled by SmartCatchAll */}

            {/* Concierge Placement Routes - /concierge is canonical */}
            <Route path="/concierge" element={<PublicRouteGuard><ConciergeLanding /></PublicRouteGuard>} />
            <Route path="/concierge/intake" element={<PublicRouteGuard><ConciergeIntake /></PublicRouteGuard>} />
            <Route path="/concierge/thank-you" element={<PublicRouteGuard><ConciergeThankYou /></PublicRouteGuard>} />
            
            {/* Legacy concierge redirects */}
            <Route path="/concierge/create-password" element={<Navigate to="/concierge/thank-you" replace />} />
            <Route path="/request-help" element={<Navigate to="/concierge" replace />} />
            <Route path="/request-help/intake" element={<Navigate to="/concierge/intake" replace />} />
            <Route path="/request-help/thank-you" element={<Navigate to="/concierge/thank-you" replace />} />
            <Route path="/request-help/create-password" element={<Navigate to="/concierge/thank-you" replace />} />
            
            {/* Legacy /treatment/ redirects to /treatment-types/ */}
            <Route path="/treatment/dual-diagnosis" element={<Navigate to="/treatment-types/dual-diagnosis-treatment" replace />} />
            <Route path="/treatment/dual-diagnosis/:stateSlug" element={<DualDiagnosisStateRedirect />} />
            <Route path="/treatment/detox" element={<Navigate to="/treatment-types/detox-programs" replace />} />
            <Route path="/treatment/detox/:stateSlug" element={<DetoxStateRedirect />} />
            <Route path="/treatment/inpatient-rehab" element={<Navigate to="/treatment-types/residential-inpatient" replace />} />
            <Route path="/treatment/inpatient-rehab/:stateSlug" element={<InpatientStateRedirect />} />
            <Route path="/treatment/alcohol-rehab" element={<Navigate to="/treatment-types/alcohol-rehabilitation" replace />} />
            <Route path="/treatment/alcohol-rehab/:stateSlug" element={<AlcoholStateRedirect />} />

            {/* International Placement Routes */}
            <Route path="/international" element={<PublicRouteGuard><InternationalLanding /></PublicRouteGuard>} />
            <Route path="/international/apply" element={<PublicRouteGuard><InternationalApplication /></PublicRouteGuard>} />
            <Route path="/international/intake" element={<Navigate to="/international/apply" replace />} />
            <Route path="/international/thank-you" element={<PublicRouteGuard><InternationalThankYou /></PublicRouteGuard>} />
            <Route path="/placement-help" element={<Navigate to="/concierge" replace />} />
            
            {/* US Rehab - International SEO Landing Pages */}
            <Route path="/us-rehab" element={<PublicRouteGuard><USRehabHub /></PublicRouteGuard>} />
            <Route path="/us-rehab/best-rehab-usa" element={<PublicRouteGuard><BestRehabUSA /></PublicRouteGuard>} />
            <Route path="/us-rehab/luxury-rehab-america" element={<PublicRouteGuard><LuxuryRehabAmerica /></PublicRouteGuard>} />
            <Route path="/us-rehab/luxury-rehab-california" element={<PublicRouteGuard><LuxuryRehabCalifornia /></PublicRouteGuard>} />
            <Route path="/us-rehab/luxury-rehab-florida" element={<PublicRouteGuard><LuxuryRehabFlorida /></PublicRouteGuard>} />
            <Route path="/us-rehab/luxury-rehab-arizona" element={<PublicRouteGuard><LuxuryRehabArizona /></PublicRouteGuard>} />
            <Route path="/us-rehab/executive-rehab" element={<PublicRouteGuard><ExecutiveRehabUSA /></PublicRouteGuard>} />
            <Route path="/us-rehab/private-rehab-america" element={<PublicRouteGuard><PrivateRehabAmerica /></PublicRouteGuard>} />
            <Route path="/us-rehab/international-patients" element={<PublicRouteGuard><InternationalPatients /></PublicRouteGuard>} />
            <Route path="/us-rehab/malibu-rehab" element={<PublicRouteGuard><MalibuRehabCenters /></PublicRouteGuard>} />
            {/* Country-specific SEO pages */}
            <Route path="/us-rehab/uk-patients" element={<PublicRouteGuard><RehabUSAFromUK /></PublicRouteGuard>} />
            <Route path="/us-rehab/uae-middle-east" element={<PublicRouteGuard><RehabUSAFromUAE /></PublicRouteGuard>} />
            <Route path="/us-rehab/australian-patients" element={<PublicRouteGuard><RehabUSAFromAustralia /></PublicRouteGuard>} />
            <Route path="/us-rehab/canadian-patients" element={<PublicRouteGuard><RehabUSAFromCanada /></PublicRouteGuard>} />
            <Route path="/us-rehab/european-patients" element={<PublicRouteGuard><RehabUSAFromEurope /></PublicRouteGuard>} />
            {/* Treatment-specific SEO pages */}
            <Route path="/us-rehab/alcohol-rehab-usa" element={<PublicRouteGuard><AlcoholRehabUSA /></PublicRouteGuard>} />
            <Route path="/us-rehab/drug-rehab-usa" element={<PublicRouteGuard><DrugRehabUSA /></PublicRouteGuard>} />
            <Route path="/us-rehab/dual-diagnosis-usa" element={<PublicRouteGuard><DualDiagnosisUSA /></PublicRouteGuard>} />
            <Route path="/us-rehab/celebrity-rehab-usa" element={<PublicRouteGuard><CelebrityRehabUSA /></PublicRouteGuard>} />
            {/* High-intent international SEO pages */}
            <Route path="/travel-to-usa-for-rehab" element={<PublicRouteGuard><TravelToUSAForRehab /></PublicRouteGuard>} />
            <Route path="/cost-of-rehab-in-usa-for-international-patients" element={<PublicRouteGuard><CostOfRehabUSA /></PublicRouteGuard>} />
            <Route path="/can-foreigners-go-to-rehab-in-usa" element={<PublicRouteGuard><ForeignersRehabUSA /></PublicRouteGuard>} />
            <Route path="/paying-for-rehab-in-usa-without-insurance" element={<PublicRouteGuard><PayingForRehabUSANoInsurance /></PublicRouteGuard>} />
            <Route path="/affordable-rehab-in-usa" element={<PublicRouteGuard><AffordableRehabUSA /></PublicRouteGuard>} />
            <Route path="/fast-admission-rehab-usa" element={<PublicRouteGuard><FastAdmissionRehabUSA /></PublicRouteGuard>} />
            <Route path="/same-day-detox-usa" element={<PublicRouteGuard><SameDayDetoxUSA /></PublicRouteGuard>} />
            <Route path="/top-detox-centers-usa" element={<PublicRouteGuard><TopDetoxCentersUSA /></PublicRouteGuard>} />
            {/* SEO redirect routes - alternate URLs to existing pages */}
            <Route path="/rehab-in-usa-for-canadians" element={<Navigate to="/us-rehab/canadian-patients" replace />} />
            <Route path="/rehab-in-usa-for-uk-patients" element={<Navigate to="/us-rehab/uk-patients" replace />} />
            <Route path="/rehab-in-usa-for-international-patients" element={<Navigate to="/international" replace />} />
            <Route path="/best-rehab-centers-in-usa-for-foreigners" element={<Navigate to="/can-foreigners-go-to-rehab-in-usa" replace />} />
            <Route path="/best-rehab-centers-in-usa" element={<Navigate to="/us-rehab/best-rehab-usa" replace />} />
            <Route path="/luxury-rehab-centers-usa" element={<Navigate to="/us-rehab/luxury-rehab-america" replace />} />
            <Route path="/private-rehab-usa" element={<Navigate to="/us-rehab/private-rehab-america" replace />} />
            <Route path="/confidential-rehab-usa" element={<Navigate to="/us-rehab/private-rehab-america" replace />} />
            
            {/* Treatment center profile pages */}
            <Route path="/treatment-centers/:slug" element={<PublicRouteGuard><TreatmentCenterProfile /></PublicRouteGuard>} />
            
            {/* Legacy center URLs redirect */}
            <Route path="/centers/:slug" element={<LegacyCenterRedirect />} />
            
            {/* Ad Landing Pages */}
            <Route path="/ads/:slug" element={<PublicRouteGuard><AdLanding /></PublicRouteGuard>} />
            <Route path="/go/:slug" element={<PublicRouteGuard><SocialLanding /></PublicRouteGuard>} />
            
            {/* Static Pages */}
            <Route path="/how-it-works" element={<PublicRouteGuard><HowItWorks /></PublicRouteGuard>} />
            <Route path="/resources" element={<PublicRouteGuard><Resources /></PublicRouteGuard>} />
            <Route path="/resources/:id" element={<PublicRouteGuard><ArticleDetail /></PublicRouteGuard>} />
            <Route path="/blog" element={<Navigate to="/resources" replace />} />
            <Route path="/blog/:id" element={<BlogRedirect />} />
            <Route path="/insurance" element={<PublicRouteGuard><Insurance /></PublicRouteGuard>} />
            {/* Insurance short URLs → redirect to canonical */}
            <Route path="/insurance/aetna" element={<Navigate to="/insurance/aetna-rehab" replace />} />
            <Route path="/insurance/bcbs" element={<Navigate to="/insurance/bcbs-treatment" replace />} />
            <Route path="/insurance/cigna" element={<Navigate to="/insurance/cigna-rehab" replace />} />
            <Route path="/insurance/united-healthcare" element={<Navigate to="/insurance/united-healthcare-rehab" replace />} />
            <Route path="/insurance/humana" element={<Navigate to="/insurance/humana-rehab" replace />} />
            <Route path="/insurance/kaiser" element={<Navigate to="/insurance/kaiser-rehab" replace />} />
            <Route path="/insurance/medicare" element={<Navigate to="/insurance/medicare-rehab" replace />} />
            <Route path="/insurance/medicaid" element={<Navigate to="/insurance/medicaid-rehab" replace />} />
            <Route path="/insurance/anthem" element={<Navigate to="/insurance/anthem-rehab" replace />} />
            {/* Insurance Routes - Canonical URLs (for internal links) */}
            <Route path="/insurance/aetna-rehab" element={<PublicRouteGuard><AetnaRehab /></PublicRouteGuard>} />
            <Route path="/insurance/bcbs-treatment" element={<PublicRouteGuard><BCBSTreatment /></PublicRouteGuard>} />
            <Route path="/insurance/cigna-rehab" element={<PublicRouteGuard><CignaRehab /></PublicRouteGuard>} />
            <Route path="/insurance/united-healthcare-rehab" element={<PublicRouteGuard><UnitedHealthcareRehab /></PublicRouteGuard>} />
            <Route path="/insurance/humana-rehab" element={<PublicRouteGuard><HumanaRehab /></PublicRouteGuard>} />
            <Route path="/insurance/kaiser-rehab" element={<PublicRouteGuard><KaiserRehab /></PublicRouteGuard>} />
            <Route path="/insurance/medicare-rehab" element={<PublicRouteGuard><MedicareRehab /></PublicRouteGuard>} />
            <Route path="/insurance/medicaid-rehab" element={<PublicRouteGuard><MedicaidRehab /></PublicRouteGuard>} />
            <Route path="/insurance/anthem-rehab" element={<PublicRouteGuard><AnthemRehab /></PublicRouteGuard>} />
            <Route path="/insurance/tricare-rehab" element={<PublicRouteGuard><TricareRehab /></PublicRouteGuard>} />
            <Route path="/insurance/molina-rehab" element={<PublicRouteGuard><MolinaRehab /></PublicRouteGuard>} />
            <Route path="/insurance/magellan-rehab" element={<PublicRouteGuard><MagellanRehab /></PublicRouteGuard>} />
            <Route path="/insurance/wellcare-rehab" element={<PublicRouteGuard><WellCareRehab /></PublicRouteGuard>} />
            <Route path="/insurance/ambetter-rehab" element={<PublicRouteGuard><AmbetterRehab /></PublicRouteGuard>} />
            <Route path="/insurance/oscar-rehab" element={<PublicRouteGuard><OscarRehab /></PublicRouteGuard>} />
            <Route path="/insurance/highmark-rehab" element={<PublicRouteGuard><HighmarkRehab /></PublicRouteGuard>} />
            <Route path="/cost-estimator" element={<PublicRouteGuard><CostEstimator /></PublicRouteGuard>} />
            <Route path="/faq" element={<PublicRouteGuard><FAQ /></PublicRouteGuard>} />
            <Route path="/about" element={<PublicRouteGuard><About /></PublicRouteGuard>} />
            <Route path="/contact" element={<PublicRouteGuard><Contact /></PublicRouteGuard>} />
            <Route path="/privacy-policy" element={<PublicRouteGuard><PrivacyPolicy /></PublicRouteGuard>} />
            <Route path="/terms-of-service" element={<PublicRouteGuard><TermsOfService /></PublicRouteGuard>} />
            <Route path="/editorial-policy" element={<PublicRouteGuard><EditorialPolicy /></PublicRouteGuard>} />
            <Route path="/medical-disclaimer" element={<PublicRouteGuard><MedicalDisclaimer /></PublicRouteGuard>} />
            
            {/* Seeker Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/seeker/signup" element={<SeekerSignup />} />
            <Route path="/signup" element={<Navigate to="/seeker/signup" replace />} />
            <Route path="/seeker/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password" element={<Navigate to="/seeker/reset-password" replace />} />
            <Route path="/provider-reset-password" element={<Navigate to="/provider/reset-password" replace />} />
            
            {/* Seeker Panel - /account is canonical */}
            <Route path="/account" element={<SeekerShell />}>
              <Route index element={<SeekerHome />} />
              <Route path="requests" element={<SeekerRequests />} />
              <Route path="saved" element={<SeekerSaved />} />
              <Route path="reviews" element={<SeekerReviews />} />
              <Route path="settings" element={<SeekerSettings />} />
              <Route path="notifications" element={<SeekerNotifications />} />
              <Route path="notification-preferences" element={<SeekerNotificationPreferences />} />
              <Route path="facility/:facilityId" element={<SeekerFacilityProfile />} />
              <Route path="search" element={<SeekerSearch />} />
              <Route path="help" element={<SeekerHelp />} />
              <Route path="concierge" element={<SeekerConcierge />} />
              <Route path="concierge/:inquiryId" element={<SeekerConcierge />} />
              <Route path="international" element={<SeekerInternationalCase />} />
              <Route path="*" element={<Navigate to="/account" replace />} />
            </Route>
            
            {/* Legacy /my-account redirect */}
            <Route path="/my-account/*" element={<Navigate to="/account" replace />} />
            
            {/* Provider Routes */}
            <Route path="/for-providers" element={<PublicRouteGuard><ForProviders /></PublicRouteGuard>} />
            <Route path="/provider-resources" element={<PublicRouteGuard><ProviderResources /></PublicRouteGuard>} />
            <Route path="/provider-signup" element={<ProviderSignup />} />
            <Route path="/provider-roi-calculator" element={<PublicRouteGuard><ProviderROICalculator /></PublicRouteGuard>} />
            <Route path="/provider-login" element={<Navigate to="/login" replace />} />
            <Route path="/provider-faq" element={<ProviderFAQ />} />
            <Route path="/provider-support" element={<ProviderSupport />} />
            <Route path="/provider/login" element={<Navigate to="/login" replace />} />
            <Route path="/provider/forgot-password" element={<ProviderForgotPassword />} />
            <Route path="/provider/reset-password" element={<ProviderResetPassword />} />
            <Route path="/provider/support" element={<Navigate to="/provider-support" replace />} />
            <Route path="/provider/faq" element={<Navigate to="/provider-faq" replace />} />
            <Route path="/provider/signup" element={<Navigate to="/provider-signup" replace />} />
            
            {/* Provider SEO Pages */}
            <Route path="/provider-guides/get-more-rehab-patients" element={<PublicRouteGuard><GetMoreRehabPatients /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-admissions-growth" element={<PublicRouteGuard><RehabAdmissionsGrowth /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-marketing-strategies" element={<PublicRouteGuard><RehabMarketingStrategies /></PublicRouteGuard>} />
            <Route path="/provider-guides/addiction-treatment-lead-generation" element={<PublicRouteGuard><AddictionTreatmentLeadGeneration /></PublicRouteGuard>} />
            <Route path="/provider-guides/increase-rehab-admissions" element={<PublicRouteGuard><IncreaseRehabAdmissions /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-marketing-ideas" element={<PublicRouteGuard><RehabCenterMarketingIdeas /></PublicRouteGuard>} />
            <Route path="/provider-guides/treatment-center-patient-acquisition" element={<PublicRouteGuard><TreatmentCenterPatientAcquisition /></PublicRouteGuard>} />
            <Route path="/provider-guides/behavioral-health-lead-generation" element={<PublicRouteGuard><BehavioralHealthLeadGeneration /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-seo" element={<PublicRouteGuard><RehabCenterSEO /></PublicRouteGuard>} />
            <Route path="/provider-guides/drug-rehab-advertising" element={<PublicRouteGuard><DrugRehabAdvertising /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-census-management" element={<PublicRouteGuard><RehabCensusManagement /></PublicRouteGuard>} />
            <Route path="/provider-guides/treatment-center-referral-sources" element={<PublicRouteGuard><TreatmentCenterReferralSources /></PublicRouteGuard>} />
            <Route path="/provider-guides/how-to-open-a-rehab-center" element={<PublicRouteGuard><HowToOpenRehabCenter /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-insurance-verification" element={<PublicRouteGuard><RehabInsuranceVerification /></PublicRouteGuard>} />
            <Route path="/provider-guides/iop-marketing-strategies" element={<PublicRouteGuard><IOPMarketingStrategies /></PublicRouteGuard>} />
            <Route path="/provider-guides/detox-center-marketing" element={<PublicRouteGuard><DetoxCenterMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/sober-living-marketing" element={<PublicRouteGuard><SoberLivingMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-reputation-management" element={<PublicRouteGuard><RehabReputationManagement /></PublicRouteGuard>} />
            <Route path="/provider-guides/treatment-center-staffing-guide" element={<PublicRouteGuard><RehabStaffingGuide /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-accreditation-guide" element={<PublicRouteGuard><RehabAccreditationGuide /></PublicRouteGuard>} />
            <Route path="/provider-guides/substance-abuse-treatment-marketing" element={<PublicRouteGuard><SubstanceAbuseTreatmentMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/mat-clinic-marketing" element={<PublicRouteGuard><MATClinicMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/treatment-center-website-design" element={<PublicRouteGuard><TreatmentCenterWebsiteDesign /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-compliance-guide" element={<PublicRouteGuard><RehabComplianceGuide /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-google-business-profile" element={<PublicRouteGuard><RehabGoogleBusinessProfile /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-patient-retention" element={<PublicRouteGuard><RehabPatientRetention /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-email-marketing" element={<PublicRouteGuard><RehabEmailMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/telehealth-addiction-treatment" element={<PublicRouteGuard><TelehealthAddictionTreatment /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-social-media-marketing" element={<PublicRouteGuard><RehabSocialMediaMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/dual-diagnosis-treatment-marketing" element={<PublicRouteGuard><DualDiagnosisTreatmentMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-admissions-team-training" element={<PublicRouteGuard><RehabAdmissionsTeamTraining /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-pay-per-click-advertising" element={<PublicRouteGuard><RehabPayPerClickAdvertising /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-content-marketing" element={<PublicRouteGuard><RehabContentMarketing /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-interventionist-partnerships" element={<PublicRouteGuard><RehabInterventionistPartnerships /></PublicRouteGuard>} />
            <Route path="/provider-guides/best-rehab-listing-platforms" element={<PublicRouteGuard><BestRehabListingPlatforms /></PublicRouteGuard>} />
            <Route path="/provider-guides/exclusive-vs-shared-leads" element={<PublicRouteGuard><ExclusiveVsSharedLeads /></PublicRouteGuard>} />
            <Route path="/provider-guides/how-to-choose-a-rehab-directory" element={<PublicRouteGuard><HowToChooseRehabDirectory /></PublicRouteGuard>} />
            {/* List Your Facility routes handled by SmartCatchAll below */}

            {/* Rehab Marketing Hub */}
            <Route path="/rehab-marketing" element={<PublicRouteGuard><RehabMarketingHub /></PublicRouteGuard>} />
            <Route path="/rehab-marketing/:stateSlug/county/:countySlug/insurance/:insurerSlug" element={<PublicRouteGuard><CountyInsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/rehab-marketing/:stateSlug/county/:countySlug/:treatmentSlug" element={<PublicRouteGuard><CountyTreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/rehab-marketing/:stateSlug/county/:countySlug" element={<PublicRouteGuard><CountyProviderPage /></PublicRouteGuard>} />
            <Route path="/rehab-marketing/:stateSlug/insurance/:insurerSlug" element={<PublicRouteGuard><StateInsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/rehab-marketing/:stateSlug/:treatmentSlug" element={<PublicRouteGuard><StateTreatmentProviderPage /></PublicRouteGuard>} />

            {/* Treatment-Specific Provider Conversion Pages */}
            <Route path="/provider-guides/get-more-detox-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-residential-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-iop-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-php-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-sober-living-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-mat-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-luxury-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-dual-diagnosis-patients" element={<PublicRouteGuard><TreatmentProviderPage /></PublicRouteGuard>} />

            {/* Insurance-Specific Provider Conversion Pages */}
            <Route path="/provider-guides/get-more-medicaid-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-medicare-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-blue-cross-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-aetna-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-cigna-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/get-more-united-healthcare-patients" element={<PublicRouteGuard><InsuranceProviderPage /></PublicRouteGuard>} />

            {/* Provider Comparison Pages */}
            <Route path="/provider-guides/google-ads-vs-rehab-directories" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/best-rehab-marketing-platforms-2026" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/is-psychology-today-worth-it-for-rehab" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/facebook-ads-vs-seo-for-treatment-centers" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-lead-generation-paid-vs-organic" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehabs-com-vs-rehablookup" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/samhsa-vs-private-rehab-directories" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/call-centers-vs-directories-for-rehab-leads" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-seo-agency-vs-directory-listing" element={<PublicRouteGuard><ProviderComparisonPage /></PublicRouteGuard>} />

            {/* Provider Persona Pages (by facility type) */}
            <Route path="/provider-guides/small-rehab-center-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/new-rehab-facility-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/faith-based-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/veterans-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/womens-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/executive-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/telehealth-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/court-ordered-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/adolescent-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/couples-rehab-marketing" element={<PublicRouteGuard><ProviderPersonaPage /></PublicRouteGuard>} />

            {/* Provider Pain Point Pages */}
            <Route path="/provider-guides/why-your-rehab-center-isnt-getting-patients" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/reduce-empty-beds-rehab" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-google-ads-not-working" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-admissions-dropping" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-referral-sources-drying-up" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/list-your-rehab-center-online-free" element={<PublicRouteGuard><ProviderPainPointPage /></PublicRouteGuard>} />

            {/* Provider Business Strategy Pages */}
            <Route path="/provider-guides/increase-rehab-facility-valuation" element={<PublicRouteGuard><ProviderBusinessPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-private-equity-investment" element={<PublicRouteGuard><ProviderBusinessPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/multi-location-rehab-growth" element={<PublicRouteGuard><ProviderBusinessPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-cash-pay-patient-marketing" element={<PublicRouteGuard><ProviderBusinessPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-revenue-diversification" element={<PublicRouteGuard><ProviderBusinessPage /></PublicRouteGuard>} />

            {/* Provider Operations Pages */}
            <Route path="/provider-guides/rehab-insurance-denial-management" element={<PublicRouteGuard><ProviderOperationsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/reduce-rehab-patient-no-shows" element={<PublicRouteGuard><ProviderOperationsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-alumni-program-referrals" element={<PublicRouteGuard><ProviderOperationsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-hospital-community-partnerships" element={<PublicRouteGuard><ProviderOperationsPage /></PublicRouteGuard>} />

            {/* Provider Niche Population Pages */}
            <Route path="/provider-guides/spanish-speaking-rehab-marketing" element={<PublicRouteGuard><ProviderNichePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/lgbtq-affirming-rehab-marketing" element={<PublicRouteGuard><ProviderNichePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/first-responder-rehab-marketing" element={<PublicRouteGuard><ProviderNichePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/healthcare-professional-rehab-marketing" element={<PublicRouteGuard><ProviderNichePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/native-american-tribal-rehab-marketing" element={<PublicRouteGuard><ProviderNichePage /></PublicRouteGuard>} />

            {/* Provider Growth & Expansion Pages */}
            <Route path="/provider-guides/rehab-outpatient-program-expansion" element={<PublicRouteGuard><ProviderGrowthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-branding-differentiation" element={<PublicRouteGuard><ProviderGrowthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-medicaid-expansion-strategy" element={<PublicRouteGuard><ProviderGrowthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-crisis-stabilization-marketing" element={<PublicRouteGuard><ProviderGrowthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-family-program-marketing" element={<PublicRouteGuard><ProviderGrowthPage /></PublicRouteGuard>} />

            {/* Provider Industry & Trends Pages */}
            <Route path="/provider-guides/rehab-telehealth-competition-strategy" element={<PublicRouteGuard><ProviderIndustryPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-workforce-shortage-solutions" element={<PublicRouteGuard><ProviderIndustryPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-joint-commission-marketing" element={<PublicRouteGuard><ProviderIndustryPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-aftercare-continuum-marketing" element={<PublicRouteGuard><ProviderIndustryPage /></PublicRouteGuard>} />

            {/* Provider Digital Marketing Pages */}
            <Route path="/provider-guides/rehab-online-reviews-strategy" element={<PublicRouteGuard><ProviderDigitalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-local-seo-domination" element={<PublicRouteGuard><ProviderDigitalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-video-marketing-strategy" element={<PublicRouteGuard><ProviderDigitalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-conversion-rate-optimization" element={<PublicRouteGuard><ProviderDigitalPage /></PublicRouteGuard>} />

            {/* Provider Finance & Funding Pages */}
            <Route path="/provider-guides/rehab-billing-revenue-cycle" element={<PublicRouteGuard><ProviderFinancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-grant-funding-opportunities" element={<PublicRouteGuard><ProviderFinancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-data-analytics-growth" element={<PublicRouteGuard><ProviderFinancePage /></PublicRouteGuard>} />

            {/* Provider High-Keyword Pages */}
            <Route path="/provider-guides/addiction-treatment-center-marketing" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/drug-rehab-marketing-strategy" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/alcohol-rehab-marketing-guide" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/inpatient-rehab-marketing" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/detox-center-patient-acquisition" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/iop-program-marketing" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/mental-health-rehab-marketing" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-near-me-ranking-strategy" element={<PublicRouteGuard><ProviderHighKeywordPage /></PublicRouteGuard>} />

            {/* Provider Compliance & Regulation Pages */}
            <Route path="/provider-guides/rehab-hipaa-compliance-marketing" element={<PublicRouteGuard><ProviderCompliancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-42-cfr-part-2-compliance" element={<PublicRouteGuard><ProviderCompliancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-legitscript-certification-guide" element={<PublicRouteGuard><ProviderCompliancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-state-licensing-requirements" element={<PublicRouteGuard><ProviderCompliancePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-joint-commission-accreditation" element={<PublicRouteGuard><ProviderCompliancePage /></PublicRouteGuard>} />

            {/* Provider Revenue & Reimbursement Pages */}
            <Route path="/provider-guides/rehab-insurance-reimbursement-optimization" element={<PublicRouteGuard><ProviderRevenuePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-private-pay-revenue-strategies" element={<PublicRouteGuard><ProviderRevenuePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-medicaid-reimbursement-guide" element={<PublicRouteGuard><ProviderRevenuePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-utilization-review-optimization" element={<PublicRouteGuard><ProviderRevenuePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-value-based-care-transition" element={<PublicRouteGuard><ProviderRevenuePage /></PublicRouteGuard>} />

            {/* Provider Facility Type Marketing Pages */}
            <Route path="/provider-guides/luxury-rehab-center-marketing" element={<PublicRouteGuard><ProviderFacilityTypePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/faith-based-rehab-growth-strategies" element={<PublicRouteGuard><ProviderFacilityTypePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/sober-living-home-marketing" element={<PublicRouteGuard><ProviderFacilityTypePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/mat-clinic-patient-acquisition" element={<PublicRouteGuard><ProviderFacilityTypePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/adolescent-treatment-center-marketing" element={<PublicRouteGuard><ProviderFacilityTypePage /></PublicRouteGuard>} />

            {/* Provider Technology & Systems Pages */}
            <Route path="/provider-guides/rehab-ehr-software-guide" element={<PublicRouteGuard><ProviderTechnologyPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-crm-patient-management" element={<PublicRouteGuard><ProviderTechnologyPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-intake-automation" element={<PublicRouteGuard><ProviderTechnologyPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-website-conversion-optimization" element={<PublicRouteGuard><ProviderTechnologyPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-call-tracking-analytics" element={<PublicRouteGuard><ProviderTechnologyPage /></PublicRouteGuard>} />

            {/* Provider Startup & Expansion Pages */}
            <Route path="/provider-guides/how-to-start-outpatient-rehab-center" element={<PublicRouteGuard><ProviderStartupPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-facility-acquisition-guide" element={<PublicRouteGuard><ProviderStartupPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-market-analysis-new-location" element={<PublicRouteGuard><ProviderStartupPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-franchise-opportunities" element={<PublicRouteGuard><ProviderStartupPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-construction-design-guide" element={<PublicRouteGuard><ProviderStartupPage /></PublicRouteGuard>} />

            {/* Provider Clinical Operations Pages */}
            <Route path="/provider-guides/rehab-evidence-based-program-development" element={<PublicRouteGuard><ProviderClinicalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-outcomes-measurement-reporting" element={<PublicRouteGuard><ProviderClinicalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-clinical-staff-recruitment" element={<PublicRouteGuard><ProviderClinicalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-group-therapy-programming" element={<PublicRouteGuard><ProviderClinicalPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-family-program-development" element={<PublicRouteGuard><ProviderClinicalPage /></PublicRouteGuard>} />

            {/* Provider Payer Relations & Contracting Pages */}
            <Route path="/provider-guides/rehab-insurance-credentialing-guide" element={<PublicRouteGuard><ProviderPayerPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-payer-contract-negotiation" element={<PublicRouteGuard><ProviderPayerPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-single-case-agreement-strategy" element={<PublicRouteGuard><ProviderPayerPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-network-adequacy-strategy" element={<PublicRouteGuard><ProviderPayerPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-out-of-network-billing-strategy" element={<PublicRouteGuard><ProviderPayerPage /></PublicRouteGuard>} />

            {/* Provider Risk Management & Legal Pages */}
            <Route path="/provider-guides/rehab-malpractice-liability-prevention" element={<PublicRouteGuard><ProviderRiskPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-patient-safety-protocols" element={<PublicRouteGuard><ProviderRiskPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-insurance-audit-preparation" element={<PublicRouteGuard><ProviderRiskPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-employment-law-compliance" element={<PublicRouteGuard><ProviderRiskPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-crisis-management-plan" element={<PublicRouteGuard><ProviderRiskPage /></PublicRouteGuard>} />

            {/* Provider Community & Referral Partnerships Pages */}
            <Route path="/provider-guides/rehab-physician-referral-network" element={<PublicRouteGuard><ProviderPartnershipsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-hospital-er-partnership" element={<PublicRouteGuard><ProviderPartnershipsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-court-criminal-justice-referrals" element={<PublicRouteGuard><ProviderPartnershipsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-employer-eap-partnerships" element={<PublicRouteGuard><ProviderPartnershipsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-alumni-referral-program" element={<PublicRouteGuard><ProviderPartnershipsPage /></PublicRouteGuard>} />

            {/* Provider Staffing & Workforce Pages */}
            <Route path="/provider-guides/rehab-staff-recruitment-strategies" element={<PublicRouteGuard><ProviderStaffingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-employee-retention-programs" element={<PublicRouteGuard><ProviderStaffingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-staff-credentialing-guide" element={<PublicRouteGuard><ProviderStaffingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-burnout-prevention-programs" element={<PublicRouteGuard><ProviderStaffingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-staff-training-development" element={<PublicRouteGuard><ProviderStaffingPage /></PublicRouteGuard>} />

            {/* Provider Marketing Channel Pages */}
            <Route path="/provider-guides/rehab-seo-marketing-strategy" element={<PublicRouteGuard><ProviderMarketingChannelPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-ppc-advertising-guide" element={<PublicRouteGuard><ProviderMarketingChannelPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-social-media-marketing-strategy" element={<PublicRouteGuard><ProviderMarketingChannelPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-content-marketing-strategy" element={<PublicRouteGuard><ProviderMarketingChannelPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-reputation-management-guide" element={<PublicRouteGuard><ProviderMarketingChannelPage /></PublicRouteGuard>} />

            {/* Provider Patient Experience Pages */}
            <Route path="/provider-guides/rehab-intake-optimization-guide" element={<PublicRouteGuard><ProviderPatientExperiencePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-family-engagement-programs" element={<PublicRouteGuard><ProviderPatientExperiencePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-aftercare-planning-programs" element={<PublicRouteGuard><ProviderPatientExperiencePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-patient-satisfaction-measurement" element={<PublicRouteGuard><ProviderPatientExperiencePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-discharge-planning-best-practices" element={<PublicRouteGuard><ProviderPatientExperiencePage /></PublicRouteGuard>} />

            {/* Provider Telehealth & Virtual Care Pages */}
            <Route path="/provider-guides/rehab-telehealth-program-launch" element={<PublicRouteGuard><ProviderTelehealthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-virtual-iop-program-guide" element={<PublicRouteGuard><ProviderTelehealthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-remote-patient-monitoring" element={<PublicRouteGuard><ProviderTelehealthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-hybrid-treatment-model" element={<PublicRouteGuard><ProviderTelehealthPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-telebehavioral-health-compliance" element={<PublicRouteGuard><ProviderTelehealthPage /></PublicRouteGuard>} />

            {/* Provider Data & Analytics Pages */}
            <Route path="/provider-guides/rehab-census-forecasting-tools" element={<PublicRouteGuard><ProviderDataAnalyticsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-kpi-dashboard-guide" element={<PublicRouteGuard><ProviderDataAnalyticsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-outcome-reporting-systems" element={<PublicRouteGuard><ProviderDataAnalyticsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-payer-analytics-reporting" element={<PublicRouteGuard><ProviderDataAnalyticsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-marketing-attribution-guide" element={<PublicRouteGuard><ProviderDataAnalyticsPage /></PublicRouteGuard>} />

            {/* Provider Accreditation & Quality Pages */}
            <Route path="/provider-guides/rehab-carf-accreditation-preparation" element={<PublicRouteGuard><ProviderAccreditationPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-joint-commission-readiness" element={<PublicRouteGuard><ProviderAccreditationPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-state-licensing-survey-preparation" element={<PublicRouteGuard><ProviderAccreditationPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-quality-improvement-programs" element={<PublicRouteGuard><ProviderAccreditationPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-peer-review-clinical-governance" element={<PublicRouteGuard><ProviderAccreditationPage /></PublicRouteGuard>} />

            {/* Provider Insurance & Billing Operations Pages */}
            <Route path="/provider-guides/rehab-claim-denial-management" element={<PublicRouteGuard><ProviderBillingOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-prior-authorization-optimization" element={<PublicRouteGuard><ProviderBillingOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-billing-compliance-guide" element={<PublicRouteGuard><ProviderBillingOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-revenue-cycle-management" element={<PublicRouteGuard><ProviderBillingOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-out-of-network-billing-strategies" element={<PublicRouteGuard><ProviderBillingOpsPage /></PublicRouteGuard>} />

            {/* Provider Facility Design & Environment Pages */}
            <Route path="/provider-guides/rehab-therapeutic-environment-design" element={<PublicRouteGuard><ProviderFacilityDesignPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-ada-accessibility-compliance" element={<PublicRouteGuard><ProviderFacilityDesignPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-safety-design-standards" element={<PublicRouteGuard><ProviderFacilityDesignPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-amenity-planning-guide" element={<PublicRouteGuard><ProviderFacilityDesignPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-outdoor-recreation-programming" element={<PublicRouteGuard><ProviderFacilityDesignPage /></PublicRouteGuard>} />

            {/* Provider Crisis & Emergency Preparedness Pages */}
            <Route path="/provider-guides/rehab-overdose-response-protocols" element={<PublicRouteGuard><ProviderCrisisPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-disaster-preparedness-planning" element={<PublicRouteGuard><ProviderCrisisPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-workplace-violence-prevention" element={<PublicRouteGuard><ProviderCrisisPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-pandemic-response-planning" element={<PublicRouteGuard><ProviderCrisisPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-behavioral-emergency-management" element={<PublicRouteGuard><ProviderCrisisPage /></PublicRouteGuard>} />


            {/* Provider Funding & Investment Pages */}
            <Route path="/provider-guides/samhsa-grant-funding-rehab-center" element={<PublicRouteGuard><ProviderFundingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/sba-loans-rehab-center-financing" element={<PublicRouteGuard><ProviderFundingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-private-equity-investment" element={<PublicRouteGuard><ProviderFundingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-for-sale-ma-guide" element={<PublicRouteGuard><ProviderFundingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/opioid-settlement-funding-treatment-centers" element={<PublicRouteGuard><ProviderFundingPage /></PublicRouteGuard>} />

            {/* Provider Licensing & Certification Pages */}
            <Route path="/provider-guides/legitscript-certification-rehab" element={<PublicRouteGuard><ProviderLicensingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/carf-vs-joint-commission-rehab-accreditation" element={<PublicRouteGuard><ProviderLicensingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/state-licensing-requirements-rehab-center" element={<PublicRouteGuard><ProviderLicensingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/hipaa-compliance-rehab-center-guide" element={<PublicRouteGuard><ProviderLicensingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/medicare-certification-rehab-center" element={<PublicRouteGuard><ProviderLicensingPage /></PublicRouteGuard>} />

            {/* Provider Benchmarks & Industry Pages */}
            <Route path="/provider-guides/rehab-center-profitability-benchmarks" element={<PublicRouteGuard><ProviderBenchmarkPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-kpi-dashboard-metrics" element={<PublicRouteGuard><ProviderBenchmarkPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/addiction-treatment-industry-trends-2026" element={<PublicRouteGuard><ProviderBenchmarkPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-admissions-call-center-training" element={<PublicRouteGuard><ProviderBenchmarkPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-competitor-analysis-framework" element={<PublicRouteGuard><ProviderBenchmarkPage /></PublicRouteGuard>} />

            {/* Provider Outreach & Referral Pages */}
            <Route path="/provider-guides/how-to-get-referrals-rehab-center" element={<PublicRouteGuard><ProviderOutreachPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-community-outreach-strategy" element={<PublicRouteGuard><ProviderOutreachPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-interventionist-referral-partnerships" element={<PublicRouteGuard><ProviderOutreachPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-google-reviews-strategy" element={<PublicRouteGuard><ProviderOutreachPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/how-to-fill-beds-rehab-center" element={<PublicRouteGuard><ProviderOutreachPage /></PublicRouteGuard>} />

            {/* Provider Entrepreneur & Startup Pages */}
            <Route path="/provider-guides/how-to-open-drug-rehab-center" element={<PublicRouteGuard><ProviderEntrepreneurPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-business-plan-template" element={<PublicRouteGuard><ProviderEntrepreneurPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/how-to-start-sober-living-home" element={<PublicRouteGuard><ProviderEntrepreneurPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/how-to-start-mat-clinic" element={<PublicRouteGuard><ProviderEntrepreneurPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-succession-planning" element={<PublicRouteGuard><ProviderEntrepreneurPage /></PublicRouteGuard>} />

            {/* Provider Specialized Market Pages */}
            <Route path="/provider-guides/tricare-va-rehab-certification" element={<PublicRouteGuard><ProviderSpecializedMarketPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/managed-care-contracting-rehab" element={<PublicRouteGuard><ProviderSpecializedMarketPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/treatment-center-business-development" element={<PublicRouteGuard><ProviderSpecializedMarketPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-quality-reporting-hedis" element={<PublicRouteGuard><ProviderSpecializedMarketPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-dei-cultural-competency" element={<PublicRouteGuard><ProviderSpecializedMarketPage /></PublicRouteGuard>} />

            {/* Provider Insurance Operations Pages */}
            <Route path="/provider-guides/how-to-bill-suboxone-mat-treatment" element={<PublicRouteGuard><ProviderInsuranceOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-out-of-network-reimbursement-guide" element={<PublicRouteGuard><ProviderInsuranceOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-workers-compensation-treatment" element={<PublicRouteGuard><ProviderInsuranceOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-student-athlete-treatment-programs" element={<PublicRouteGuard><ProviderInsuranceOpsPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-center-joint-venture-partnerships" element={<PublicRouteGuard><ProviderInsuranceOpsPage /></PublicRouteGuard>} />

            {/* Provider Workforce & Clinical Development Pages */}
            <Route path="/provider-guides/how-to-hire-clinical-director-rehab" element={<PublicRouteGuard><ProviderWorkforcePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-counselor-recruitment-retention" element={<PublicRouteGuard><ProviderWorkforcePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-group-therapy-curriculum-development" element={<PublicRouteGuard><ProviderWorkforcePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-trauma-informed-care-implementation" element={<PublicRouteGuard><ProviderWorkforcePage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-continuing-education-staff-development" element={<PublicRouteGuard><ProviderWorkforcePage /></PublicRouteGuard>} />

            {/* Provider Government & Contract Pages */}
            <Route path="/provider-guides/va-community-care-provider-rehab" element={<PublicRouteGuard><ProviderGovContractPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/medicaid-rehab-billing-reimbursement" element={<PublicRouteGuard><ProviderGovContractPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/drug-court-referral-partnerships-rehab" element={<PublicRouteGuard><ProviderGovContractPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/state-block-grant-funding-rehab" element={<PublicRouteGuard><ProviderGovContractPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/eap-corporate-wellness-rehab-partnerships" element={<PublicRouteGuard><ProviderGovContractPage /></PublicRouteGuard>} />

            {/* Provider Branding & Reputation Pages */}
            <Route path="/provider-guides/rehab-reputation-crisis-management" element={<PublicRouteGuard><ProviderBrandingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-social-media-content-strategy" element={<PublicRouteGuard><ProviderBrandingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-google-business-profile-optimization" element={<PublicRouteGuard><ProviderBrandingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-public-relations-media-strategy" element={<PublicRouteGuard><ProviderBrandingPage /></PublicRouteGuard>} />
            <Route path="/provider-guides/rehab-video-testimonial-production" element={<PublicRouteGuard><ProviderBrandingPage /></PublicRouteGuard>} />

            {/* Provider Resource Hub */}
            <Route path="/providers/resources" element={<PublicRouteGuard><ProviderResourceHub /></PublicRouteGuard>} />
            <Route path="/providers/resources/:slug" element={<PublicRouteGuard><ProviderResourceArticle /></PublicRouteGuard>} />

            {/* Provider Panel Routes */}
            <Route path="/provider" element={<ProviderShell />}>
              <Route index element={<Navigate to="/provider/dashboard" replace />} />
              <Route path="dashboard" element={<ProviderDashboardPage />} />
              <Route path="listings" element={<ProviderListingPage />} />
              <Route path="listing" element={<Navigate to="/provider/listings" replace />} />
              <Route path="add-location" element={<ProviderAddLocation />} />
              <Route path="inquiries" element={<ProviderInquiriesPage />} />
              <Route path="reviews" element={<ProviderReviewsPage />} />
              <Route path="analytics" element={<ProviderAnalyticsPage />} />
              <Route path="credits" element={<Navigate to="/provider/billing?purchase_credits=true" replace />} />
              <Route path="pro-upgrade" element={<ProviderProUpgradePage />} />
              <Route path="billing" element={<ProviderBillingPage />} />
              <Route path="settings" element={<ProviderSettingsPage />} />
              <Route path="embed-badge" element={<ProviderEmbedBadgePage />} />
              <Route path="notifications" element={<ProviderNotificationsPage />} />
              <Route path="help" element={<ProviderHelpPage />} />
              <Route path="knowledge-base" element={<ProviderKnowledgeBasePage />} />
              <Route path="image-guidelines" element={<ProviderImageGuidelines />} />
              <Route path="placement-network" element={<ProviderPlacementNetworkPage />} />
            </Route>

            {/* Admin Routes */}
            {/* Redirect legacy /admin-login to /admin/login */}
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="seekers" element={<AdminSeekers />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="featured" element={<Navigate to="/admin/subscriptions?tab=featured" replace />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="security-logs" element={<AdminSecurityLogs />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="concierge" element={<AdminConcierge />} />
              <Route path="international" element={<Navigate to="/admin/concierge" replace />} />
              <Route path="international/agreement" element={<InternationalAgreementTemplate />} />
              <Route path="placement-revenue" element={<PlacementRevenueDashboard />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="marketing" element={<AdminMarketing />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="inbox" element={<AdvisorInbox />} />
              <Route path="escalations" element={<AdminEscalations />} />
              <Route path="back-office" element={<AdminBackOffice />} />
              <Route path="provider-directory" element={<AdvisorProviderDirectory />} />
              <Route path="email-logs" element={<AdminEmailLogs />} />
            </Route>
            
            {/* Marketing Landing Page (Ad Traffic) */}
            <Route path="/lp/convert" element={<MarketingLanding />} />
            <Route path="/lp/treatment" element={<Navigate to="/treatment-types" replace />} />
            <Route path="/lp/social" element={<Navigate to="/" replace />} />
            
            {/* Legacy /us-rehab/ redirects */}
            <Route path="/us-rehab/detox-usa" element={<Navigate to="/treatment-types/detox-programs" replace />} />
            <Route path="/us-rehab/california" element={<Navigate to="/rehab-centers/california" replace />} />
            
            {/* Legacy misc redirects */}
            <Route path="/sitemap" element={<Navigate to="/sitemap-index.xml" replace />} />
            <Route path="/search" element={<Navigate to="/search-results" replace />} />
            
            {/* 404 - explicit route so SEO/near-me pages can <Navigate to="/404"> without falling through SmartCatchAll's prefix matchers */}
            <Route path="/404" element={<SmartCatchAll />} />
            <Route path="*" element={<SmartCatchAll />} />
          </Routes>
        </Suspense>
              </NavigationProvider>
            </SafeBrowserRouter>
          </SafeTooltipProvider>
        </SafeQueryClientProvider>
      </HelmetProvider>
    </GlobalErrorBoundary>
  );
};

const App = React.forwardRef<HTMLDivElement, Record<string, never>>((_props, ref) => {
  return (
    <div ref={ref} className="contents" data-ref-sink="app-root">
      <AppInner />
    </div>
  );
});
App.displayName = "App";

export default App;

