import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration - Basic plan gets 1 lifetime lead only
const PLAN_CONFIG: Record<string, { product_ids: string[]; is_paid: boolean }> = {
  basic: { product_ids: [], is_paid: false },
  professional: { product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], is_paid: true },
  featured: { product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], is_paid: true },
};

interface DirectLeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string | null;
}

// Validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)\+\.]/g, "");
  return /^\d{10,15}$/.test(digits);
}

function sanitizeInput(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength);
}

// Hash IP for rate limiting
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_direct_lead_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Direct lead email template for provider
function getDirectLeadEmail(
  facilityName: string,
  leadFirstName: string,
  leadLastName: string,
  leadPhone: string,
  leadEmail: string,
  message: string | null,
  supabaseUrl: string
): { subject: string; html: string } {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const dashboardUrl = "https://rehablookup.com/provider/leads";
  const fullName = `${leadFirstName} ${leadLastName}`;
  
  const subject = `📞 Direct Inquiry: ${fullName} wants to connect with ${facilityName}`;
  
  const messageSection = message ? `
    <tr>
      <td style="padding: 12px 0; color: hsl(220, 9%, 46%); vertical-align: top; font-size: 14px;">Message:</td>
      <td style="padding: 12px 0; color: hsl(215, 19%, 35%); font-size: 14px; line-height: 1.5;">${message}</td>
    </tr>
  ` : '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 29%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">📞 Direct Profile Inquiry</h1>
                    <p style="margin: 8px 0 0 0; font-size: 15px; color: hsla(0, 0%, 100%, 0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Someone reached out directly from your profile</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="font-size: 14px; color: hsl(220, 9%, 46%); margin: 0 0 24px 0;">
                Received on ${currentDate}
              </p>
              
              <!-- Success callout -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(141, 79%, 85%); border: 1px solid hsl(142, 69%, 58%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: hsl(143, 64%, 24%); font-weight: 600; font-size: 14px; line-height: 1.5;">
                      💚 This is a direct inquiry from your public profile - the user specifically chose ${facilityName}!
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Contact Details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(210, 20%, 98%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 18px; color: hsl(217, 54%, 23%); font-weight: 600;">Contact Details</h2>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 12px 0; color: hsl(220, 9%, 46%); width: 100px; vertical-align: top; font-size: 14px;">Name:</td>
                        <td style="padding: 12px 0; font-weight: 600; font-size: 16px; color: hsl(215, 19%, 35%);">${fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: hsl(220, 9%, 46%); vertical-align: top; font-size: 14px;">Phone:</td>
                        <td style="padding: 12px 0;">
                          <a href="tel:${leadPhone}" style="color: hsl(217, 54%, 23%); text-decoration: none; font-weight: 600; font-size: 16px;">${leadPhone}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; color: hsl(220, 9%, 46%); vertical-align: top; font-size: 14px;">Email:</td>
                        <td style="padding: 12px 0;">
                          <a href="mailto:${leadEmail}" style="color: hsl(217, 54%, 23%); text-decoration: none; font-size: 14px;">${leadEmail}</a>
                        </td>
                      </tr>
                      ${messageSection}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Action buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="tel:${leadPhone}" style="display: inline-block; background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 29%) 100%); color: hsl(0, 0%, 100%); padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                            📞 Call Now
                          </a>
                        </td>
                        <td>
                          <a href="mailto:${leadEmail}" style="display: inline-block; background: hsl(0, 0%, 100%); color: hsl(217, 54%, 23%); padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; border: 2px solid hsl(217, 54%, 23%);">
                            ✉️ Send Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; color: hsl(220, 9%, 46%); padding: 12px 32px; text-decoration: none; font-size: 14px;">
                      View in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td style="border-top: 1px solid hsl(220, 13%, 91%);"></td>
                </tr>
              </table>
              
              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(138, 76%, 97%); border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: hsl(143, 64%, 24%); font-size: 13px; line-height: 1.5;">
                      <strong>Note:</strong> Direct profile inquiries do not count toward your monthly qualified lead limits.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Connecting families with trusted treatment providers</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://rehablookup.com/privacy-policy" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Privacy Policy</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://rehablookup.com/terms-of-service" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Terms of Service</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="mailto:help@rehablookup.com" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  return { subject, html };
}

// Check provider's subscription plan
async function getProviderPlan(providerEmail: string): Promise<string> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    return "basic";
  }
  
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      return "basic";
    }
    
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      return "basic";
    }
    
    const productId = subscriptions.data[0].items.data[0].price.product as string;
    
    if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
      return "featured";
    } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
      return "professional";
    }
    
    return "basic";
  } catch (error) {
    console.error("Error checking provider plan:", error);
    return "basic";
  }
}

