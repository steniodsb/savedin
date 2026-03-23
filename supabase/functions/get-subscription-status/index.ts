import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Get user's active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`*, plan:plans(*)`)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check if user is a duo partner
    let isDuoPartner = false;
    let duoOwnerSubscription = null;

    if (!subscription) {
      const { data: duoLink } = await supabase
        .from('duo_links')
        .select(`*, subscription:subscriptions(*, plan:plans(*))`)
        .eq('partner_user_id', user.id)
        .eq('invite_status', 'accepted')
        .single();

      if (duoLink?.subscription && ['active', 'trialing'].includes(duoLink.subscription.status)) {
        isDuoPartner = true;
        duoOwnerSubscription = duoLink.subscription;
      }
    }

    // Get duo link if user is owner
    let duoLink = null;
    if (subscription?.plan?.mode === 'duo') {
      const { data: link } = await supabase
        .from('duo_links')
        .select('*')
        .eq('subscription_id', subscription.id)
        .single();
      duoLink = link;
    }

    // Calculate days remaining
    let daysRemaining = null;
    const activeSubscription = subscription || duoOwnerSubscription;
    
    if (activeSubscription?.current_period_end) {
      const endDate = new Date(activeSubscription.current_period_end);
      const now = new Date();
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine if user has premium access
    const hasPremium = !!(subscription || duoOwnerSubscription);
    const isTrialing = activeSubscription?.status === 'trialing';

    // Calculate trial days remaining
    let trialDaysRemaining = null;
    if (isTrialing && activeSubscription?.trial_end) {
      const trialEnd = new Date(activeSubscription.trial_end);
      const now = new Date();
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return new Response(JSON.stringify({
      isPremium: hasPremium,
      hasPremium,
      isTrialing,
      isDuoPartner,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        trialEnd: subscription.trial_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } : null,
      plan: activeSubscription?.plan ? {
        id: activeSubscription.plan.id,
        name: activeSubscription.plan.name,
        slug: activeSubscription.plan.slug,
        type: activeSubscription.plan.type,
      } : null,
      duoLink: duoLink ? {
        id: duoLink.id,
        ownerUserId: duoLink.owner_user_id,
        inviteStatus: duoLink.invite_status,
      } : null,
      daysRemaining,
      trialDaysRemaining,
      status: activeSubscription?.status || 'free',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      isPremium: false,
      hasPremium: false,
      isTrialing: false,
      isDuoPartner: false,
      subscription: null,
      plan: null,
      duoLink: null,
      daysRemaining: null,
      trialDaysRemaining: null,
      status: 'free',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
