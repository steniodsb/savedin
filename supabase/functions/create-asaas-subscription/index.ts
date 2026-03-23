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

    const { 
      planId, 
      paymentMethod,
      cpfCnpj,
      creditCard,
      creditCardHolderInfo,
      withTrial,
    } = await req.json();

    if (!planId) {
      throw new Error('Plano é obrigatório');
    }

    if (!cpfCnpj) {
      throw new Error('CPF/CNPJ é obrigatório');
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plano não encontrado');
    }

    // Get or create customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('asaas_customer_id, full_name')
      .eq('user_id', user.id)
      .single();

    let customerId = profile?.asaas_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: profile?.full_name || user.email?.split('@')[0] || 'Cliente',
          email: user.email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          externalReference: user.id,
        }),
      });

      const customerData = await customerResponse.json();

      if (!customerResponse.ok) {
        console.error('Customer creation error:', customerData);
        throw new Error(customerData.errors?.[0]?.description || 'Erro ao criar cliente');
      }

      customerId = customerData.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ 
          asaas_customer_id: customerId,
          cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
        })
        .eq('user_id', user.id);
    }

    const value = plan.price_cents / 100;

    // Check for existing active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSub) {
      throw new Error('Você já possui uma assinatura ativa');
    }

    // Determine if trial should be applied
    const applyTrial = withTrial && paymentMethod === 'CREDIT_CARD' && plan.trial_days > 0;
    const trialDays = applyTrial ? plan.trial_days : 0;

    let asaasResponse;
    let paymentData: any = {
      customer: customerId,
      value,
      externalReference: user.id,
    };

    // Add credit card data if provided
    if (paymentMethod === 'CREDIT_CARD' && creditCard) {
      paymentData.creditCard = {
        holderName: creditCard.holderName,
        number: creditCard.number.replace(/\D/g, ''),
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      };
      paymentData.creditCardHolderInfo = {
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email || user.email,
        cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: creditCardHolderInfo.addressNumber,
        phone: creditCardHolderInfo.phone.replace(/\D/g, ''),
      };
      paymentData.remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '0.0.0.0';
    }

    if (plan.type === 'lifetime') {
      // One-time payment for lifetime plans
      paymentData.billingType = paymentMethod || 'PIX';
      paymentData.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      paymentData.description = `${plan.name} - Acesso Vitalício`;

      asaasResponse = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify(paymentData),
      });
    } else {
      // Recurring subscription
      const cycle = plan.billing_cycle === 'monthly' ? 'MONTHLY' : 'YEARLY';
      
      paymentData.billingType = paymentMethod || 'PIX';
      paymentData.cycle = cycle;
      paymentData.description = `Assinatura ${plan.name}`;

      // Calculate next due date based on trial
      const nextDueDate = new Date();
      if (trialDays > 0) {
        nextDueDate.setDate(nextDueDate.getDate() + trialDays);
      }
      paymentData.nextDueDate = nextDueDate.toISOString().split('T')[0];

      asaasResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify(paymentData),
      });
    }

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error('Asaas error:', asaasData);
      throw new Error(asaasData.errors?.[0]?.description || 'Erro ao criar cobrança');
    }

    // Calculate period dates
    const now = new Date();
    const trialEnd = trialDays > 0 
      ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : null;
    
    let periodEnd: Date;
    if (plan.type === 'lifetime') {
      periodEnd = new Date('2099-12-31');
    } else if (plan.billing_cycle === 'yearly') {
      periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // If trial is active, period end should be after trial
    if (trialEnd && periodEnd < trialEnd) {
      if (plan.billing_cycle === 'yearly') {
        periodEnd = new Date(trialEnd.getFullYear() + 1, trialEnd.getMonth(), trialEnd.getDate());
      } else {
        periodEnd = new Date(trialEnd.getFullYear(), trialEnd.getMonth() + 1, trialEnd.getDate());
      }
    }

    // Determine subscription status
    let subscriptionStatus = 'pending';
    if (trialDays > 0 && paymentMethod === 'CREDIT_CARD') {
      subscriptionStatus = 'trialing';
    } else if (paymentMethod === 'CREDIT_CARD' && asaasData.status === 'ACTIVE') {
      subscriptionStatus = 'active';
    }

    // Create subscription in our database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: subscriptionStatus,
        payment_provider: 'asaas',
        provider_subscription_id: asaasData.id,
        provider_customer_id: customerId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_start: trialDays > 0 ? now.toISOString() : null,
        trial_end: trialEnd?.toISOString() || null,
        metadata: {
          payment_method: paymentMethod,
          plan_mode: plan.mode,
          with_trial: trialDays > 0,
        },
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription error:', subError);
      throw new Error('Erro ao registrar assinatura');
    }

    // If it's a duo plan, create the duo_link entry
    if (plan.mode === 'duo') {
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await supabase
        .from('duo_links')
        .insert({
          subscription_id: subscription.id,
          owner_user_id: user.id,
          invite_token: inviteToken,
          invite_status: 'pending',
          expires_at: expiresAt.toISOString(),
        });
    }

    // Return payment info
    let paymentInfo: any = {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
      },
    };

    // Add PIX info if applicable
    if (paymentMethod === 'PIX') {
      // For subscriptions, we need to get the first payment
      const paymentsResponse = await fetch(
        `${ASAAS_API_URL}/payments?subscription=${asaasData.id}`,
        {
          headers: {
            'access_token': ASAAS_API_KEY,
          },
        }
      );
      
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        const firstPayment = paymentsData.data?.[0];
        
        if (firstPayment) {
          const pixResponse = await fetch(
            `${ASAAS_API_URL}/payments/${firstPayment.id}/pixQrCode`,
            {
              headers: {
                'access_token': ASAAS_API_KEY,
              },
            }
          );
          
          if (pixResponse.ok) {
            const pixData = await pixResponse.json();
            paymentInfo.pix = {
              qrCode: pixData.encodedImage,
              copyPaste: pixData.payload,
              expirationDate: pixData.expirationDate,
            };
          }
          
          paymentInfo.paymentUrl = firstPayment.invoiceUrl;
        }
      }
    }

    // Credit card response
    if (paymentMethod === 'CREDIT_CARD') {
      paymentInfo.creditCard = {
        status: asaasData.status,
        confirmed: asaasData.status === 'ACTIVE',
      };

      // If confirmed and no trial, mark as active
      if (asaasData.status === 'ACTIVE' && trialDays === 0) {
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', subscription.id);
        
        paymentInfo.subscription.status = 'active';
      }
    }

    return new Response(JSON.stringify(paymentInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const safeMessages = [
      'ASAAS_API_KEY não configurada',
      'Token de autenticação não fornecido',
      'Usuário não autenticado',
      'Plano não encontrado',
      'Nome, email e CPF/CNPJ são obrigatórios',
    ];
    const msg = error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : 'Erro ao processar assinatura';
    return new Response(JSON.stringify({
      success: false,
      error: msg,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