// Special email template for Basic plan providers - prompts to upgrade to view leads
function getBasicPlanUpgradeEmail(
  facilityName: string,
  totalLeadsCount: number
): { subject: string; html: string } {
  const billingUrl = "https://rehablookup.com/provider/billing";
  const dashboardUrl = "https://rehablookup.com/provider/leads";
  
  const subject = `🔒 New Lead Waiting - Upgrade to View & Contact`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🔒 Someone Is Looking for Help</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You have a new lead waiting for ${facilityName}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    
    <!-- Lead Preview (Blurred) -->
    <div style="position: relative; margin-bottom: 24px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; filter: blur(4px); user-select: none;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Name: ████████ ████████</p>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Phone: (███) ███-████</p>
        <p style="margin: 0; font-size: 16px; color: #374151;">Email: ████@████.com</p>
      </div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255,255,255,0.95); padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <p style="margin: 0 0 8px 0; font-size: 20px;">🔒</p>
        <p style="margin: 0; font-weight: 600; color: #1B365D;">Upgrade to View</p>
      </div>
    </div>
    
    <!-- Leads Waiting Counter -->
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 40px; font-weight: 700; color: #16a34a;">${totalLeadsCount}</p>
      <p style="margin: 0; font-size: 16px; color: #15803d; font-weight: 500;">Lead${totalLeadsCount !== 1 ? 's' : ''} Waiting For You</p>
    </div>
    
    <!-- Value Proposition -->
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">Unlock Your Leads:</h2>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">See full contact details instantly</li>
        <li style="margin-bottom: 8px;">Call or email leads directly</li>
        <li style="margin-bottom: 8px;">Show your phone number on your profile</li>
        <li style="margin-bottom: 8px;">Get 25 exclusive qualified leads/month</li>
      </ul>
    </div>
    
    <!-- CTA -->
    <div style="text-align: center;">
      <a href="${billingUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);">
        Upgrade Now - Start at $399/mo
      </a>
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">
        <a href="${dashboardUrl}" style="color: #6b7280; text-decoration: underline;">View in Dashboard</a>
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">
      This is a direct inquiry from someone who visited your profile on RehabLookup.
    </p>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; padding: 20px;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
      <a href="https://rehablookup.com/privacy-policy" style="color: #6b7280; text-decoration: none;">Privacy Policy</a> | 
      <a href="mailto:help@rehablookup.com" style="color: #6b7280; text-decoration: none;">Support</a>
    </p>
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

