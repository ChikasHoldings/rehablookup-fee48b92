export { DashboardKPICards } from "./DashboardKPICards";
export { DashboardChartsSection } from "./DashboardChartsSection";
// LeadRedistributionCard removed 2026-05-21 — we no longer sell leads
// (EKRA flat-fee model). Component file stays in the codebase for
// reference; the export was dropped so no admin dashboard can mount it.
export { QuickActionsCard } from "./QuickActionsCard";
export { TopCitiesCard } from "./TopCitiesCard";
export { RecentLeadsCard } from "./RecentLeadsCard";
export { CriticalAlertsBanner } from "./CriticalAlertsBanner";
export { AddonAdoptionCard } from "./AddonAdoptionCard";

// Role-specific dashboards
export { SuperAdminDashboard } from "./SuperAdminDashboard";
export { ManagerDashboard } from "./ManagerDashboard";
export { CustomerRepDashboard } from "./CustomerRepDashboard";
export { AdvisorDashboard } from "./AdvisorDashboard";
