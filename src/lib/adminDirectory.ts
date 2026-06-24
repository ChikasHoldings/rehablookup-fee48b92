import { supabase } from "@/integrations/supabase/client";

/**
 * Non-sensitive admin directory entry — identity + role + status only.
 * Deliberately excludes commission_rate / employment_type / hire_date /
 * last_login_at / mfa flags / phone, which are tier-restricted on
 * admin_user_profiles.
 */
export interface AdminDirectoryEntry {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  admin_role: string;
  status: string;
}

/**
 * Fetch the admin directory via the `get_admin_directory` SECURITY DEFINER RPC.
 *
 * The `admin_user_profiles` table SELECT is tier-restricted (a lower admin tier
 * can read only its OWN row), so name-resolution and assignee-dropdown reads
 * that need OTHER admins' identity must go through this RPC instead of querying
 * the table directly. The RPC self-gates to active admins and returns only
 * non-sensitive columns. Returns [] for non-admins.
 *
 * Not yet in the generated Supabase types, hence the `as never` cast.
 */
export async function fetchAdminDirectory(): Promise<AdminDirectoryEntry[]> {
  const { data, error } = await supabase.rpc("get_admin_directory" as never);
  if (error) throw error;
  return (data as AdminDirectoryEntry[] | null) ?? [];
}

/** Resolve a display name from a directory entry, with a sensible fallback. */
export function adminDisplayName(
  entry: Pick<AdminDirectoryEntry, "display_name" | "first_name" | "last_name"> | undefined | null,
  fallback = "Admin",
): string {
  if (!entry) return fallback;
  return (
    entry.display_name ||
    [entry.first_name, entry.last_name].filter(Boolean).join(" ") ||
    fallback
  );
}
