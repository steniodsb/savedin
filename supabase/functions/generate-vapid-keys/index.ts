import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export public key
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Export private key in JWK format, then extract d parameter
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyBase64 = privateKeyJwk.d || "";

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization (optional - for security)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating VAPID keys for user: ${user.id}`);

    // Generate new VAPID keys
    const vapidKeys = await generateVapidKeys();

    console.log('VAPID keys generated successfully');
    console.log('Public key length:', vapidKeys.publicKey.length);
    console.log('Private key length:', vapidKeys.privateKey.length);

    // Return the keys - the public key should be stored in the frontend
    // The private key should be stored as a Supabase secret
    return new Response(
      JSON.stringify({
        success: true,
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        message: 'VAPID keys generated successfully. Store the private key as VAPID_PRIVATE_KEY secret and use the public key in your frontend.',
        instructions: [
          '1. Copy the privateKey and add it as a secret named VAPID_PRIVATE_KEY',
          '2. Copy the publicKey and add it as a secret named VAPID_PUBLIC_KEY',
          '3. Update your frontend to use the public key for push subscriptions'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating VAPID keys:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred generating keys' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