// User confirmation email template
function getUserConfirmationEmail(
  firstName: string,
  facilityName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(217, 54%, 23%) 0%, hsl(217, 41%, 35%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">Request Received</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: hsl(215, 19%, 35%); line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: hsl(215, 19%, 35%); line-height: 1.6;">
                We've forwarded your request to <strong>${facilityName}</strong>. They may contact you soon to discuss how they can help.
              </p>
              
              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(138, 76%, 97%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; color: hsl(143, 64%, 24%); font-weight: 600; font-size: 15px;">What happens next?</p>
                    <ul style="margin: 0; padding-left: 20px; color: hsl(143, 64%, 24%); font-size: 14px; line-height: 1.6;">
                      <li style="margin-bottom: 8px;">A representative from ${facilityName} may reach out by phone or email</li>
                      <li style="margin-bottom: 8px;">There's no obligation to proceed</li>
                      <li>Feel free to explore other options while you wait</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 8px 0; font-size: 14px; color: hsl(220, 9%, 46%); line-height: 1.6;">
                If you have questions, visit <a href="https://rehablookup.com" style="color: hsl(217, 54%, 23%); text-decoration: none; font-weight: 500;">RehabLookup.com</a> or contact us at <a href="mailto:help@rehablookup.com" style="color: hsl(217, 54%, 23%); text-decoration: none; font-weight: 500;">help@rehablookup.com</a>.
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 15px; color: hsl(215, 19%, 35%); line-height: 1.6;">
                Warm regards,<br>
                <strong>The RehabLookup Team</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Connecting families with trusted treatment providers</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://rehablookup.com/privacy-policy" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Privacy Policy</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="https://rehablookup.com/terms-of-service" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Terms of Service</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="mailto:help@rehablookup.com" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Contact Us</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DirectLeadRequest = await req.json();
    console.log("Direct lead submission received:", { 
      facilityId: body.facilityId, 
      facilityName: body.facilityName 
    });

    // Validate required fields
    if (!body.facilityId || !body.firstName || !body.lastName || !body.email || !body.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const firstName = sanitizeInput(body.firstName, 50);
    const lastName = sanitizeInput(body.lastName, 50);
    const email = sanitizeInput(body.email.toLowerCase(), 255);
    const phone = sanitizeInput(body.phone, 20);
    const message = body.message ? sanitizeInput(body.message, 1000) : null;
    const fullName = `${firstName} ${lastName}`;

    // Validate email and phone
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "INVALID_EMAIL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "INVALID_PHONE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    // Check for recent submissions from same IP/email (rate limiting)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", body.facilityId)
      .or(`email.eq.${email},ip_hash.eq.${ipHash}`)
      .gte("created_at", oneHourAgo);

    if ((recentCount || 0) >= 3) {
      console.log("Rate limit exceeded for direct lead:", { email, ipHash });
      return new Response(
        JSON.stringify({ error: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate submission (same email + facility within 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("facility_id", body.facilityId)
      .eq("email", email)
      .gte("created_at", oneDayAgo)
      .maybeSingle();

    if (existingLead) {
      console.log("Duplicate direct lead prevented:", { email, facilityId: body.facilityId });
      return new Response(
        JSON.stringify({ error: "DUPLICATE", message: "You've already submitted a request to this facility." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify facility exists and is approved
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, user_id, status, email, name")
      .eq("id", body.facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError || !facility) {
      console.error("Facility not found or not approved:", body.facilityId);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    const providerEmail = profile?.email || facility.email;

    // Create the lead record
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: body.facilityId,
        name: fullName,
        email: email,
        phone: phone,
        message: message,
        preferred_contact: "call",
        source: "provider_profile_direct",
        qualified: true,
        email_verified: false,
        validation_status: "valid",
        assignment_status: "assigned",
        assignment_reason: "Direct profile inquiry",
        assigned_at: new Date().toISOString(),
        ip_hash: ipHash,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create direct lead:", leadError);
      throw leadError;
    }

    console.log("Direct lead created successfully:", lead.id);

    // Log routing for admin visibility
    await supabase.from("lead_routing_logs").insert({
      lead_id: lead.id,
      assigned_provider_id: body.facilityId,
      assignment_reason: "Direct profile inquiry - routed to selected provider",
      routing_source: "direct_profile",
      eligibility_check_result: { direct_inquiry: true, skip_scoring: true },
    });

    // Send provider notification email based on their plan
    if (providerEmail && resendKey) {
      try {
        const resend = new Resend(resendKey);
        
        // Check provider's plan to send appropriate email
        const providerPlan = await getProviderPlan(providerEmail);
        console.log("Provider plan:", { providerEmail, plan: providerPlan });
        
        let emailContent;
        if (providerPlan === "basic") {
          // Basic plan: send upgrade email with blurred lead details
          // Get total leads count for the facility
          const { count: totalLeads } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("facility_id", body.facilityId);
          
          emailContent = getBasicPlanUpgradeEmail(
            body.facilityName,
            totalLeads || 1
          );
          console.log("Sending basic plan upgrade email");
        } else {
          // Paid plan: send full lead details
          emailContent = getDirectLeadEmail(
            body.facilityName,
            firstName,
            lastName,
            phone,
            email,
            message,
            supabaseUrl
          );
          console.log("Sending full lead details email");
        }

        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [providerEmail],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log("Provider notification email sent to:", providerEmail);
      } catch (emailError) {
        console.error("Failed to send provider email:", emailError);
      }
    }

    // Create in-app provider notification
    await supabase.from("provider_notifications").insert({
      user_id: facility.user_id,
      facility_id: body.facilityId,
      type: "new_lead",
      title: "New Direct Inquiry",
      message: `${fullName} submitted a direct inquiry from your profile.`,
      metadata: { lead_id: lead.id, source: "provider_profile_direct" },
    });

    // Send user confirmation email
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [email],
          subject: `We've sent your request to ${body.facilityName}`,
          html: getUserConfirmationEmail(firstName, body.facilityName),
        });
        console.log("User confirmation email sent to:", email);
      } catch (userEmailError) {
        console.error("Failed to send user confirmation:", userEmailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in submit-direct-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
