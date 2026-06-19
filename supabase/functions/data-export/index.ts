import { requireAdmin } from '../_shared/require-admin.ts';

// Local CORS headers — superset of the shared helper's, plus the x-export-secret
// request header this endpoint requires for its second auth factor.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This endpoint can dump any table, PII, and auth users via the service-role
  // key, so it requires TWO independent factors (defense in depth):
  //
  //   1. A shared secret header (x-export-secret). Prefer a dedicated
  //      DATA_EXPORT_SECRET; fall back to SMOKE_CRON_SECRET only until one is
  //      provisioned (M3). Fail closed if neither env var is set — never fall
  //      back to a hardcoded value. Once DATA_EXPORT_SECRET is set the cron
  //      secret stops working here.
  //   2. A verified, active admin identity (Authorization: Bearer <admin JWT>).
  //      verify_jwt=true at the platform only proves *some* valid JWT is present
  //      (the public anon key satisfies it); requireAdmin binds the call to a
  //      real admin_user_profiles row so exports are attributable to a person.
  //
  // Callers must therefore send BOTH an admin user's access token in the
  // Authorization header AND the x-export-secret header.
  const exportSecret = req.headers.get('x-export-secret');
  const EXPORT_SECRET = Deno.env.get('DATA_EXPORT_SECRET') ?? Deno.env.get('SMOKE_CRON_SECRET');

  if (!EXPORT_SECRET || exportSecret !== EXPORT_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Factor 2: bind to a verified active admin. Returns a service-role client.
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { adminUserId, supabase } = auth;

  const url = new URL(req.url);
  const table = url.searchParams.get('table');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = parseInt(url.searchParams.get('limit') || '1000');
  const action = url.searchParams.get('action') || 'data';

  // Accountability: record who exported what (server-side log + best-effort
  // audit row). Never blocks the export if the audit insert fails.
  console.log(`[data-export] admin ${adminUserId} action=${action} table=${table ?? '-'} offset=${offset} limit=${limit}`);
  try {
    await supabase.from('admin_audit_log').insert({
      admin_user_id: adminUserId,
      action_type: 'data_export',
      target_type: 'data_export',
      target_id: null,
      details: { action, table: table ?? null, offset, limit },
    });
  } catch (auditErr) {
    console.error('[data-export] audit log insert failed (non-fatal)', auditErr);
  }

  try {
    if (action === 'tables') {
      // List all tables with row counts
      const { data, error } = await supabase.rpc('get_table_counts');
      if (error) {
        // Fallback: just list tables from information_schema
        const { data: tables, error: tablesError } = await supabase
          .from('information_schema.tables' as any)
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_type', 'BASE TABLE');

        if (tablesError) {
          // Use raw SQL via pg
          return new Response(JSON.stringify({
            error: tablesError.message,
            hint: 'Use action=data with specific table name'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ tables }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'data' && table) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (error) {
        return new Response(JSON.stringify({ error: error.message, table }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        table,
        offset,
        limit,
        count,
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'users') {
      // Export auth users (admin only)
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page: Math.floor(offset / limit) + 1,
        perPage: limit
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use: tables, data?table=name, users'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // Log the detail server-side (visible in function logs); never return it in
    // the response body (M3 — was leaking String(err) with internal detail).
    console.error('[data-export] unhandled error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
