import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = Deno.env.get('ASAAS_SANDBOX') === 'true' 
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

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

    const { cancelImmediately = false } = await req.json();

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .single();

    if (subError || !subscription) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }

    // If it's a recurring subscription, cancel in Asaas
    if (subscription.plan.type === 'recurring' && subscription.provider_subscription_id) {
      const asaasResponse = await fetch(
        `${ASAAS_API_URL}/subscriptions/${subscription.provider_subscription_id}`,
        {
          method: 'DELETE',
          headers: {
            'access_token': ASAAS_API_KEY,
          },
        }
      );

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        console.error('Asaas cancel error:', errorData);
        // Continue even if Asaas fails - update our database
      }
    }

    // Update subscription in our database
    const updates: any = {
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (cancelImmediately) {
      updates.status = 'canceled';
      updates.ended_at = new Date().toISOString();
    } else {
      updates.cancel_at_period_end = true;
    }

    await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscription.id);

    return new Response(JSON.stringify({
      success: true,
      message: cancelImmediately 
        ? 'Assinatura cancelada imediatamente'
        : 'Assinatura será cancelada no final do período',
      cancelAtPeriodEnd: !cancelImmediately,
      periodEnd: subscription.current_period_end,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const safeMessages = [
      'ASAAS_API_KEY não configurada',
      'Token de autenticação não fornecido',
      'Usuário não autenticado',
      'Nenhuma assinatura ativa encontrada',
    ];
    const msg = error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : 'Erro ao cancelar assinatura';
    return new Response(JSON.stringify({
      success: false,
      error: msg,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
