/**
 * Shared Email Template Components for Provider Emails
 * 
 * This module provides reusable email template components with plan-aware styling.
 * All provider-facing emails should use these components for consistency.
 */

import Stripe from "https://esm.sh/stripe@14.21.0";

// ============================================================================
// TYPES
// ============================================================================

export type PlanType = 'basic' | 'professional' | 'featured';

export interface PlanInfo {
  plan: PlanType;
  planName: string;
  leadLimit: number;
}

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

export const PLAN_CONFIG: Record<string, { product_ids: string[]; lead_limit: number; name: string; exclusivity: string }> = {
  basic: { product_ids: [], lead_limit: 0, name: "Basic", exclusivity: "none" },
  professional: { product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], lead_limit: 100, name: "Professional", exclusivity: "shared" },
  featured: { product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], lead_limit: 100, name: "Featured", exclusivity: "exclusive" },
};

export const PRODUCT_TO_PLAN: Record<string, PlanType> = {
  "prod_TbalLOPujTIoUe": "professional",
  "prod_Tbyz1bf6iYyzYd": "professional",
  "prod_TbalOeJZA2ZoJl": "featured",
  "prod_TbyzJVNOQL71NN": "featured",
};

// ============================================================================
// PLAN DETECTION
// ============================================================================

export async function getProviderPlan(email: string, stripe: Stripe | null): Promise<PlanInfo> {
  if (!stripe) {
    return { plan: 'basic', planName: 'Basic', leadLimit: 0 };
  }

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return { plan: 'basic', planName: 'Basic', leadLimit: 0 };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      return { plan: 'basic', planName: 'Basic', leadLimit: 0 };
    }

    for (const sub of subscriptions.data) {
      const priceId = sub.items.data[0]?.price?.id;
      if (!priceId) continue;

      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product as Stripe.Product;
      const productName = product.name?.toLowerCase() || '';

      if (productName.includes('featured') || productName.includes('premium')) {
        return { plan: 'featured', planName: 'Featured', leadLimit: PLAN_CONFIG.featured.lead_limit };
      }
      if (productName.includes('professional') || productName.includes('pro')) {
        return { plan: 'professional', planName: 'Professional', leadLimit: PLAN_CONFIG.professional.lead_limit };
      }
    }

    // Default to professional if they have a subscription but we can't identify the tier
    return { plan: 'professional', planName: 'Professional', leadLimit: PLAN_CONFIG.professional.lead_limit };
  } catch (error) {
    console.error('[EMAIL-TEMPLATES] Error checking plan:', error);
    return { plan: 'basic', planName: 'Basic', leadLimit: 0 };
  }
}

export function getPlanFromProductId(productId: string): PlanInfo {
  const plan = PRODUCT_TO_PLAN[productId] || 'basic';
  return {
    plan,
    planName: PLAN_CONFIG[plan].name,
    leadLimit: PLAN_CONFIG[plan].lead_limit,
  };
}

// ============================================================================
// STYLE HELPERS
// ============================================================================

export interface PlanStyles {
  headerGradient: string;
  accentColor: string;
  planBadge: string;
  buttonBackground: string;
}

export function getPlanStyles(plan: PlanType, options?: { isUrgent?: boolean }): PlanStyles {
  const isFeatured = plan === 'featured';
  const isProfessional = plan === 'professional';
  const isUrgent = options?.isUrgent || false;

  let headerGradient: string;
  if (isFeatured) {
    headerGradient = 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)';
  } else if (isProfessional) {
    headerGradient = isUrgent 
      ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' 
      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
  } else {
    headerGradient = isUrgent 
      ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' 
      : 'linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%)';
  }

  const planBadge = isFeatured 
    ? `<span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ FEATURED</span>`
    : isProfessional 
    ? `<span style="display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; margin-left: 8px;">Professional</span>`
    : '';

  const accentColor = isFeatured ? '#7c3aed' : isProfessional ? '#2563eb' : '#1B365D';
  const buttonBackground = isFeatured ? '#7c3aed' : '#1B365D';

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
 * Featured provider insights box
 */
export function featuredInsightsBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">⭐ Featured Provider Insights</p>
                    <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">
                      ${content}
                    </p>
                  </td>
                </tr>
              </table>
`;
}

/**
 * Professional provider info box
 */
export function professionalInfoBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #0369a1;">
                      ${content}
                    </p>
                  </td>
                </tr>
              </table>
`;
}

