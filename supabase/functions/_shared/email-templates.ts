/**
 * Shared Email Template Components for Provider Emails
 * Professional branded email templates with dark navy blue headers/footers
 */

import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";

// ============================================================================
// BRAND COLORS - Professional Navy Blue Theme
// ============================================================================

const BRAND_COLORS = {
  primary: "#1B365D",
  primaryLight: "#2C4A7F",
  accent: "#0EA5E9",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  background: "#F8FAFC",
  cardBg: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  gold: "#f59e0b",
};

// ============================================================================
// LEAD MASKING UTILITIES
// ============================================================================

export function maskLeadName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return "Lead";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

export function getHiddenContactText(): string {
  return "Unlock to view";
}

// deno-lint-ignore no-explicit-any
export async function isLeadUnlocked(supabase: any, leadId: string, facilityId: string): Promise<boolean> {
  const { data } = await supabase
    .from("lead_unlocks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("facility_id", facilityId)
    .maybeSingle();
  return !!data;
}

// ============================================================================
// TYPES
// ============================================================================

export type PlanType = 'free' | 'pro';

export interface PlanInfo {
  plan: PlanType;
  planName: string;
  locationLimit: number;
  unlockDiscount: number;
}

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

export const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

export const PLAN_CONFIG = {
  free: { name: "Free", locationLimit: 1, unlockDiscount: 0 },
  pro: { name: "Pro", locationLimit: 5, unlockDiscount: 20, product_ids: PRO_PRODUCT_IDS },
};

// ============================================================================
// PLAN DETECTION
// ============================================================================

export async function getProviderPlan(email: string, stripe: Stripe | null): Promise<PlanInfo> {
  const freeDefault: PlanInfo = { 
    plan: 'free', planName: 'Free', 
    locationLimit: PLAN_CONFIG.free.locationLimit, unlockDiscount: 0 
  };
  if (!stripe) return freeDefault;

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return freeDefault;

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id, status: 'active', limit: 10,
    });
    if (subscriptions.data.length === 0) return freeDefault;

    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product as string;
      if (productId && PRO_PRODUCT_IDS.includes(productId)) {
        return { plan: 'pro', planName: 'Pro', locationLimit: PLAN_CONFIG.pro.locationLimit, unlockDiscount: PLAN_CONFIG.pro.unlockDiscount };
      }
    }
    return { plan: 'pro', planName: 'Pro', locationLimit: PLAN_CONFIG.pro.locationLimit, unlockDiscount: PLAN_CONFIG.pro.unlockDiscount };
  } catch (error) {
    console.error('[EMAIL-TEMPLATES] Error checking plan:', error);
    return freeDefault;
  }
}

export function getPlanFromProductId(productId: string): PlanInfo {
  const isPro = PRO_PRODUCT_IDS.includes(productId);
  return {
    plan: isPro ? 'pro' : 'free',
    planName: isPro ? 'Pro' : 'Free',
    locationLimit: isPro ? PLAN_CONFIG.pro.locationLimit : PLAN_CONFIG.free.locationLimit,
    unlockDiscount: isPro ? PLAN_CONFIG.pro.unlockDiscount : 0,
  };
}

// ============================================================================
// STYLE HELPERS
// ============================================================================

export interface PlanStyles {
  headerGradient: string;
  headerBg: string;
  accentColor: string;
  planBadge: string;
  buttonBackground: string;
}

export function getPlanStyles(plan: PlanType, options?: { isUrgent?: boolean }): PlanStyles {
  const isPro = plan === 'pro';
  const isUrgent = options?.isUrgent || false;

  const headerBg = isUrgent ? '#dc2626' : BRAND_COLORS.primary;
  const planBadge = isPro 
    ? `<span style="display: inline-block; background-color: ${BRAND_COLORS.gold}; color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ PRO</span>`
    : '';

  return { 
    headerGradient: headerBg, 
    headerBg, 
    accentColor: BRAND_COLORS.primary, 
    planBadge, 
    buttonBackground: BRAND_COLORS.primary 
  };
}

