import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareNotificationPayload {
  type: "INSERT";
  table: "shared_items";
  record: {
    id: string;
    item_id: string;
    item_type: string;
    owner_id: string;
    shared_with_id: string;
    status: string;
    permission: string;
    created_at: string;
  };
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
    const payload: ShareNotificationPayload = await req.json();

    console.log("Received share notification webhook:", payload);

    // Only process new shares
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(
        JSON.stringify({ message: "Not a new share, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { record } = payload;
    const { owner_id, shared_with_id, item_type, item_id } = record;

    // Get owner profile to show who shared
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("user_id", owner_id)
      .single();

    // Get item details based on type
    let itemTitle = "um item";
    let itemTypeLabel = "item";
    
    if (item_type === "task") {
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", item_id)
        .single();
      if (task) itemTitle = task.title;
      itemTypeLabel = "tarefa";
    } else if (item_type === "goal") {
      const { data: goal } = await supabase
        .from("goals")
        .select("title")
        .eq("id", item_id)
        .single();
      if (goal) itemTitle = goal.title;
      itemTypeLabel = "meta";
    } else if (item_type === "project") {
      const { data: project } = await supabase
        .from("projects")
        .select("title")
        .eq("id", item_id)
        .single();
      if (project) itemTitle = project.title;
      itemTypeLabel = "projeto";
    }

    const ownerName = ownerProfile?.full_name || ownerProfile?.username || "Alguém";
    const ownerUsername = ownerProfile?.username || "usuario";

    // Create notification in database for the recipient
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: shared_with_id,
        type: "share_invite",
        title: "Novo compartilhamento",
        message: `@${ownerUsername} compartilhou a ${itemTypeLabel} "${itemTitle}" com você`,
        read: false,
        data: {
          sharedItemId: record.id,
          itemId: item_id,
          itemType: item_type,
          itemTitle,
          ownerId: owner_id,
          ownerUsername: ownerProfile?.username,
          ownerName: ownerProfile?.full_name,
        },
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Call send-push-notification function with correct format
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        userId: shared_with_id,
        title: "Novo compartilhamento",
        body: `${ownerName} compartilhou a ${itemTypeLabel} "${itemTitle}" com você`,
        url: "/?view=friends",
      }),
    });

    const result = await response.json();
    console.log("Push notification result:", result);

    if (!response.ok) {
      console.error("Failed to send push notification:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Share notification sent",
        sent: result.sent || 0,
        failed: result.failed || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in notify-share:", message);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the notification' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
