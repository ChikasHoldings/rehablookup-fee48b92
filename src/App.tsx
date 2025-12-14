import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import RehabCenters from "./pages/RehabCenters";
import TreatmentCenterProfile from "./pages/TreatmentCenterProfile";
import TreatmentTypes from "./pages/TreatmentTypes";
import HowItWorks from "./pages/HowItWorks";
import ForProviders from "./pages/ForProviders";
import ProviderResources from "./pages/ProviderResources";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderSupport from "./pages/ProviderSupport";
import ProviderSignup from "./pages/ProviderSignup";
import ProviderDashboardPage from "./pages/provider/Dashboard";
import ProviderListingPage from "./pages/provider/Listing";
import ProviderLeadsPage from "./pages/provider/Leads";
import ProviderBillingPage from "./pages/provider/Billing";
import ProviderSettingsPage from "./pages/provider/Settings";
import Resources from "./pages/Resources";
import ArticleDetail from "./pages/ArticleDetail";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/rehab-centers" element={<RehabCenters />} />
          <Route path="/rehab-centers/:id" element={<TreatmentCenterProfile />} />
          <Route path="/treatment-types" element={<TreatmentTypes />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/for-providers" element={<ForProviders />} />
          <Route path="/provider-resources" element={<ProviderResources />} />
          <Route path="/provider-login" element={<ProviderLogin />} />
          <Route path="/provider-support" element={<ProviderSupport />} />
          <Route path="/provider-signup" element={<ProviderSignup />} />
          
          {/* Provider Panel Routes */}
          <Route path="/provider-dashboard" element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
          <Route path="/provider/listing" element={<ProviderListingPage />} />
          <Route path="/provider/leads" element={<ProviderLeadsPage />} />
          <Route path="/provider/billing" element={<ProviderBillingPage />} />
          <Route path="/provider/settings" element={<ProviderSettingsPage />} />
          
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/:id" element={<ArticleDetail />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
