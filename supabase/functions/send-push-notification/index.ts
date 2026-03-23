import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  userId?: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// Helper functions for base64url encoding/decoding
function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64Url(new Uint8Array(buffer));
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = { aud: audience, exp, sub: subject };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode VAPID keys
  const publicKeyBuffer = base64UrlDecode(vapidPublicKey);
  const privateKeyBuffer = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = new Uint8Array(publicKeyBuffer);
  const privateKeyBytes = new Uint8Array(privateKeyBuffer);

  // Create JWK for the private key
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(privateKeyBytes)
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using aes128gcm
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<ArrayBuffer> {
  const subscriberKeyBuffer = base64UrlDecode(p256dh);
  const authSecretBuffer = base64UrlDecode(auth);
  const subscriberKey = new Uint8Array(subscriberKeyBuffer);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create info for auth secret HKDF: "WebPush: info" + 0x00 + subscriber key + local key
  const webPushInfo = new TextEncoder().encode('WebPush: info\0');
  const combinedInfo = new Uint8Array(webPushInfo.length + subscriberKey.length + localPublicKey.length);
  combinedInfo.set(webPushInfo);
  combinedInfo.set(subscriberKey, webPushInfo.length);
  combinedInfo.set(localPublicKey, webPushInfo.length + subscriberKey.length);

  // Import shared secret as HKDF key
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecretBits,
    'HKDF',
    false,
    ['deriveBits']
  );

  // Derive IKM
  const ikm = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: authSecretBuffer,
      info: combinedInfo.buffer as ArrayBuffer
    },
    sharedSecretKey,
    256
  );
  
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits', 'deriveKey']);

  // Derive CEK
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cek = await crypto.subtle.deriveKey(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo.buffer as ArrayBuffer
    },
    ikmKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    { 
      name: 'HKDF', 
      hash: 'SHA-256', 
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo.buffer as ArrayBuffer
    },
    ikmKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Pad and encrypt payload (payload + 0x02 delimiter)
  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes);
  padded[payloadBytes.length] = 2;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cek,
    padded
  );

  // Build the final body: salt (16) + rs (4) + idlen (1) + keyid (65) + ciphertext
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, 4096, false);

  const encryptedBytes = new Uint8Array(encrypted);
  const body = new Uint8Array(16 + 4 + 1 + 65 + encryptedBytes.length);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(new Uint8Array(rs.buffer), offset); offset += 4;
  body[offset] = 65; offset += 1;
  body.set(localPublicKey, offset); offset += 65;
  body.set(encryptedBytes, offset);

  return body.buffer as ArrayBuffer;
}

// Send push notification
async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status: number; error?: string }> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(
      audience,
      'mailto:noreply@savedin.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const body = await encryptPayload(payload, p256dh, auth);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: body,
    });

    if (response.ok || response.status === 201) {
      return { success: true, status: response.status };
    } else {
      const errorText = await response.text();
      return { success: false, status: response.status, error: errorText };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, status: 0, error: message };
  }
}

Deno.serve(async (req: Request) => {
  console.log("=== Push notification request received ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    console.log("VAPID keys configured:", !!vapidPublicKey && !!vapidPrivateKey);
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth info from request
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("apikey");
    
    console.log("Auth header present:", !!authHeader);
    console.log("API key present:", !!apiKey);

    let authenticatedUserId: string | null = null;
    let isServiceCall = false;

    // Check if this is a service role call (from other edge functions or cron)
    if (authHeader?.includes(supabaseServiceKey)) {
      isServiceCall = true;
      console.log("Service role authentication detected");
    }
    
    // If not service call, try to authenticate as user
    if (!isServiceCall && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      // Create a client to verify the user token
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data, error } = await supabaseAuth.auth.getUser();
      
      if (!error && data?.user) {
        authenticatedUserId = data.user.id;
        console.log("User authenticated:", authenticatedUserId);
      } else {
        console.log("User authentication failed:", error?.message);
      }
    }

    // If no valid authentication, reject
    if (!authenticatedUserId && !isServiceCall) {
      console.error("Unauthorized - no valid authentication");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, title, body, icon, url }: PushNotificationRequest = await req.json();
    console.log("Request payload - userId:", userId, "title:", title);

    // Determine target user
    let targetUserId: string;
    
    if (isServiceCall) {
      // Service calls can specify any user
      if (!userId) {
        console.error("Service call must specify userId");
        return new Response(
          JSON.stringify({ error: "userId is required for service calls" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = userId;
    } else {
      // User calls: use authenticated user, or allow self-targeting
      if (userId && userId !== authenticatedUserId) {
        console.error("User tried to send to different user");
        return new Response(
          JSON.stringify({ error: "Cannot send notifications to other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = authenticatedUserId!;
    }

    console.log("Target user:", targetUserId);

    // Get subscriptions for target user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", targetUserId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for user:", targetUserId);
      return new Response(
        JSON.stringify({ message: "No subscriptions found", sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/favicon.ico",
      url: url || "/",
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const toRemove: string[] = [];

    for (const sub of subscriptions) {
      console.log(`Sending to endpoint: ${sub.endpoint.substring(0, 60)}...`);
      
      const result = await sendPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        sent++;
        console.log(`✓ Sent successfully`);
      } else {
        failed++;
        console.error(`✗ Failed: ${result.status} - ${result.error}`);
        // Remove invalid subscriptions (gone or not found)
        if (result.status === 410 || result.status === 404) {
          toRemove.push(sub.id);
        }
      }
    }

    // Clean up invalid subscriptions
    if (toRemove.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", toRemove);
      console.log(`Removed ${toRemove.length} invalid subscriptions`);
    }

    console.log(`=== Result: sent=${sent}, failed=${failed} ===`);

    return new Response(
      JSON.stringify({ message: "Processed", sent, failed, removed: toRemove.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: 'An error occurred sending the notification' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
