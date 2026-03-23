import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const { event, payment, subscription: asaasSubscription } = body;

    // Handle payment events
    if (event.startsWith('PAYMENT_')) {
      const paymentId = payment?.id;
      const externalReference = payment?.externalReference;
      const status = payment?.status;

      if (!externalReference) {
        console.log('No external reference, skipping');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get subscription by user_id (externalReference)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', externalReference)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!subscription) {
        console.log('Subscription not found for user:', externalReference);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Map Asaas status to our status
      let newStatus = subscription.status;
      switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
          newStatus = 'active';
          break;
        case 'PAYMENT_OVERDUE':
          newStatus = 'past_due';
          break;
        case 'PAYMENT_DELETED':
        case 'PAYMENT_REFUNDED':
          newStatus = 'canceled';
          break;
      }

      // Update subscription status
      if (newStatus !== subscription.status) {
        await supabase
          .from('subscriptions')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);
      }

      // Record payment in history
      if (payment) {
        await supabase
          .from('payment_history')
          .upsert({
            subscription_id: subscription.id,
            user_id: externalReference,
            amount_cents: Math.round(payment.value * 100),
            amount_display: `R$ ${payment.value.toFixed(2).replace('.', ',')}`,
            status: status === 'CONFIRMED' || status === 'RECEIVED' ? 'confirmed' : 
                   status === 'PENDING' ? 'pending' : 
                   status === 'REFUNDED' ? 'refunded' : 'failed',
            payment_method: payment.billingType?.toLowerCase() || 'unknown',
            provider: 'asaas',
            provider_payment_id: paymentId,
            paid_at: status === 'CONFIRMED' || status === 'RECEIVED' ? new Date().toISOString() : null,
            invoice_url: payment.invoiceUrl || payment.bankSlipUrl || null,
          }, {
            onConflict: 'provider_payment_id',
          });
      }
    }

    // Handle subscription events
    if (event.startsWith('SUBSCRIPTION_')) {
      const subscriptionId = asaasSubscription?.id;
      const externalReference = asaasSubscription?.externalReference;

      if (subscriptionId && externalReference) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('provider_subscription_id', subscriptionId)
          .single();

        if (subscription) {
          let updates: any = { updated_at: new Date().toISOString() };

          switch (event) {
            case 'SUBSCRIPTION_DELETED':
            case 'SUBSCRIPTION_INACTIVATED':
              updates.status = 'canceled';
              updates.cancelled_at = new Date().toISOString();
              break;
            case 'SUBSCRIPTION_RENEWED':
              updates.status = 'active';
              // Update period dates
              const { data: plan } = await supabase
                .from('plans')
                .select('billing_cycle')
                .eq('id', subscription.plan_id)
                .single();
              
              if (plan) {
                const now = new Date();
                const periodEnd = plan.billing_cycle === 'yearly'
                  ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
                  : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                
                updates.current_period_start = now.toISOString();
                updates.current_period_end = periodEnd.toISOString();
              }
              break;
          }

          await supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', subscription.id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: 'An error occurred processing the webhook',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
