/**
 * Admin Input Validation Schemas
 * Centralized Zod schemas for all admin form inputs to prevent XSS & injection.
 */
import { z } from "zod";

// Shared field validators
const safeString = z.string().trim().max(255, "Too long (max 255 chars)");
const safeEmail = z.string().trim().email("Invalid email address").max(255);
const safeName = safeString.min(1, "Required").regex(/^[a-zA-Z\s\-'.]+$/, "Only letters, spaces, hyphens, and apostrophes");
const safePhone = z.string().trim().max(20).regex(/^[\d\s\-+().]*$/, "Invalid phone format").optional().or(z.literal(""));
const safeUUID = z.string().uuid("Invalid ID format");

// Strip any HTML/script tags from user input
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")        // strip HTML tags
    .replace(/javascript:/gi, "")    // strip JS protocol
    .replace(/on\w+\s*=/gi, "")      // strip inline event handlers
    .trim();
}

// Admin user creation schema
export const createAdminUserSchema = z.object({
  firstName: safeName.max(50, "First name too long"),
  lastName: z.string().trim().max(50, "Last name too long").optional().or(z.literal("")),
  email: safeEmail,
  phone: safePhone,
  adminRole: z.enum(["super_admin", "manager", "customer_rep", "advisor"]),
  employmentType: z.enum(["employee", "contractor", "va"]).optional(),
  commissionRate: z.number().int().min(1).max(100).optional(),
  hireDate: z.string().max(10).optional().or(z.literal("")),
  permissions: z.record(z.string(), z.boolean()),
});

// Ban user schema
export const banUserSchema = z.object({
  userId: safeUUID,
  reason: safeString.min(1, "Reason is required").max(500, "Reason too long"),
});

// Escalation schema
export const escalationSchema = z.object({
  subject: safeString.min(1, "Subject is required").max(200, "Subject too long"),
  description: z.string().trim().min(1, "Description is required").max(2000, "Description too long"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  relatedId: safeUUID.optional().nullable(),
  relatedType: z.string().max(50).optional().nullable(),
});

// Support ticket response schema
export const ticketResponseSchema = z.object({
  ticketId: safeUUID,
  content: z.string().trim().min(1, "Message is required").max(5000, "Message too long"),
});

// Admin notes schema (for admin_notes fields)
export const adminNotesSchema = z.object({
  notes: z.string().trim().max(2000, "Notes too long"),
});

// Blog article schema
export const blogArticleSchema = z.object({
  title: safeString.min(1, "Title is required").max(200, "Title too long"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes").max(200),
  excerpt: z.string().trim().min(1, "Excerpt is required").max(500),
  author: safeName.max(100),
  category: safeString.min(1),
  categoryLabel: safeString.min(1).max(50),
  readTime: safeString.max(20),
  status: z.enum(["draft", "published", "archived"]),
});

// Validate and return parsed data or error messages
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { success: false, errors };
}

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type EscalationInput = z.infer<typeof escalationSchema>;
