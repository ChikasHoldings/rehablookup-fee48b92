/**
 * Message Notification Email Templates
 * Branded styling matching concierge notification templates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MessageEmailData {
  seekerName: string;
  seekerEmail: string;
  facilityName?: string;
  senderName: string;
  senderType: "seeker" | "facility" | "advisor";
  messagePreview: string;
  threadType: "advisor" | "facility";
}

// ============================================================================
// SHARED COMPONENTS
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
};

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
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
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function emailHeader(title: string, subtitle?: string, icon?: string): string {
  const iconHtml = icon 
    ? `<div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>` 
    : '';
  const subtitleHtml = subtitle 
    ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">${subtitle}</p>` 
    : '';

  return `
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryLight} 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              ${iconHtml}
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP CONCIERGE</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                ${title}
              </h1>
              ${subtitleHtml}
            </td>
          </tr>
`;
}

function emailBody(content: string): string {
  return `
          <tr>
            <td style="background: ${BRAND_COLORS.cardBg}; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid ${BRAND_COLORS.border}; border-right: 1px solid ${BRAND_COLORS.border};">
              ${content}
            </td>
          </tr>
`;
}

function emailFooter(): string {
  return `
          <tr>
            <td style="background: ${BRAND_COLORS.primary}; padding: 24px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">RehabLookup Concierge</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Personalized treatment matching</p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Website</a>
                      <span style="color: rgba(255,255,255,0.4); margin: 0 8px;">|</span>
                      <a href="mailto:placement@rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Support</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`;
}

function messageBox(content: string, senderLabel: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-left: 4px solid ${BRAND_COLORS.accent}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${senderLabel}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary}; line-height: 1.6; white-space: pre-wrap;">
                      "${content}"
                    </p>
                  </td>
                </tr>
              </table>
`;
}

function ctaButton(text: string, url: string, color: string = BRAND_COLORS.primary): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; background: ${color}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      ${text}
                    </a>
                  </td>
                </tr>
              </table>
`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">${text}</p>`;
}

function truncateMessage(message: string, maxLength: number = 200): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength).trim() + "...";
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email sent to seeker when facility or advisor sends a message
 */
export function messageToSeekerEmail(data: MessageEmailData): string {
  const firstName = data.seekerName.split(" ")[0];
  const senderLabel = data.senderType === "advisor" 
    ? "Your Placement Advisor" 
    : data.facilityName || "Treatment Center";

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`You have a new message in your concierge portal.`)}
    ${messageBox(truncateMessage(data.messagePreview), senderLabel)}
    ${paragraph(`Log in to your portal to view the full message and respond.`)}
    ${ctaButton("View & Reply", "https://rehablookup.com/account/concierge", BRAND_COLORS.accent)}
  `;

  return emailWrapper(
    emailHeader("New Message", senderLabel, "💬") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when seeker sends a message
 */
export function messageToFacilityEmail(data: MessageEmailData): string {
  const content = `
    ${paragraph(`${data.seekerName} has sent you a message through the concierge portal.`)}
    ${messageBox(truncateMessage(data.messagePreview), data.seekerName)}
    ${paragraph(`Quick responses help build trust and increase conversion rates. Log in to your provider dashboard to reply.`)}
    ${ctaButton("Reply Now", "https://rehablookup.com/provider/concierge", BRAND_COLORS.primary)}
  `;

  return emailWrapper(
    emailHeader("New Seeker Message", data.seekerName, "📨") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to admin/advisor when seeker sends a message in advisor thread
 */
export function messageToAdvisorEmail(data: MessageEmailData): string {
  const content = `
    ${paragraph(`A concierge client has sent a message in their advisor thread.`)}
    ${messageBox(truncateMessage(data.messagePreview), data.seekerName)}
    ${paragraph(`Log in to the admin dashboard to respond.`)}
    ${ctaButton("View Message", "https://rehablookup.com/admin/concierge", BRAND_COLORS.primary)}
  `;

  return emailWrapper(
    emailHeader("Advisor Thread Message", data.seekerName, "📩") +
    emailBody(content) +
    emailFooter()
  );
}
