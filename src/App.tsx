import React, { Suspense, lazy, useEffect } from "react";
import * as Sentry from "@sentry/react";
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
import NotFound from "./pages/NotFound";

// Lazy load all other public pages for reduced initial bundle
const RehabCenters = lazy(() => import("./pages/RehabCenters"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const StatePage = lazy(() => import("./pages/StatePage"));
const CityPage = lazy(() => import("./pages/CityPage"));
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
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const ForProviders = lazy(() => import("./pages/ForProviders"));
const ProviderResources = lazy(() => import("./pages/ProviderResources"));
const ProviderForgotPassword = lazy(() => import("./pages/ProviderForgotPassword"));
const ProviderResetPassword = lazy(() => import("./pages/ProviderResetPassword"));
const ProviderSupport = lazy(() => import("./pages/ProviderSupport"));
const ProviderFAQ = lazy(() => import("./pages/ProviderFAQ"));
const ProviderSignup = lazy(() => import("./pages/ProviderSignup"));

// SEO Landing Pages - City+Treatment, Comparisons, Treatment Hubs, Cost/Insurance
const CityTreatmentPage = lazy(() => import("./pages/seo/CityTreatmentPage"));
const ComparisonPage = lazy(() => import("./pages/seo/ComparisonPage"));
const TreatmentHubPage = lazy(() => import("./pages/seo/TreatmentHubPage"));
const CostInsurancePage = lazy(() => import("./pages/seo/CostInsurancePage"));
const SubstanceTreatmentPage = lazy(() => import("./pages/seo/SubstanceTreatmentPage"));
const InsuranceStatePage = lazy(() => import("./pages/seo/InsuranceStatePage"));
const BestInStatePage = lazy(() => import("./pages/seo/BestInStatePage"));

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
const ListYourFacilityState = lazy(() => import("./pages/provider-guides/ListYourFacilityState"));

// Provider Resource Hub
const ProviderResourceHub = lazy(() => import("./pages/providers/ProviderResourceHub"));
const ProviderResourceArticle = lazy(() => import("./pages/providers/ProviderResourceArticle"));

// Concierge Placement (Paid Service) - lazy load
const ConciergeLanding = lazy(() => import("./pages/concierge/ConciergeLanding"));
const ConciergeIntake = lazy(() => import("./pages/concierge/ConciergeIntake"));
const ConciergeThankYou = lazy(() => import("./pages/concierge/ConciergeThankYou"));
const ConciergeCreatePassword = lazy(() => import("./pages/concierge/ConciergeCreatePassword"));

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
const CostEstimator = lazy(() => import("./pages/CostEstimator"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
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
const MarketingLanding = lazy(() => import("./pages/MarketingLanding"));

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


const AppInner = () => {
  // Global handler for unhandled promise rejections to prevent page blanking
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      Sentry.captureException(event.reason || new Error("Unhandled promise rejection"));
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
            <Route path="/rehab-centers/:stateSlug/:citySlug" element={<PublicRouteGuard><CityPage /></PublicRouteGuard>} />
            <Route path="/rehab-centers/:stateSlug" element={<PublicRouteGuard><StatePage /></PublicRouteGuard>} />
            <Route path="/center/:slug" element={<PublicRouteGuard><CenterProfile /></PublicRouteGuard>} />
            <Route path="/treatment-types" element={<PublicRouteGuard><TreatmentTypes /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction" element={<PublicRouteGuard><DrugAddictionTreatment /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction-treatment" element={<PublicRouteGuard><DrugAddictionTreatment /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction/:stateSlug" element={<PublicRouteGuard><StateDrugAddiction /></PublicRouteGuard>} />
            <Route path="/treatment-types/drug-addiction/:stateSlug/:citySlug" element={<PublicRouteGuard><CityDrugAddiction /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation" element={<PublicRouteGuard><AlcoholRehabilitation /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation/:stateSlug" element={<PublicRouteGuard><StateAlcoholRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/alcohol-rehabilitation/:stateSlug/:citySlug" element={<PublicRouteGuard><CityAlcoholRehab /></PublicRouteGuard>} />
            <Route path="/treatment-types/dual-diagnosis" element={<PublicRouteGuard><DualDiagnosisTreatment /></PublicRouteGuard>} />
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
            <Route path="/treatment-types/holistic-treatment" element={<Navigate to="/treatment-types/holistic-therapy" replace />} />
            <Route path="/treatment-types/luxury-rehab" element={<PublicRouteGuard><LuxuryRehab /></PublicRouteGuard>} />
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
            
            {/* SEO Comparison Pages */}
            <Route path="/inpatient-vs-outpatient-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/detox-vs-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            <Route path="/private-vs-public-rehab" element={<PublicRouteGuard><ComparisonPage /></PublicRouteGuard>} />
            
            {/* SEO Cost & Insurance Pages */}
            <Route path="/rehab-cost" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/does-insurance-cover-rehab" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/free-rehab-centers" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            <Route path="/medicaid-rehab-centers" element={<PublicRouteGuard><CostInsurancePage /></PublicRouteGuard>} />
            
            {/* Substance-Specific SEO Landing Pages */}
            <Route path="/cocaine-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/opioid-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/heroin-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/meth-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/prescription-drug-rehab" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            <Route path="/benzodiazepine-addiction-treatment" element={<PublicRouteGuard><SubstanceTreatmentPage /></PublicRouteGuard>} />
            
            {/* Insurance + State Cross Pages */}
            <Route path="/insurance/:slug/:stateSlug" element={<PublicRouteGuard><InsuranceStatePage /></PublicRouteGuard>} />
            
            {/* Best Rehab Centers in [State] Roundup Pages */}
            {/* Best Rehab Centers routes handled by SmartCatchAll below */}
            
            {/* SEO City+Treatment Combo Pages - use full path parsing */}
            <Route path="/alcohol-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/drug-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/detox-centers-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/inpatient-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/outpatient-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/dual-diagnosis-treatment-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            
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
            
            {/* New City+Treatment Combo Routes */}
            <Route path="/luxury-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/sober-living-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/free-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/faith-based-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/fentanyl-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/veterans-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/womens-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            <Route path="/mens-rehab-in-/*" element={<PublicRouteGuard><CityTreatmentPage /></PublicRouteGuard>} />
            
            {/* Concierge Placement Routes - /concierge is canonical */}
            <Route path="/concierge" element={<PublicRouteGuard><ConciergeLanding /></PublicRouteGuard>} />
            <Route path="/concierge/intake" element={<PublicRouteGuard><ConciergeIntake /></PublicRouteGuard>} />
            <Route path="/concierge/thank-you" element={<PublicRouteGuard><ConciergeThankYou /></PublicRouteGuard>} />
            <Route path="/concierge/create-password" element={<PublicRouteGuard><ConciergeCreatePassword /></PublicRouteGuard>} />
            
            {/* Legacy concierge redirects */}
            <Route path="/request-help" element={<Navigate to="/concierge" replace />} />
            <Route path="/request-help/intake" element={<Navigate to="/concierge/intake" replace />} />
            <Route path="/request-help/thank-you" element={<Navigate to="/concierge/thank-you" replace />} />
            <Route path="/request-help/create-password" element={<Navigate to="/concierge/create-password" replace />} />
            
            {/* Legacy /treatment/ redirects to /treatment-types/ */}
            <Route path="/treatment/dual-diagnosis" element={<Navigate to="/treatment-types/dual-diagnosis-treatment" replace />} />
            <Route path="/treatment/dual-diagnosis/:stateSlug" element={<Navigate to="/treatment-types/dual-diagnosis-treatment" replace />} />
            <Route path="/treatment/detox" element={<Navigate to="/treatment-types/detox-programs" replace />} />
            <Route path="/treatment/detox/:stateSlug" element={<Navigate to="/treatment-types/detox-programs" replace />} />

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
            <Route path="/cost-estimator" element={<PublicRouteGuard><CostEstimator /></PublicRouteGuard>} />
            <Route path="/faq" element={<PublicRouteGuard><FAQ /></PublicRouteGuard>} />
            <Route path="/about" element={<PublicRouteGuard><About /></PublicRouteGuard>} />
            <Route path="/contact" element={<PublicRouteGuard><Contact /></PublicRouteGuard>} />
            <Route path="/privacy-policy" element={<PublicRouteGuard><PrivacyPolicy /></PublicRouteGuard>} />
            <Route path="/terms-of-service" element={<PublicRouteGuard><TermsOfService /></PublicRouteGuard>} />
            
            {/* Seeker Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/seeker/signup" element={<SeekerSignup />} />
            <Route path="/signup" element={<Navigate to="/seeker/signup" replace />} />
            <Route path="/seeker/reset-password" element={<ResetPassword />} />
            
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
            </Route>
            
            {/* Legacy /my-account redirect */}
            <Route path="/my-account/*" element={<Navigate to="/account" replace />} />
            
            {/* Provider Routes */}
            <Route path="/for-providers" element={<PublicRouteGuard><ForProviders /></PublicRouteGuard>} />
            <Route path="/provider-resources" element={<PublicRouteGuard><ProviderResources /></PublicRouteGuard>} />
            <Route path="/provider-signup" element={<ProviderSignup />} />
            <Route path="/provider-login" element={<Navigate to="/login" replace />} />
            <Route path="/provider-faq" element={<ProviderFAQ />} />
            <Route path="/provider-support" element={<ProviderSupport />} />
            <Route path="/provider/login" element={<Navigate to="/login" replace />} />
            <Route path="/provider/forgot-password" element={<ProviderForgotPassword />} />
            <Route path="/provider/reset-password" element={<ProviderResetPassword />} />
            <Route path="/provider/support" element={<ProviderSupport />} />
            <Route path="/provider/faq" element={<ProviderFAQ />} />
            <Route path="/provider/signup" element={<ProviderSignup />} />
            
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
            <Route path="/list-your-facility-in-/*" element={<PublicRouteGuard><ListYourFacilityState /></PublicRouteGuard>} />

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
              <Route path="pro-upgrade" element={<Navigate to="/provider/billing?tab=pro" replace />} />
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
            </Route>
            
            {/* Marketing Landing Page (Ad Traffic) */}
            <Route path="/lp/convert" element={<MarketingLanding />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
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

