/**
 * Lead Contact Information Masking Utilities
 * 
 * These utilities ensure contact information is masked for locked leads,
 * preventing data leaks in the UI layer.
 */

/**
 * Masks a lead name to "First N." format
 * Example: "John Smith" → "John S."
 */
export function maskLeadName(name: string | null | undefined): string {
  if (!name) return "●●●●●●";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "●●●●●●";
  
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] + "." : "";
  
  return `${firstName} ${lastInitial}`.trim();
}

/**
 * Masks an email address
 * Example: "john.doe@example.com" → "j●●●@●●●.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "●●●@●●●.com";
  
  const [local, domain] = email.split("@");
  if (!domain) return "●●●@●●●.com";
  
  const maskedLocal = local[0] + "●●●";
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  
  return `${maskedLocal}@●●●.${tld}`;
}

/**
 * Masks a phone number
 * Example: "(555) 123-4567" → "(●●●) ●●●-●●●●"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "(●●●) ●●●-●●●●";
  return "(●●●) ●●●-●●●●";
}

/**
 * Generates masked initials for avatar display
 * Returns "??" for locked leads
 */
export function getMaskedInitials(name: string | null | undefined, isLocked: boolean): string {
  if (isLocked || !name) return "??";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Interface for masked lead display
 */
export interface MaskedLeadDisplay {
  name: string;
  email: string;
  phone: string;
  initials: string;
  isLocked: boolean;
}

/**
 * Returns either masked or unmasked contact information based on unlock status
 */
export function getLeadDisplayInfo(
  lead: { name: string; email: string; phone: string },
  isUnlocked: boolean
): MaskedLeadDisplay {
  if (isUnlocked) {
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      initials: lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
      isLocked: false,
    };
  }
  
  return {
    name: maskLeadName(lead.name),
    email: maskEmail(lead.email),
    phone: maskPhone(lead.phone),
    initials: "??",
    isLocked: true,
  };
}