// ============================================================================
// EMAIL COMPONENTS - Professional Dark Navy Blue Design
// ============================================================================

export function emailStart(_backgroundColor?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_COLORS.background}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
`;
}

export function emailEnd(): string {
  return `
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeader(title: string, plan: PlanType, options?: { subtitle?: string; icon?: string; isUrgent?: boolean }): string {
  const styles = getPlanStyles(plan, { isUrgent: options?.isUrgent });
  const icon = options?.icon ? `<div style="font-size: 48px; margin-bottom: 16px;">${options.icon}</div>` : '';
  const subtitle = options?.subtitle 
    ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">${options.subtitle}</p>` 
    : '';

  return `
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              ${icon}
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
                ${title}${styles.planBadge}
              </h1>
              ${options?.subtitle ? `<p style="margin: 8px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${options.subtitle}</p>` : ''}
            </td>
          </tr>`;
}

export function emailBodyStart(): string {
  return `
          <tr>
            <td style="background: ${BRAND_COLORS.cardBg}; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid ${BRAND_COLORS.border}; border-right: 1px solid ${BRAND_COLORS.border};">`;
}

export function emailBodyEnd(): string {
  return `
            </td>
          </tr>`;
}

export function emailGreeting(firstName: string): string {
  return `<p style="margin: 0 0 16px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>`;
}

export function emailParagraph(content: string): string {
  return `<p style="margin: 0 0 16px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">${content}</p>`;
}

export function proInsightsBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FEF3C7; border-left: 4px solid ${BRAND_COLORS.gold}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">⭐ Pro Member Insights</p>
                    <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.5;">${content}</p>
                  </td>
                </tr>
              </table>`;
}

export function alertBox(content: string, plan: PlanType, options?: { isUrgent?: boolean }): string {
  const isUrgent = options?.isUrgent || false;
  const bgColor = isUrgent ? '#FEF2F2' : '#F0F9FF';
  const borderColor = isUrgent ? BRAND_COLORS.error : BRAND_COLORS.accent;
  const textColor = isUrgent ? '#991B1B' : '#0C4A6E';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.6;">${content}</p>
                  </td>
                </tr>
              </table>`;
}

export function tipBox(tipContent: string, plan: PlanType, options?: { showUpgradePrompt?: boolean }): string {
  const isPro = plan === 'pro';
  const showUpgrade = options?.showUpgradePrompt && !isPro;
  const upgradeLink = showUpgrade ? ` <a href="https://rehablookup.com/provider/billing" style="color: ${BRAND_COLORS.primary}; text-decoration: underline; font-weight: 600;">Upgrade to Pro</a>` : '';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-left: 4px solid ${BRAND_COLORS.accent}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #0C4A6E; line-height: 1.6;">
                      💡 <strong>Tip:</strong> ${tipContent}${upgradeLink}
                    </p>
                  </td>
                </tr>
              </table>`;
}

export function usageBox(unlockedLeads: number, _unused: number, plan: PlanType): string {
  const isPro = plan === 'pro';
  const discountText = isPro ? ' (20% Pro discount applied)' : '';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND_COLORS.background}; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Leads Unlocked This Month</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary};">${unlockedLeads}</p>
                    ${isPro ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: ${BRAND_COLORS.success};">${discountText}</p>` : ''}
                  </td>
                </tr>
              </table>`;
}

export function ctaButton(text: string, url: string, plan: PlanType): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      ${text}
                    </a>
                  </td>
                </tr>
              </table>`;
}

export function emailFooter(_options?: { includeNotificationSettings?: boolean; settingsUrl?: string; includeUnsubscribe?: boolean; unsubscribeUrl?: string }): string {
  return `
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 24px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif;">Connecting families with quality treatment</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Website</a>
                      <span style="color: #64748b; margin: 0 8px;">|</span>
                      <a href="mailto:support@rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Support</a>
                      <span style="color: #64748b; margin: 0 8px;">|</span>
                      <a href="https://rehablookup.com/provider/settings#notifications" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Email Preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export function emailDivider(): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr><td style="border-top: 1px solid ${BRAND_COLORS.border};"></td></tr>
              </table>`;
}