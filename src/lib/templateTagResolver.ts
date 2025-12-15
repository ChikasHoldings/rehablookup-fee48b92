import { Tables } from "@/integrations/supabase/types";

export type TemplateTag = Tables<"template_tags">;

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  location_city_state?: string;
}

export interface ProviderData {
  primary_contact_name?: string;
  facility_name: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

export interface TemplateContext {
  lead: LeadData;
  provider: ProviderData;
}

// Platform constants
const PLATFORM_CONSTANTS: Record<string, string> = {
  platform_name: "RehabLookup",
  support_email: "support@rehablookup.com",
};

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

/**
 * Extract last name from full name
 */
function extractLastName(fullName: string): string {
  const parts = fullName.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

/**
 * Get value from context based on tag configuration
 */
function getValueFromContext(
  tag: TemplateTag,
  context: TemplateContext,
  allTags: TemplateTag[]
): string | null {
  const { source, path, fallback, key } = tag;

  let value: string | null = null;

  if (source === "platform") {
    value = PLATFORM_CONSTANTS[key] || null;
  } else if (source === "lead") {
    const lead = context.lead;
    switch (key) {
      case "lead_first_name":
        value = extractFirstName(lead.name);
        break;
      case "lead_last_name":
        value = extractLastName(lead.name);
        break;
      case "lead_email":
        value = lead.email;
        break;
      case "lead_phone":
        value = lead.phone || null;
        break;
      case "lead_location":
        value = lead.location_city_state || null;
        break;
      default:
        value = null;
    }
  } else if (source === "provider") {
    const provider = context.provider;
    switch (key) {
      case "provider_contact_name":
        value = provider.primary_contact_name || null;
        break;
      case "provider_name":
        value = provider.facility_name;
        break;
      case "provider_city":
        value = provider.city || null;
        break;
      case "provider_state":
        value = provider.state || null;
        break;
      case "provider_phone":
        value = provider.phone || null;
        break;
      case "provider_email":
        value = provider.email || null;
        break;
      default:
        value = null;
    }
  }

  // Apply fallback if value is empty and fallback is specified
  if (!value && fallback) {
    const fallbackTag = allTags.find((t) => t.key === fallback);
    if (fallbackTag) {
      value = getValueFromContext(fallbackTag, context, allTags);
    }
  }

  return value;
}

/**
 * Find all {{tag}} patterns in a template string
 */
export function findTagsInTemplate(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

/**
 * Resolve all tags in a template string with actual values
 */
export function resolveTemplate(
  template: string,
  context: TemplateContext,
  tags: TemplateTag[]
): { result: string; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const usedTags = findTagsInTemplate(template);

  let result = template;

  for (const tagKey of usedTags) {
    const tag = tags.find((t) => t.key === tagKey);

    if (!tag) {
      // Unknown tag
      warnings.push(`Unknown tag: {{${tagKey}}}`);
      continue;
    }

    const value = getValueFromContext(tag, context, tags);

    if (value === null || value === "") {
      if (tag.is_required) {
        errors.push(`Required tag missing value: {{${tagKey}}}`);
      } else {
        // Remove optional tags with no value (or replace with empty string)
        result = result.replace(new RegExp(`\\{\\{${tagKey}\\}\\}`, "g"), "");
      }
    } else {
      result = result.replace(new RegExp(`\\{\\{${tagKey}\\}\\}`, "g"), value);
    }
  }

  return { result, errors, warnings };
}

/**
 * Generate preview using example values from tags
 */
export function generatePreview(
  template: string,
  tags: TemplateTag[]
): { result: string; unknownTags: string[] } {
  const usedTags = findTagsInTemplate(template);
  const unknownTags: string[] = [];

  let result = template;

  for (const tagKey of usedTags) {
    const tag = tags.find((t) => t.key === tagKey);

    if (!tag) {
      unknownTags.push(tagKey);
      continue;
    }

    result = result.replace(
      new RegExp(`\\{\\{${tagKey}\\}\\}`, "g"),
      tag.example_value
    );
  }

  return { result, unknownTags };
}

/**
 * Validate template - check for unknown tags and missing required data
 */
export function validateTemplate(
  template: string,
  context: TemplateContext | null,
  tags: TemplateTag[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const usedTags = findTagsInTemplate(template);

  for (const tagKey of usedTags) {
    const tag = tags.find((t) => t.key === tagKey);

    if (!tag) {
      warnings.push(`Unknown tag: {{${tagKey}}}`);
      continue;
    }

    if (context) {
      const value = getValueFromContext(tag, context, tags);
      if ((value === null || value === "") && tag.is_required) {
        errors.push(`Required field "${tag.label}" is missing`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if template can be sent (no unresolved required tags)
 */
export function canSendTemplate(
  template: string,
  context: TemplateContext,
  tags: TemplateTag[]
): { canSend: boolean; reason?: string } {
  const { errors } = resolveTemplate(template, context, tags);

  if (errors.length > 0) {
    return {
      canSend: false,
      reason: errors[0],
    };
  }

  // Check for any remaining unresolved tags
  const resolved = resolveTemplate(template, context, tags).result;
  const remainingTags = findTagsInTemplate(resolved);

  if (remainingTags.length > 0) {
    return {
      canSend: false,
      reason: `Unresolved tags: ${remainingTags.map((t) => `{{${t}}}`).join(", ")}`,
    };
  }

  return { canSend: true };
}
