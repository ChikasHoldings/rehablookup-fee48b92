/**
 * Shared Email Template Components for Provider Emails
 * 
 * This module provides reusable email template components with plan-aware styling.
 * All provider-facing emails should use these components for consistency.
 * 
 * NEW MODEL: Free (no subscription) vs Pro ($399/mo)
 */

import Stripe from "https://esm.sh/stripe@18.5.0";

// ============================================================================
// LEAD MASKING UTILITIES
// ============================================================================

/**
 * Mask a lead name to show only first name and first letter of last name
 * e.g., "John Smith" → "John S."
 * e.g., "Mary Jane Watson" → "Mary J."
 */
export function maskLeadName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return "Lead";
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]; // Just first name, no masking needed
  }
  
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Get placeholder text for hidden contact info
 */
export function getHiddenContactText(): string {
  return "Unlock to view";
}

/**
 * Check if lead is unlocked for a facility
 */
export async function isLeadUnlocked(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  leadId: string,
  facilityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("lead_unlocks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("facility_id", facilityId)
    .maybeSingle();
  
  return !!data;
}

// ============================================================================
// TYPES - Updated to Free/Pro model
// ============================================================================

export type PlanType = 'free' | 'pro';

export interface PlanInfo {
  plan: PlanType;
  planName: string;
  locationLimit: number;
  unlockDiscount: number;
}

// ============================================================================
// PLAN CONFIGURATION - Updated to Free/Pro model
// ============================================================================

// Pro product IDs - includes legacy IDs for backward compatibility
export const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  // Legacy product IDs (old Professional and Featured plans now map to Pro)
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

export const PLAN_CONFIG = {
  free: { 
    name: "Free", 
    locationLimit: 1, 
    unlockDiscount: 0,
  },
  pro: { 
    name: "Pro", 
    locationLimit: 5, 
    unlockDiscount: 20,
    product_ids: PRO_PRODUCT_IDS,
  },
};

// ============================================================================
// PLAN DETECTION - Simplified to Free/Pro
// ============================================================================

export async function getProviderPlan(email: string, stripe: Stripe | null): Promise<PlanInfo> {
  const freeDefault: PlanInfo = { 
    plan: 'free', 
    planName: 'Free', 
    locationLimit: PLAN_CONFIG.free.locationLimit,
    unlockDiscount: 0,
  };

  if (!stripe) {
    return freeDefault;
  }

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return freeDefault;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      return freeDefault;
    }

    // Any active subscription means Pro (legacy tiers now map to Pro)
    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product as string;
      if (productId && PRO_PRODUCT_IDS.includes(productId)) {
        return { 
          plan: 'pro', 
          planName: 'Pro', 
          locationLimit: PLAN_CONFIG.pro.locationLimit,
          unlockDiscount: PLAN_CONFIG.pro.unlockDiscount,
        };
      }
    }

    // Any subscription = Pro (fallback for any other paid product)
    return { 
      plan: 'pro', 
      planName: 'Pro', 
      locationLimit: PLAN_CONFIG.pro.locationLimit,
      unlockDiscount: PLAN_CONFIG.pro.unlockDiscount,
    };
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
// STYLE HELPERS - Updated to Free/Pro
// ============================================================================

export interface PlanStyles {
  headerGradient: string;
  accentColor: string;
  planBadge: string;
  buttonBackground: string;
}

export function getPlanStyles(plan: PlanType, options?: { isUrgent?: boolean }): PlanStyles {
  const isPro = plan === 'pro';
  const isUrgent = options?.isUrgent || false;

  let headerGradient: string;
  if (isPro) {
    // Pro gets premium purple styling
    headerGradient = 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)';
  } else {
    // Free plan
    headerGradient = isUrgent 
      ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' 
      : 'linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%)';
  }

  const planBadge = isPro 
    ? `<span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ PRO</span>`
    : '';

  const accentColor = isPro ? '#7c3aed' : '#1B365D';
  const buttonBackground = isPro ? '#7c3aed' : '#1B365D';

  return { headerGradient, accentColor, planBadge, buttonBackground };
}

// ============================================================================
// EMAIL COMPONENTS
// ============================================================================

/**
 * Email wrapper - starts the HTML document
 */
