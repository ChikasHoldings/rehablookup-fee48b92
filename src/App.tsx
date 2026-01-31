import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoading } from "@/components/ui/page-loading";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";

// Eagerly load all public pages for instant navigation
import Index from "./pages/Index";
import RehabCenters from "./pages/RehabCenters";
import SearchResults from "./pages/SearchResults";
import StatePage from "./pages/StatePage";
import CityPage from "./pages/CityPage";
import Locations from "./pages/Locations";
import TreatmentCenterProfile from "./pages/TreatmentCenterProfile";
import CenterProfile from "./pages/CenterProfile";
import TreatmentTypes from "./pages/TreatmentTypes";
import DrugAddictionTreatment from "./pages/treatment-types/DrugAddictionTreatment";
import StateDrugAddiction from "./pages/treatment-types/StateDrugAddiction";
import CityDrugAddiction from "./pages/treatment-types/CityDrugAddiction";
import AlcoholRehabilitation from "./pages/treatment-types/AlcoholRehabilitation";
import StateAlcoholRehab from "./pages/treatment-types/StateAlcoholRehab";
import CityAlcoholRehab from "./pages/treatment-types/CityAlcoholRehab";
import DualDiagnosisTreatment from "./pages/treatment-types/DualDiagnosisTreatment";
import ResidentialInpatient from "./pages/treatment-types/ResidentialInpatient";
import OutpatientPrograms from "./pages/treatment-types/OutpatientPrograms";
import HolisticTherapy from "./pages/treatment-types/HolisticTherapy";
import DetoxPrograms from "./pages/treatment-types/DetoxPrograms";
import StateDetoxPrograms from "./pages/treatment-types/StateDetoxPrograms";
import CityDetoxPrograms from "./pages/treatment-types/CityDetoxPrograms";
import StateInpatientRehab from "./pages/treatment-types/StateInpatientRehab";
import CityInpatientRehab from "./pages/treatment-types/CityInpatientRehab";
import StateOutpatientPrograms from "./pages/treatment-types/StateOutpatientPrograms";
import CityOutpatientPrograms from "./pages/treatment-types/CityOutpatientPrograms";
import StateDualDiagnosis from "./pages/treatment-types/StateDualDiagnosis";
import CityDualDiagnosis from "./pages/treatment-types/CityDualDiagnosis";
import HowItWorks from "./pages/HowItWorks";
import ForProviders from "./pages/ForProviders";
import ProviderResources from "./pages/ProviderResources";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderForgotPassword from "./pages/ProviderForgotPassword";
import ProviderResetPassword from "./pages/ProviderResetPassword";
import ProviderSupport from "./pages/ProviderSupport";
import ProviderFAQ from "./pages/ProviderFAQ";
import ProviderSignup from "./pages/ProviderSignup";

// Concierge Placement (Paid Service)
import ConciergeLanding from "./pages/concierge/ConciergeLanding";
import ConciergeIntake from "./pages/concierge/ConciergeIntake";
import ConciergeThankYou from "./pages/concierge/ConciergeThankYou";
import ConciergeCreatePassword from "./pages/concierge/ConciergeCreatePassword";
import AdLanding from "./pages/AdLanding";
import SocialLanding from "./pages/SocialLanding";
import Resources from "./pages/Resources";
import Insurance from "./pages/Insurance";
import AetnaRehab from "./pages/insurance/AetnaRehab";
import BCBSTreatment from "./pages/insurance/BCBSTreatment";
import CignaRehab from "./pages/insurance/CignaRehab";
import UnitedHealthcareRehab from "./pages/insurance/UnitedHealthcareRehab";
import HumanaRehab from "./pages/insurance/HumanaRehab";
import KaiserRehab from "./pages/insurance/KaiserRehab";
import MedicareRehab from "./pages/insurance/MedicareRehab";
import MedicaidRehab from "./pages/insurance/MedicaidRehab";
import AnthemRehab from "./pages/insurance/AnthemRehab";
import CostEstimator from "./pages/CostEstimator";
import ArticleDetail from "./pages/ArticleDetail";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import SeekerAuth from "./pages/SeekerAuth";
import SeekerSignup from "./pages/SeekerSignup";
import ResetPassword from "./pages/ResetPassword";
import { SeekerShell } from "./components/seeker/SeekerShell";
import SeekerHome from "./pages/seeker/SeekerHome";
import SeekerRequests from "./pages/seeker/SeekerRequests";
import SeekerSaved from "./pages/seeker/SeekerSaved";
import SeekerReviews from "./pages/seeker/SeekerReviews";
import SeekerSettings from "./pages/seeker/SeekerSettings";
import SeekerNotifications from "./pages/seeker/SeekerNotifications";
import SeekerNotificationPreferences from "./pages/seeker/SeekerNotificationPreferences";
import SeekerFacilityProfile from "./pages/seeker/SeekerFacilityProfile";
import SeekerSearch from "./pages/seeker/SeekerSearch";
import SeekerHelp from "./pages/seeker/SeekerHelp";
import SeekerConcierge from "./pages/seeker/SeekerConcierge";

