import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users from auth.users with their profiles
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      throw authError;
    }

    // Get profiles data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (profilesError) {
      throw profilesError;
    }

    // Get subscriptions data
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        user_id,
        status,
        plan_id,
        plans(name)
      `);

    if (subsError) {
      throw subsError;
    }

    // Merge data
    const usersWithDetails = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id);
      const subscription = subscriptions?.find(s => s.user_id === authUser.id);
      
      return {
        user_id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        phone: authUser.phone,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        full_name: profile?.full_name || null,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        onboarding_completed: profile?.onboarding_completed || false,
        last_seen_at: profile?.last_seen_at || null,
        has_subscription: !!subscription,
        subscription_status: subscription?.status || null,
        plan_name: subscription?.plans?.name || null,
      };
    });

    return new Response(JSON.stringify({ users: usersWithDetails }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
