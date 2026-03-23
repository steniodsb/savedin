import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FriendRequestPayload {
  requesterId: string;
  addresseeId: string;
  connectionId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: FriendRequestPayload = await req.json();

    console.log("Received friend request notification:", payload);

    const { requesterId, addresseeId, connectionId } = payload;

    if (!requesterId || !addresseeId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester profile
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("user_id", requesterId)
      .single();

    const requesterName = requesterProfile?.full_name || requesterProfile?.username || "Alguém";
    const requesterUsername = requesterProfile?.username || "usuario";

    // Create notification in database for the addressee
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: addresseeId,
        type: "friend_request",
        title: "Nova solicitação de amizade",
        message: `@${requesterUsername} quer ser seu amigo`,
        read: false,
        data: {
          connectionId,
          requesterId,
          requesterUsername: requesterProfile?.username,
          requesterName: requesterProfile?.full_name,
          requesterAvatar: requesterProfile?.avatar_url,
        },
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      throw notificationError;
    }

    // Send push notification
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          userId: addresseeId,
          title: "Nova solicitação de amizade",
          body: `${requesterName} quer ser seu amigo`,
          url: "/?view=friends",
        }),
      });

      const result = await response.json();
      console.log("Push notification result:", result);
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't fail the whole request if push fails
    }

    return new Response(
      JSON.stringify({ message: "Friend request notification created" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in notify-friend-request:", message);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the request' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