// Near Me SEO Pages
import DrugRehabNearMe from "./pages/near-me/DrugRehabNearMe";
import AlcoholRehabNearMe from "./pages/near-me/AlcoholRehabNearMe";
import DetoxNearMe from "./pages/near-me/DetoxNearMe";
import DualDiagnosisNearMe from "./pages/near-me/DualDiagnosisNearMe";
import InpatientRehabNearMe from "./pages/near-me/InpatientRehabNearMe";
import OutpatientNearMe from "./pages/near-me/OutpatientNearMe";

// Provider Panel - eagerly load for instant navigation
import { ProviderShell } from "./components/provider/ProviderShell";
import ProviderDashboardPage from "./pages/provider/Dashboard";
import ProviderListingPage from "./pages/provider/MyListings";
import ProviderInquiriesPage from "./pages/provider/Inquiries";
import ProviderReviewsPage from "./pages/provider/Reviews";
import ProviderAnalyticsPage from "./pages/provider/Analytics";
import ProviderCreditsPage from "./pages/provider/Credits";
import ProviderSettingsPage from "./pages/provider/Settings";
import ProviderNotificationsPage from "./pages/provider/Notifications";
import ProviderHelpPage from "./pages/provider/Help";
import ProviderKnowledgeBasePage from "./pages/provider/KnowledgeBase";
import ProviderImageGuidelines from "./pages/provider/ImageGuidelines";
import ProviderAddLocation from "./pages/provider/AddLocation";

import ProviderBillingPage from "./pages/provider/Billing";
import ProviderPlacementNetworkPage from "./pages/provider/PlacementNetwork";

// Admin Panel - eagerly load shell, lazy load pages (shell handles its own Suspense)
import { AdminShell } from "./components/admin/AdminShell";
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProviders = lazy(() => import("./pages/admin/AdminProviders"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSeekers = lazy(() => import("./pages/admin/AdminSeekers"));

const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));

