import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Security: require export secret. Fail closed if the env var is unset —
  // never fall back to a hardcoded secret (this endpoint can dump any table,
  // PII, and auth users via the service-role key).
  const exportSecret = req.headers.get('x-export-secret');
  const EXPORT_SECRET = Deno.env.get('SMOKE_CRON_SECRET');

  if (!EXPORT_SECRET || exportSecret !== EXPORT_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const table = url.searchParams.get('table');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = parseInt(url.searchParams.get('limit') || '1000');
  const action = url.searchParams.get('action') || 'data';

  // Use service role key for full access
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
