// Shared per-actor authorization for message-triggered notification dispatchers
// (send-message-notifications, send-concierge-notifications, send-tour-notifications).
//
// These dispatchers run verify_jwt=false so a single endpoint can serve BOTH
// server-to-server (service-role) calls AND browser seekers / providers / admins.
// Historically that meant they trusted the request body entirely: any
// unauthenticated caller who knew a thread / inquiry / tour UUID could fan out
// emails or SMS carrying PHI, or spoof the sender. This restores a real identity
// model without breaking the mixed caller set:
//
//   - service-role bearer            → actor "service" (trusted server-to-server)
//   - valid user JWT with admin role → actor "admin"
//   - valid user JWT (non-admin)     → actor "user"  (the dispatcher MUST then
//                                       verify the caller is a participant /
//                                       owner of the target record)
//   - anything else                  → 401
//
// NOTE: the three dispatchers are deploy-time *inlined* artifacts (see
// scripts/inline-shared.py); each carries an inlined copy of this logic. Keep
// those copies in sync with this canonical source.

export type NotifierActor = "service" | "admin" | "user";

export type AuthorizeResult =
  | { ok: true; actor: NotifierActor; userId: string | null }
  | { ok: false; status: number; error: string };

/**
 * Classify the caller. `admin` is a service-role Supabase client created by the
 * caller (used both to validate the bearer JWT and to look up the admin role).
 */
// deno-lint-ignore no-explicit-any
export async function authorizeNotifier(req: Request, admin: any): Promise<AuthorizeResult> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "unauthorized" };

  // Server-to-server with the service-role key.
  if (serviceKey && token === serviceKey) return { ok: true, actor: "service", userId: null };

  // Otherwise it must be a valid user JWT (the anon key resolves to no user → 401).
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "unauthorized" };

  // Admin/staff = an ACTIVE admin-console member (super_admin / admin / advisor)
  // OR a user_roles admin. This must match how the admin & concierge panels
  // authorize their users: advisors are staff who orchestrate notifications but
  // are NOT in user_roles (user_is_admin / has_role both return false for them),
  // so keying on user_roles alone would wrongly reject every advisor.
  const { data: staff } = await admin
    .from("admin_user_profiles").select("user_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  let isAdmin = !!staff;
  if (!isAdmin) {
    const { data: role } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
  }

  return { ok: true, actor: isAdmin ? "admin" : "user", userId: user.id };
}