const AdminSecurityLogs = lazy(() => import("./pages/admin/AdminSecurityLogs"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminConcierge = lazy(() => import("./pages/admin/AdminConcierge"));
const PlacementRevenueDashboard = lazy(() => import("./pages/admin/PlacementRevenueDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <CookieConsentBanner />
        <Suspense fallback={<PageLoading />}>
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
            <Route path="/treatment-types/detox-programs" element={<PublicRouteGuard><DetoxPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/detox-programs/:stateSlug" element={<PublicRouteGuard><StateDetoxPrograms /></PublicRouteGuard>} />
            <Route path="/treatment-types/detox-programs/:stateSlug/:citySlug" element={<PublicRouteGuard><CityDetoxPrograms /></PublicRouteGuard>} />
            
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
            
            <Route path="/how-it-works" element={<PublicRouteGuard><HowItWorks /></PublicRouteGuard>} />
            <Route path="/request-help" element={<Navigate to="/account/concierge" replace />} />
            <Route path="/placement-help" element={<Navigate to="/account/concierge" replace />} />
            
            {/* Concierge Placement Routes (Paid Service) */}
            <Route path="/concierge" element={<PublicRouteGuard><ConciergeLanding /></PublicRouteGuard>} />
            <Route path="/concierge/intake" element={<PublicRouteGuard><ConciergeIntake /></PublicRouteGuard>} />
            <Route path="/concierge/thank-you" element={<PublicRouteGuard><ConciergeThankYou /></PublicRouteGuard>} />
            <Route path="/concierge/create-password" element={<PublicRouteGuard><ConciergeCreatePassword /></PublicRouteGuard>} />
            
            <Route path="/lp/treatment" element={<PublicRouteGuard><AdLanding /></PublicRouteGuard>} />
            <Route path="/lp/social" element={<PublicRouteGuard><SocialLanding /></PublicRouteGuard>} />
            <Route path="/auth" element={<PublicRouteGuard><SeekerAuth /></PublicRouteGuard>} />
            <Route path="/signup" element={<PublicRouteGuard><SeekerSignup /></PublicRouteGuard>} />
            <Route path="/reset-password" element={<PublicRouteGuard><ResetPassword /></PublicRouteGuard>} />
            
            {/* Seeker Account Routes - Nested under seeker shell */}
            <Route path="/account" element={<SeekerShell />}>
              <Route index element={<SeekerHome />} />
              <Route path="requests" element={<SeekerRequests />} />
              <Route path="saved" element={<SeekerSaved />} />
              <Route path="reviews" element={<SeekerReviews />} />
              <Route path="settings" element={<SeekerSettings />} />
              <Route path="notifications" element={<SeekerNotifications />} />
              <Route path="notification-preferences" element={<SeekerNotificationPreferences />} />
              <Route path="facility/:slug" element={<SeekerFacilityProfile />} />
              <Route path="search" element={<SeekerSearch />} />
              <Route path="help" element={<SeekerHelp />} />
              <Route path="concierge" element={<SeekerConcierge />} />
            </Route>
            <Route path="/my-account" element={<Navigate to="/account" replace />} />
            <Route path="/for-providers" element={<ForProviders />} />
            <Route path="/provider-resources" element={<ProviderResources />} />
            <Route path="/provider-login" element={<ProviderLogin />} />
            <Route path="/provider-forgot-password" element={<ProviderForgotPassword />} />
            <Route path="/provider-reset-password" element={<ProviderResetPassword />} />
            <Route path="/provider-support" element={<ProviderSupport />} />
            <Route path="/provider-faq" element={<ProviderFAQ />} />
            <Route path="/provider-signup" element={<ProviderSignup />} />
            
            {/* Provider Panel Routes - Nested under persistent shell */}
            <Route path="/provider-dashboard" element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/provider/listing/preview/:slug" element={<Navigate to="/provider/listing" replace />} />
            <Route path="/provider" element={<ProviderShell />}>
              <Route path="dashboard" element={<ProviderDashboardPage />} />
              <Route path="listing" element={<ProviderListingPage />} />
              <Route path="inquiries" element={<ProviderInquiriesPage />} />
              <Route path="leads" element={<Navigate to="/provider/inquiries" replace />} />
              <Route path="billing" element={<ProviderBillingPage />} />
              <Route path="credits" element={<Navigate to="/provider/billing" replace />} />
              <Route path="pro-upgrade" element={<Navigate to="/provider/billing?tab=pro" replace />} />
              <Route path="unlock-history" element={<Navigate to="/provider/settings?tab=unlock-history" replace />} />
              <Route path="placement-network" element={<ProviderPlacementNetworkPage />} />
              <Route path="placement" element={<Navigate to="/provider/placement-network" replace />} />
              <Route path="concierge" element={<Navigate to="/provider/placement-network" replace />} />
              <Route path="billing-history" element={<Navigate to="/provider/placement-network?tab=billing" replace />} />
              <Route path="reviews" element={<ProviderReviewsPage />} />
              <Route path="analytics" element={<ProviderAnalyticsPage />} />
              <Route path="settings" element={<ProviderSettingsPage />} />
              <Route path="notifications" element={<ProviderNotificationsPage />} />
              <Route path="help" element={<ProviderHelpPage />} />
              <Route path="knowledge-base" element={<ProviderKnowledgeBasePage />} />
              <Route path="image-guidelines" element={<ProviderImageGuidelines />} />
              <Route path="add-location" element={<ProviderAddLocation />} />
              <Route path="choose-plan" element={<Navigate to="/provider/dashboard" replace />} />
            </Route>
            
            {/* Admin Panel Routes - Nested under admin shell */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="seekers" element={<AdminSeekers />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="security-logs" element={<AdminSecurityLogs />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="concierge" element={<AdminConcierge />} />
              <Route path="placement-revenue" element={<PlacementRevenueDashboard />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>
            
            <Route path="/resources" element={<PublicRouteGuard><Resources /></PublicRouteGuard>} />
            <Route path="/insurance" element={<PublicRouteGuard><Insurance /></PublicRouteGuard>} />
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
            <Route path="/resources/:id" element={<PublicRouteGuard><ArticleDetail /></PublicRouteGuard>} />
            <Route path="/faq" element={<PublicRouteGuard><FAQ /></PublicRouteGuard>} />
            <Route path="/about" element={<PublicRouteGuard><About /></PublicRouteGuard>} />
            <Route path="/contact" element={<PublicRouteGuard><Contact /></PublicRouteGuard>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
