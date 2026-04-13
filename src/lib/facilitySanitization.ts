/**
 * Input sanitization utilities for facility data.
 * Used across ProviderSignup, AddLocation, and ListingEditor.
 */

import { FACILITY_TYPE_VALUES, US_STATES } from "./facilityConstants";

/**
 * Strip HTML tags, JS protocol handlers, and inline event handlers from text.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")        // strip HTML tags
    .replace(/javascript:/gi, "")    // strip JS protocol
    .replace(/on\w+\s*=/gi, "")      // strip inline event handlers
    .trim();
}

/**
 * Sanitize and validate a facility name.
 */
export function sanitizeFacilityName(name: string): string {
  const clean = sanitizeText(name).slice(0, 100);
  return clean;
}

/**
 * Validate facility_type against the approved whitelist.
 * Returns the type if valid, throws otherwise.
 */
export function validateFacilityType(type: string): string {
  if (!FACILITY_TYPE_VALUES.includes(type as any)) {
    throw new Error(`Invalid facility type: "${type}"`);
  }
  return type;
}

/**
 * Validate state against the US states list.
 */
export function validateState(state: string): string {
  if (!US_STATES.includes(state as any)) {
    throw new Error(`Invalid state: "${state}"`);
  }
  return state;
}

/**
 * Validate ZIP code format (5-digit or 5+4).
 */
export function validateZipCode(zip: string): string {
  const trimmed = zip.trim();
  if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
    throw new Error("Invalid ZIP code format");
  }
  return trimmed;
}

/**
 * Validate email format (optional field).
 */
export function validateEmail(email: string | null | undefined): string | null {
  if (!email || email.trim() === "") return null;
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Invalid email format");
  }
  if (trimmed.length > 255) {
    throw new Error("Email must be 255 characters or less");
  }
  return trimmed;
}

/**
 * Validate phone number format.
 */
export function validatePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!/^[\d\s\-\(\)\+]{7,30}$/.test(trimmed)) {
    throw new Error("Invalid phone number format");
  }
  return trimmed;
}

/**
 * Sanitize and truncate a description field.
 */
export function sanitizeDescription(desc: string | null | undefined, maxLength = 2000): string | null {
  if (!desc) return null;
  return sanitizeText(desc).slice(0, maxLength) || null;
}

/**
 * Sanitize and validate a website URL.
 */
export function sanitizeWebsite(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  const trimmed = url.trim().slice(0, 500);
  // Strip dangerous protocols
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Sanitize all facility fields for safe database insertion.
 * Returns a clean object ready for insert/update.
 */
export function sanitizeFacilityPayload(data: {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  facility_type: string;
  [key: string]: unknown;
}): Record<string, unknown> {
  // Validate critical enums
  validateFacilityType(data.facility_type);
  validateState(data.state);
  validateZipCode(data.zip_code);
  validatePhone(data.phone);

  return {
    ...data,
    name: sanitizeFacilityName(data.name),
    address: sanitizeText(data.address).slice(0, 200),
    city: sanitizeText(data.city).slice(0, 100),
    state: data.state,
    zip_code: data.zip_code.trim(),
    phone: data.phone.trim(),
    email: validateEmail(data.email),
    website: sanitizeWebsite(data.website),
    description: sanitizeDescription(data.description),
    facility_type: data.facility_type,
  };
}
