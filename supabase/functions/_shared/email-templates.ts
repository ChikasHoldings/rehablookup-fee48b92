 /**
  * Shared Email Template Components for Provider Emails
  * 
  * This module provides reusable email template components with plan-aware styling.
  * All provider-facing emails should use these components for consistency.
  * 
  * NEW MODEL: Free (no subscription) vs Pro ($399/mo)
  * 
  * EMAIL DELIVERABILITY: Templates follow best practices to avoid spam filters:
  * - Solid background colors (not gradients) for critical text areas
  * - High contrast text (white on dark navy)
  * - Proper unsubscribe links
  * - Physical address in footer
  * - Professional branding
  */
 
 import Stripe from "https://esm.sh/stripe@18.5.0";
 
 // ============================================================================
 // BRAND COLORS
 // ============================================================================
 
 const BRAND_COLORS = {
   navyDark: '#0f172a',
   navyMedium: '#1e293b',
   navyLight: '#334155',
   accentBlue: '#3b82f6',
   accentPurple: '#7c3aed',
   gold: '#f59e0b',
   white: '#ffffff',
   grayLight: '#f8fafc',
   grayMedium: '#94a3b8',
   textPrimary: '#1e293b',
   textSecondary: '#64748b',
 };
 
 // ============================================================================
 // LEAD MASKING UTILITIES
 // ============================================================================
 
 /**
  * Mask a lead name to show only first name and first letter of last name
  */
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
 
   const headerBg = isPro ? BRAND_COLORS.accentPurple : (isUrgent ? '#dc2626' : BRAND_COLORS.navyDark);
   const planBadge = isPro 
     ? `<span style="display: inline-block; background-color: ${BRAND_COLORS.gold}; color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ PRO</span>`
     : '';
   const accentColor = isPro ? '#7c3aed' : BRAND_COLORS.navyDark;
   const buttonBackground = isPro ? '#7c3aed' : BRAND_COLORS.navyDark;
 
   return { headerGradient: headerBg, headerBg, accentColor, planBadge, buttonBackground };
 }
 
 // ============================================================================
 // EMAIL COMPONENTS
 // ============================================================================
 
 export function emailStart(backgroundColor = '#f1f5f9'): string {
   return `<!DOCTYPE html>
 <html lang="en">
 <head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <meta name="color-scheme" content="light">
   <meta name="supported-color-schemes" content="light">
   <title>RehabLookup</title>
   <!--[if mso]>
   <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
   <![endif]-->
   <style type="text/css">
     body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
     table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
     img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
     body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
     @media only screen and (max-width: 620px) {
       .email-container { width: 100% !important; max-width: 100% !important; }
       .mobile-padding { padding: 24px 20px !important; }
       .mobile-stack { display: block !important; width: 100% !important; }
     }
   </style>
 </head>
 <body style="margin: 0; padding: 0; background-color: ${backgroundColor}; -webkit-font-smoothing: antialiased;">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${backgroundColor};">
     <tr>
       <td align="center" style="padding: 40px 16px;">
         <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
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
     ? `<p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px;">${options.subtitle}</p>`
     : '';
 
   return `
           <tr>
             <td style="background-color: ${styles.headerBg}; padding: 48px 40px; text-align: center;" class="mobile-padding">
               <!-- Logo -->
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td align="center" style="padding-bottom: 24px;">
                     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                       <tr>
                         <td style="background-color: ${BRAND_COLORS.white}; border-radius: 12px; padding: 10px 20px;">
                           <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 700; color: ${BRAND_COLORS.navyDark}; letter-spacing: -0.5px;">Rehab<span style="color: ${BRAND_COLORS.accentBlue};">Lookup</span></span>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
               </table>
               ${icon}
               <h1 style="margin: 0; font-size: 28px; color: ${BRAND_COLORS.white}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 700; line-height: 1.3;">
                 ${title}${styles.planBadge}
               </h1>
               ${subtitle}
             </td>
           </tr>`;
 }
 
 export function emailBodyStart(): string {
   return `
           <tr>
             <td style="background-color: ${BRAND_COLORS.white}; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" class="mobile-padding">`;
 }
 
 export function emailBodyEnd(): string {
   return `
             </td>
           </tr>`;
 }
 
 export function emailGreeting(firstName: string): string {
   return `
               <p style="margin: 0 0 24px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 16px; line-height: 1.6;">
                 Hi ${firstName},
               </p>`;
 }
 
 export function emailParagraph(content: string): string {
   return `
               <p style="margin: 0 0 24px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.7;">
                 ${content}
               </p>`;
 }
 
 export function proInsightsBox(content: string): string {
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border: 2px solid ${BRAND_COLORS.gold}; border-radius: 12px; margin-bottom: 24px;">
                 <tr>
                   <td style="padding: 20px;">
                     <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #92400e;">⭐ Pro Member Insights</p>
                     <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">${content}</p>
                   </td>
                 </tr>
               </table>`;
 }
 
 export function alertBox(content: string, plan: PlanType, options?: { isUrgent?: boolean }): string {
   const isPro = plan === 'pro';
   const isUrgent = options?.isUrgent || false;
   const bgColor = isPro ? '#f5f3ff' : (isUrgent ? '#fef2f2' : '#fef3c7');
   const borderColor = isPro ? '#c4b5fd' : (isUrgent ? '#fecaca' : '#fcd34d');
   const textColor = isPro ? '#5b21b6' : (isUrgent ? '#991b1b' : '#92400e');
 
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 24px;">
                 <tr>
                   <td style="padding: 20px;">
                     <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.6;">${content}</p>
                   </td>
                 </tr>
               </table>`;
 }
 
 export function tipBox(tipContent: string, plan: PlanType, options?: { showUpgradePrompt?: boolean }): string {
   const isPro = plan === 'pro';
   const showUpgrade = options?.showUpgradePrompt && !isPro;
   const bgColor = isPro ? '#f5f3ff' : '#f0f9ff';
   const borderColor = isPro ? '#c4b5fd' : '#bfdbfe';
   const textColor = isPro ? '#5b21b6' : '#1e40af';
   const upgradeLink = showUpgrade ? ` <a href="https://rehablookup.com/provider/billing" style="color: ${BRAND_COLORS.navyDark}; text-decoration: underline; font-weight: 600;">Upgrade to Pro</a>` : '';
 
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 24px;">
                 <tr>
                   <td style="padding: 20px;">
                     <p style="margin: 0; font-size: 14px; color: ${textColor}; line-height: 1.6;">
                       💡 <strong>Tip:</strong> ${tipContent}${upgradeLink}
                     </p>
                   </td>
                 </tr>
               </table>`;
 }
 
 export function usageBox(unlockedLeads: number, _unused: number, plan: PlanType): string {
   const isPro = plan === 'pro';
   const accentColor = isPro ? '#7c3aed' : BRAND_COLORS.navyDark;
   const discountText = isPro ? ' (20% Pro discount applied)' : '';
 
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_COLORS.grayLight}; border-radius: 12px; margin-bottom: 24px;">
                 <tr>
                   <td style="padding: 24px;">
                     <p style="margin: 0 0 8px 0; font-size: 13px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Leads Unlocked This Month</p>
                     <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${accentColor};">${unlockedLeads}</p>
                     ${isPro ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #16a34a; font-weight: 500;">${discountText}</p>` : ''}
                   </td>
                 </tr>
               </table>`;
 }
 
 export function ctaButton(text: string, url: string, plan: PlanType): string {
   const styles = getPlanStyles(plan);
 
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                 <tr>
                   <td align="center">
                     <a href="${url}" style="display: inline-block; background-color: ${styles.buttonBackground}; color: ${BRAND_COLORS.white}; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center;">
                       ${text}
                     </a>
                   </td>
                 </tr>
               </table>`;
 }
 
 export function emailFooter(options?: { includeNotificationSettings?: boolean; settingsUrl?: string; includeUnsubscribe?: boolean; unsubscribeUrl?: string }): string {
   const settingsUrl = options?.settingsUrl || 'https://rehablookup.com/provider/settings';
   const showSettings = options?.includeNotificationSettings !== false;
   const unsubscribeUrl = options?.unsubscribeUrl || 'https://rehablookup.com/provider/settings#notifications';
 
   return `
           <tr>
             <td style="background-color: ${BRAND_COLORS.navyDark}; padding: 48px 40px;" class="mobile-padding">
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                 <!-- Logo -->
                 <tr>
                   <td align="center" style="padding-bottom: 24px;">
                     <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.white}; letter-spacing: -0.5px;">Rehab<span style="color: ${BRAND_COLORS.accentBlue};">Lookup</span></span>
                   </td>
                 </tr>
                 
                 <!-- Tagline -->
                 <tr>
                   <td align="center" style="padding-bottom: 28px;">
                     <p style="margin: 0; color: ${BRAND_COLORS.grayMedium}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5;">
                       Connecting families with quality treatment centers
                     </p>
                   </td>
                 </tr>
                 
                 <!-- Social Media -->
                 <tr>
                   <td align="center" style="padding-bottom: 28px;">
                     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                       <tr>
                         <td style="padding: 0 6px;">
                           <a href="https://facebook.com/rehablookup" style="display: inline-block; width: 40px; height: 40px; background-color: ${BRAND_COLORS.navyMedium}; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                             <span style="color: ${BRAND_COLORS.white}; font-size: 18px; font-weight: bold;">f</span>
                           </a>
                         </td>
                         <td style="padding: 0 6px;">
                           <a href="https://twitter.com/rehablookup" style="display: inline-block; width: 40px; height: 40px; background-color: ${BRAND_COLORS.navyMedium}; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                             <span style="color: ${BRAND_COLORS.white}; font-size: 16px; font-weight: bold;">𝕏</span>
                           </a>
                         </td>
                         <td style="padding: 0 6px;">
                           <a href="https://linkedin.com/company/rehablookup" style="display: inline-block; width: 40px; height: 40px; background-color: ${BRAND_COLORS.navyMedium}; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                             <span style="color: ${BRAND_COLORS.white}; font-size: 14px; font-weight: bold;">in</span>
                           </a>
                         </td>
                         <td style="padding: 0 6px;">
                           <a href="https://instagram.com/rehablookup" style="display: inline-block; width: 40px; height: 40px; background-color: ${BRAND_COLORS.navyMedium}; border-radius: 50%; text-align: center; line-height: 40px; text-decoration: none;">
                             <span style="color: ${BRAND_COLORS.white}; font-size: 16px;">📷</span>
                           </a>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
                 
                 <!-- Links -->
                 <tr>
                   <td align="center" style="padding-bottom: 24px;">
                     <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                       <tr>
                         <td style="padding: 0 16px;">
                           <a href="https://rehablookup.com" style="color: ${BRAND_COLORS.grayMedium}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 500;">Website</a>
                         </td>
                         <td style="color: ${BRAND_COLORS.navyLight}; font-size: 13px;">•</td>
                         <td style="padding: 0 16px;">
                           <a href="https://rehablookup.com/contact" style="color: ${BRAND_COLORS.grayMedium}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 500;">Contact</a>
                         </td>
                         ${showSettings ? `
                         <td style="color: ${BRAND_COLORS.navyLight}; font-size: 13px;">•</td>
                         <td style="padding: 0 16px;">
                           <a href="${settingsUrl}" style="color: ${BRAND_COLORS.grayMedium}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 500;">Settings</a>
                         </td>
                         ` : ''}
                       </tr>
                     </table>
                   </td>
                 </tr>
                 
                 <!-- Divider -->
                 <tr>
                   <td style="padding-bottom: 24px;">
                     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                       <tr><td style="border-top: 1px solid ${BRAND_COLORS.navyLight};"></td></tr>
                     </table>
                   </td>
                 </tr>
                 
                 <!-- Copyright & Address -->
                 <tr>
                   <td align="center">
                     <p style="margin: 0 0 8px 0; color: ${BRAND_COLORS.grayMedium}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px;">
                       © ${new Date().getFullYear()} RehabLookup Inc. All rights reserved.
                     </p>
                     <p style="margin: 0 0 12px 0; color: ${BRAND_COLORS.navyLight}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px;">
                       San Diego, California, USA
                     </p>
                     <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px;">
                       <a href="${unsubscribeUrl}" style="color: ${BRAND_COLORS.grayMedium}; text-decoration: underline;">Unsubscribe</a>
                       <span style="color: ${BRAND_COLORS.navyLight}; margin: 0 8px;">|</span>
                       <a href="${settingsUrl}" style="color: ${BRAND_COLORS.grayMedium}; text-decoration: underline;">Manage preferences</a>
                     </p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>`;
 }
 
 export function emailDivider(): string {
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                 <tr><td style="border-top: 1px solid #e2e8f0;"></td></tr>
               </table>`;
 }
 
 export function infoListItem(label: string, value: string): string {
   return `
               <tr>
                 <td style="padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
                   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                     <tr>
                       <td style="color: ${BRAND_COLORS.textSecondary}; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${label}</td>
                       <td align="right" style="color: ${BRAND_COLORS.textPrimary}; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${value}</td>
                     </tr>
                   </table>
                 </td>
               </tr>`;
 }
 
 export function statsCard(label: string, value: string | number, subtext?: string, plan?: PlanType): string {
   const isPro = plan === 'pro';
   const accentColor = isPro ? '#7c3aed' : BRAND_COLORS.navyDark;
 
   return `
               <td style="background-color: ${BRAND_COLORS.grayLight}; padding: 24px 16px; border-radius: 12px; text-align: center; width: 33%;">
                 <p style="margin: 0 0 6px 0; font-size: 11px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${label}</p>
                 <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${accentColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${value}</p>
                 ${subtext ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: ${BRAND_COLORS.grayMedium}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${subtext}</p>` : ''}
               </td>`;
 }
 
 export function secondaryButton(text: string, url: string, plan: PlanType): string {
   const styles = getPlanStyles(plan);
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
                 <tr>
                   <td align="center">
                     <a href="${url}" style="display: inline-block; background-color: transparent; color: ${styles.buttonBackground}; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; border: 2px solid ${styles.buttonBackground}; text-align: center;">
                       ${text}
                     </a>
                   </td>
                 </tr>
               </table>`;
 }
 
 export function infoCard(icon: string, title: string, content: string, plan?: PlanType): string {
   const isPro = plan === 'pro';
   const accentColor = isPro ? BRAND_COLORS.accentPurple : BRAND_COLORS.navyDark;
 
   return `
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_COLORS.grayLight}; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${accentColor};">
                 <tr>
                   <td style="padding: 20px;">
                     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                       <tr>
                         <td style="width: 48px; vertical-align: top;">
                           <span style="font-size: 28px;">${icon}</span>
                         </td>
                         <td style="vertical-align: top;">
                           <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: ${BRAND_COLORS.textPrimary}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${title}</p>
                           <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${content}</p>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
               </table>`;
 }