export function emailStart(backgroundColor = '#f5f5f5'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
`;
}

/**
 * Email wrapper - ends the HTML document
 */
export function emailEnd(): string {
  return `
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Email header with plan-aware styling
 */
export function emailHeader(
  title: string,
  plan: PlanType,
  options?: {
    subtitle?: string;
    icon?: string;
    isUrgent?: boolean;
  }
): string {
  const styles = getPlanStyles(plan, { isUrgent: options?.isUrgent });
  const icon = options?.icon ? `<div style="font-size: 48px; margin-bottom: 16px;">${options.icon}</div>` : '';
  const subtitle = options?.subtitle 
    ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">${options.subtitle}</p>`
    : '';

  return `
          <tr>
            <td style="background: ${styles.headerGradient}; padding: 32px; border-radius: 12px 12px 0 0; text-align: ${options?.icon ? 'center' : 'left'};">
              ${icon}
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                ${title}${styles.planBadge}
              </h1>
              ${subtitle}
            </td>
          </tr>
`;
}

/**
 * Email body container
 */
export function emailBodyStart(): string {
  return `
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
`;
}

export function emailBodyEnd(): string {
  return `
            </td>
          </tr>
`;
}

/**
 * Email greeting
 */
export function emailGreeting(firstName: string): string {
  return `
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
`;
}

/**
 * Email paragraph
 */
export function emailParagraph(content: string): string {
  return `
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                ${content}
              </p>
`;
}

/**
 * Pro provider insights box (replaces featuredInsightsBox)
 */
export function proInsightsBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">⭐ Pro Member Insights</p>
                    <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">
                      ${content}
                    </p>
                  </td>
                </tr>
              </table>
`;
}

/**
 * @deprecated Use proInsightsBox instead - kept for backward compatibility
 */
export function featuredInsightsBox(content: string): string {
  return proInsightsBox(content);
}

/**
 * @deprecated Use proInsightsBox instead - kept for backward compatibility
 */
export function professionalInfoBox(content: string): string {
  return proInsightsBox(content);
}

/**
 * Alert/warning box with plan-aware coloring
 */
export function alertBox(
  content: string,
  plan: PlanType,
  options?: { isUrgent?: boolean }
): string {
  const isPro = plan === 'pro';
  const isUrgent = options?.isUrgent || false;

  if (isPro) {
    const bgColor = '#f5f3ff';
    const borderColor = '#c4b5fd';
    const textColor = '#5b21b6';
    
    return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.5;">
                      ${content}
                    </p>
                  </td>
                </tr>
              </table>
`;
  }

  // Free plan uses red/orange for urgent alerts
  const bgColor = isUrgent ? '#fef2f2' : '#fef3c7';
  const borderColor = isUrgent ? '#fecaca' : '#fcd34d';
  const textColor = isUrgent ? '#991b1b' : '#92400e';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.5;">
                      ${content}
                    </p>
                  </td>
                </tr>
              </table>
`;
}

/**
 * Tip box - shows upgrade prompts only for free plan
 */
export function tipBox(
  tipContent: string,
  plan: PlanType,
  options?: { showUpgradePrompt?: boolean }
): string {
  const isPro = plan === 'pro';
  const showUpgrade = options?.showUpgradePrompt && !isPro;

  const bgColor = isPro ? '#f5f3ff' : '#f0f9ff';
  const borderColor = isPro ? '#c4b5fd' : '#bfdbfe';
  const textColor = isPro ? '#5b21b6' : '#1e40af';

  let upgradeLink = '';
  if (showUpgrade) {
    upgradeLink = ` <a href="https://rehablookup.com/provider/billing" style="color: #1B365D; text-decoration: underline;">Upgrade to Pro</a>`;
  }

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.5;">
                      💡 <strong>Tip:</strong> ${tipContent}${upgradeLink}
                    </p>
                  </td>
                </tr>
              </table>
`;
}

/**
 * Usage stats box - simplified for pay-per-unlock model
 * Shows leads unlocked count instead of lead quota
 */
export function usageBox(
  unlockedLeads: number,
  _unused: number,
  plan: PlanType
): string {
  const isPro = plan === 'pro';
  const accentColor = isPro ? '#7c3aed' : '#1B365D';
  const discountText = isPro ? ' (20% Pro discount applied)' : '';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Leads Unlocked This Month</p>
                    <p style="margin: 0; font-size: 24px; font-weight: 600; color: ${accentColor};">${unlockedLeads}</p>
                    ${isPro ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #16a34a;">${discountText}</p>` : ''}
                  </td>
                </tr>
              </table>
`;
}

/**
 * CTA button with plan-aware styling
 */
export function ctaButton(
  text: string,
  url: string,
  plan: PlanType
): string {
  const styles = getPlanStyles(plan);

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; background: ${styles.buttonBackground}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      ${text}
                    </a>
                  </td>
                </tr>
              </table>
`;
}

/**
 * Email footer
 */
export function emailFooter(options?: {
  includeNotificationSettings?: boolean;
  settingsUrl?: string;
}): string {
  const settingsUrl = options?.settingsUrl || 'https://rehablookup.com/provider/settings';
  const showSettings = options?.includeNotificationSettings !== false;
  
  const settingsLink = showSettings 
    ? `<a href="${settingsUrl}" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Notification Settings</a>`
    : '';

  return `
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px;">
                      Connecting families with quality care
                    </p>
                    ${settingsLink}
                    <p style="margin: 16px 0 0 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`;
}

/**
 * Simple divider
 */
export function emailDivider(): string {
  return `
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
`;
}

/**
 * Info list item
 */
export function infoListItem(label: string, value: string): string {
  return `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                  <span style="color: #6b7280; font-size: 14px;">${label}:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: 500; float: right;">${value}</span>
                </td>
              </tr>
`;
}

/**
 * Stats card for dashboard-style emails
 */
export function statsCard(
  label: string,
  value: string | number,
  subtext?: string,
  plan?: PlanType
): string {
  const isPro = plan === 'pro';
  const accentColor = isPro ? '#7c3aed' : '#1B365D';

  return `
              <td style="background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; width: 33%;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${accentColor};">${value}</p>
                ${subtext ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">${subtext}</p>` : ''}
              </td>
`;
}
