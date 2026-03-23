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

    const { name, email, cpfCnpj, phone, postalCode, address, addressNumber } = await req.json();

    if (!name || !email || !cpfCnpj) {
      throw new Error('Nome, email e CPF/CNPJ são obrigatórios');
    }

    // Check if customer already exists in Asaas
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('provider_customer_id')
      .eq('user_id', user.id)
      .not('provider_customer_id', 'is', null)
      .single();

    if (existingSub?.provider_customer_id) {
      return new Response(JSON.stringify({ 
        success: true, 
        customerId: existingSub.provider_customer_id,
        message: 'Cliente já existe'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create customer in Asaas
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone?.replace(/\D/g, ''),
        postalCode: postalCode?.replace(/\D/g, ''),
        address,
        addressNumber,
        externalReference: user.id,
      }),
    });

    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
      console.error('Asaas error:', customerData);
      throw new Error(customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
    }

    // Update profile with Asaas customer ID
    await supabase
      .from('profiles')
      .update({ 
        asaas_customer_id: customerData.id,
        cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      customerId: customerData.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const safeMessages = [
      'ASAAS_API_KEY não configurada',
      'Token de autenticação não fornecido',
      'Usuário não autenticado',
      'Nome, email e CPF/CNPJ são obrigatórios',
    ];
    const msg = error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : 'Erro ao criar cliente';
    return new Response(JSON.stringify({
      success: false,
      error: msg,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
