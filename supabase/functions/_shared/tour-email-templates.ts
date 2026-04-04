/**
 * Tour Notification Email Templates
 * Branded styling matching concierge notification templates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TourEmailData {
  seekerName: string;
  facilityName: string;
  facilityCity: string;
  facilityState: string;
  tourType: "in-person" | "virtual";
  preferredDates?: string[];
  proposedDateTime?: string;
  confirmedDateTime?: string;
  notes?: string;
  contactPreference?: string;
  facilityNotes?: string;
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
    ? `<p style="margin: 8px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${subtitle}</p>` 
    : '';

  return `
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              ${iconHtml}
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP CONCIERGE</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
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
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 24px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">RehabLookup Concierge</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif;">Personalized treatment matching</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Website</a>
                      <span style="color: #64748b; margin: 0 8px;">|</span>
                      <a href="mailto:placement@rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Support</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`;
}

function infoBox(content: string, borderColor: string = BRAND_COLORS.accent): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
                  </td>
                </tr>
              </table>
`;
}

function successBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ECFDF5; border-left: 4px solid ${BRAND_COLORS.success}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
                  </td>
                </tr>
              </table>
`;
}

function warningBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFFBEB; border-left: 4px solid ${BRAND_COLORS.warning}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
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

function formatTourType(type: string): string {
  return type === "virtual" ? "🎥 Virtual Tour" : "🏠 In-Person Tour";
}

function formatPreferredDates(dates: string[]): string {
  if (!dates || dates.length === 0) return "Flexible";
  return dates.map(d => {
    try {
      return new Date(d).toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return d;
    }
  }).join(" • ");
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email sent to facility when user requests a tour
 */
export function tourRequestedFacilityEmail(data: TourEmailData): string {
  const tourDetails = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Seeker:</strong> ${data.seekerName}
    </p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Tour Type:</strong> ${formatTourType(data.tourType)}
    </p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Preferred Dates:</strong> ${formatPreferredDates(data.preferredDates || [])}
    </p>
    ${data.contactPreference ? `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Contact Preference:</strong> ${data.contactPreference}
    </p>` : ''}
    ${data.notes ? `
    <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; font-style: italic;">
      "${data.notes}"
    </p>` : ''}
  `;

  const content = `
    ${paragraph(`A concierge client has requested a tour at your facility.`)}
    ${infoBox(tourDetails)}
    ${paragraph(`Please log in to your provider dashboard to propose a tour time. Quick responses help convert interested seekers into admissions.`)}
    ${ctaButton("View Tour Request", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("New Tour Request", `${data.facilityName}`, "📅") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to admin when user requests a tour
 */
export function tourRequestedAdminEmail(data: TourEmailData): string {
  const content = `
    ${paragraph(`<strong>Seeker:</strong> ${data.seekerName}`)}
    ${paragraph(`<strong>Facility:</strong> ${data.facilityName} (${data.facilityCity}, ${data.facilityState})`)}
    ${paragraph(`<strong>Tour Type:</strong> ${formatTourType(data.tourType)}`)}
    ${paragraph(`<strong>Preferred Dates:</strong> ${formatPreferredDates(data.preferredDates || [])}`)}
    ${data.notes ? paragraph(`<strong>Notes:</strong> ${data.notes}`) : ''}
  `;

  return emailWrapper(
    emailHeader("Tour Request Created", `${data.seekerName} → ${data.facilityName}`) +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to user when facility proposes a time
 */
export function tourProposedUserEmail(data: TourEmailData): string {
  const firstName = data.seekerName.split(" ")[0];
  const proposedTime = data.proposedDateTime ? formatDateTime(data.proposedDateTime) : "See details";

  const proposalBox = `
    <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
      Proposed Tour Time
    </p>
    <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.accent};">
      ${proposedTime}
    </p>
    ${data.facilityNotes ? `
    <p style="margin: 12px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; font-style: italic;">
      "${data.facilityNotes}"
    </p>` : ''}
  `;

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`Great news! <strong>${data.facilityName}</strong> has responded to your ${data.tourType === "virtual" ? "virtual" : "in-person"} tour request and proposed a time.`)}
    ${infoBox(proposalBox, BRAND_COLORS.accent)}
    ${paragraph(`Please log in to your concierge portal to accept this time or request a different one.`)}
    ${ctaButton("View & Respond", "https://rehablookup.com/account/concierge", BRAND_COLORS.success)}
  `;

  return emailWrapper(
    emailHeader("Tour Time Proposed", data.facilityName, "🗓️") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when user confirms tour
 */
export function tourConfirmedFacilityEmail(data: TourEmailData): string {
  const confirmedTime = data.confirmedDateTime ? formatDateTime(data.confirmedDateTime) : "See details";

  const confirmationBox = `
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
      ✓ Confirmed Tour
    </p>
    <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #065F46;">
      ${confirmedTime}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Seeker:</strong> ${data.seekerName}
    </p>
    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Tour Type:</strong> ${formatTourType(data.tourType)}
    </p>
  `;

  const content = `
    ${paragraph(`${data.seekerName} has accepted your proposed tour time.`)}
    ${successBox(confirmationBox)}
    ${paragraph(`Please ensure you're prepared to welcome them at the scheduled time. A positive tour experience is crucial for conversions.`)}
    ${ctaButton("View Tour Details", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Confirmed!", data.facilityName, "✅") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when user cancels tour
 */
export function tourCancelledFacilityEmail(data: TourEmailData): string {
  const content = `
    ${paragraph(`${data.seekerName} has cancelled their ${data.tourType} tour request at ${data.facilityName}.`)}
    ${warningBox(`
      <p style="margin: 0; font-size: 15px; color: #92400E;">
        The seeker may have found another facility or changed their timeline. 
        Continue engaging with other concierge leads in your dashboard.
      </p>
    `)}
    ${ctaButton("View Dashboard", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Cancelled", data.facilityName, "❌") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to user when facility cancels (or declines)
 */
export function tourCancelledUserEmail(data: TourEmailData): string {
  const firstName = data.seekerName.split(" ")[0];

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`Unfortunately, ${data.facilityName} is unable to accommodate your tour request at this time.`)}
    ${infoBox(`
      <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
        Don't worry — you can request tours from other matched facilities in your concierge portal. 
        Our team is here to help you find the right treatment center.
      </p>
    `)}
    ${ctaButton("View Other Matches", "https://rehablookup.com/account/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Update", data.facilityName, "ℹ️") +
    emailBody(content) +
    emailFooter()
  );
}