/**
 * Alert/warning box with plan-aware coloring
 */
export function alertBox(
  content: string,
  plan: PlanType,
  options?: { isUrgent?: boolean }
): string {
  const isFeatured = plan === 'featured';
  const isProfessional = plan === 'professional';
  const isPaidPlan = isFeatured || isProfessional;
  const isUrgent = options?.isUrgent || false;

  if (isPaidPlan) {
    const bgColor = isFeatured ? '#f5f3ff' : '#eff6ff';
    const borderColor = isFeatured ? '#c4b5fd' : '#bfdbfe';
    const textColor = isFeatured ? '#5b21b6' : '#1e40af';
    
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

  // Basic plan uses red/orange for urgent alerts
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
 * Tip box - shows upgrade prompts only for basic plan
 */
export function tipBox(
  tipContent: string,
  plan: PlanType,
  options?: { showUpgradePrompt?: boolean }
): string {
  const isFeatured = plan === 'featured';
  const isProfessional = plan === 'professional';
  const isPaidPlan = isFeatured || isProfessional;
  const showUpgrade = options?.showUpgradePrompt && !isPaidPlan;

  const bgColor = isFeatured ? '#f5f3ff' : isProfessional ? '#eff6ff' : '#f0f9ff';
  const borderColor = isFeatured ? '#c4b5fd' : '#bfdbfe';
  const textColor = isFeatured ? '#5b21b6' : '#1e40af';

  let upgradeLink = '';
  if (showUpgrade) {
    upgradeLink = ` <a href="https://rehablookup.com/provider/billing" style="color: #1B365D; text-decoration: underline;">View plans</a>`;
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
 * Usage stats box
 */
export function usageBox(
  usedLeads: number,
  leadLimit: number,
  plan: PlanType
): string {
  if (leadLimit <= 0) return '';

  const isFeatured = plan === 'featured';
  const usagePercent = Math.round((usedLeads / leadLimit) * 100);
  const remainingLeads = leadLimit - usedLeads;
  const accentColor = isFeatured ? '#7c3aed' : '#1B365D';
  const progressColor = usagePercent >= 80 ? '#dc2626' : isFeatured ? '#7c3aed' : '#16a34a';

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Lead Usage</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #4b5563;">${usedLeads} of ${leadLimit} leads used</span>
                      <span style="font-size: 14px; font-weight: 600; color: ${usagePercent >= 80 ? '#dc2626' : '#16a34a'};">${usagePercent}%</span>
                    </div>
                    <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
                      <div style="background: ${progressColor}; height: 100%; width: ${Math.min(usagePercent, 100)}%;"></div>
                    </div>
                    <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">
                      ${remainingLeads} leads remaining this month
                    </p>
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
    ? `<a href="${settingsUrl}" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Notification Settings</a>
       <span style="color: rgba(255,255,255,0.4); margin: 0 8px;">|</span>`
    : '';

  return `
          <tr>
            <td style="background: #1B365D; padding: 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Connecting families with trusted treatment providers</p>
                    <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${settingsLink}
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Website</a>
                      <span style="color: rgba(255,255,255,0.4); margin: 0 8px;">|</span>
                      <a href="mailto:support@rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Support</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
 * Basic plan upgrade prompt section
 */
export function upgradePromptBox(): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; color: #92400e; font-size: 14px;">
                      <strong>You're on the Basic plan</strong> - Upgrade to start receiving leads and grow your patient base.
                    </p>
                    <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: #1B365D; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
                      View Plans →
                    </a>
                  </td>
                </tr>
              </table>
`;
}

// ============================================================================
// COMPLETE EMAIL BUILDERS
// ============================================================================

/**
 * Build a complete simple email with standard structure
 */
export function buildSimpleEmail(options: {
  title: string;
  plan: PlanType;
  firstName: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  subtitle?: string;
  icon?: string;
  isUrgent?: boolean;
}): string {
  const { title, plan, firstName, bodyContent, ctaText, ctaUrl, subtitle, icon, isUrgent } = options;

  let email = emailStart();
  email += emailHeader(title, plan, { subtitle, icon, isUrgent });
  email += emailBodyStart();
  email += emailGreeting(firstName);
  email += bodyContent;
  
  if (ctaText && ctaUrl) {
    email += ctaButton(ctaText, ctaUrl, plan);
  }
  
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();

  return email;
}
