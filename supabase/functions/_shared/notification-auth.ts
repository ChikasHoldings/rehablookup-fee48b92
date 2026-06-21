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

  const { data: role } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

  return { ok: true, actor: role ? "admin" : "user", userId: user.id };
}
