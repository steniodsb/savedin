import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskNotification {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  level: string;
}

interface UserPreferences {
  overdueTasks?: boolean;
  upcomingDeadlines?: boolean;
  timezone?: string;
  morningNotificationTime?: string;
  eveningNotificationTime?: string;
}

interface ExistingNotification {
  id: string;
  user_id: string;
  data: {
    taskId?: string;
    milestone?: number;
  } | null;
}

// Milestone days for overdue notifications
const OVERDUE_MILESTONES = [0, 1, 7, 15, 30];

// Get the current hour in a specific timezone
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

// Get the current minute in a specific timezone
function getCurrentMinuteInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      minute: 'numeric',
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return new Date().getUTCMinutes();
  }
}

// Check if current time matches the user's preferred notification time (within 30min window)
function isTimeToNotify(
  timezone: string, 
  preferredTime: string,
  toleranceMinutes: number = 30
): boolean {
  const [prefHour, prefMinute] = preferredTime.split(':').map(Number);
  const currentHour = getCurrentHourInTimezone(timezone);
  const currentMinute = getCurrentMinuteInTimezone(timezone);
  
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const prefTotalMinutes = prefHour * 60 + prefMinute;
  
  const diff = Math.abs(currentTotalMinutes - prefTotalMinutes);
  return diff <= toleranceMinutes || diff >= (24 * 60 - toleranceMinutes);
}

// Calculate days overdue
function getDaysOverdue(dueDate: string, todayStr: string): number {
  const due = new Date(dueDate);
  const today = new Date(todayStr);
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Get milestone message based on days overdue
function getMilestoneMessage(daysOverdue: number, taskTitle: string): { title: string; body: string } {
  if (daysOverdue === 0) {
    return {
      title: "📅 Tarefa vence hoje",
      body: `"${taskTitle}" vence hoje!`,
    };
  } else if (daysOverdue === 1) {
    return {
      title: "⚠️ Tarefa venceu ontem",
      body: `"${taskTitle}" venceu ontem. Não esqueça de completá-la!`,
    };
  } else if (daysOverdue === 7) {
    return {
      title: "🔴 Tarefa atrasada há 7 dias",
      body: `"${taskTitle}" está vencida há uma semana!`,
    };
  } else if (daysOverdue === 15) {
    return {
      title: "🚨 Tarefa atrasada há 15 dias",
      body: `"${taskTitle}" está vencida há 15 dias. Considere priorizá-la.`,
    };
  } else if (daysOverdue === 30) {
    return {
      title: "⛔ Tarefa atrasada há 30 dias",
      body: `"${taskTitle}" está vencida há um mês! Revise se ainda é relevante.`,
    };
  }
  return { title: "", body: "" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dates (using UTC for date comparisons)
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log(`Checking tasks at ${now.toISOString()} - Today: ${today}`);

    // Get user notification preferences
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, notification_preferences");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const userPrefs: Record<string, UserPreferences> = {};
    if (profiles) {
      for (const profile of profiles) {
        userPrefs[profile.user_id] = profile.notification_preferences || {
          overdueTasks: true,
          upcomingDeadlines: true,
          timezone: 'America/Sao_Paulo',
          morningNotificationTime: '08:00',
          eveningNotificationTime: '18:00',
        };
      }
    }

    // Fetch all tasks that need milestone checks (from today going back 30 days)
    const { data: allTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, level")
      .gte("due_date", thirtyDaysAgo)
      .lte("due_date", tomorrow)
      .neq("status", "completed")
      .is("deleted_at", null)
      .order("due_date", { ascending: true });

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!allTasks || allTasks.length === 0) {
      console.log("No tasks with upcoming/overdue deadlines found");
      return new Response(
        JSON.stringify({ message: "No tasks to notify", notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${allTasks.length} tasks to check`);

    // Get existing notifications to avoid duplicates
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("id, user_id, data")
      .eq("type", "task")
      .gte("created_at", thirtyDaysAgo);

    // Build a set of already-sent milestone notifications
    const sentMilestones = new Set<string>();
    if (existingNotifs) {
      for (const notif of existingNotifs as ExistingNotification[]) {
        if (notif.data?.taskId && notif.data?.milestone !== undefined) {
          sentMilestones.add(`${notif.user_id}-${notif.data.taskId}-${notif.data.milestone}`);
        }
      }
    }

    // Get all unique user IDs
    const allUserIds = [...new Set(allTasks.map(t => t.user_id))];

    let notified = 0;
    const notifications: Array<{ userId: string; taskId: string; milestone: number; title: string }> = [];

    for (const userId of allUserIds) {
      const prefs = userPrefs[userId] || { 
        overdueTasks: true, 
        upcomingDeadlines: true,
        timezone: 'America/Sao_Paulo',
        morningNotificationTime: '08:00',
        eveningNotificationTime: '18:00',
      };
      
      // Check if notifications are disabled
      if (prefs.overdueTasks === false && prefs.upcomingDeadlines === false) {
        continue;
      }

      const timezone = prefs.timezone || 'America/Sao_Paulo';
      const morningTime = prefs.morningNotificationTime || '08:00';
      
      // Only send at morning time
      const isMorningTimeForUser = isTimeToNotify(timezone, morningTime);
      
      if (!isMorningTimeForUser) {
        continue;
      }

      // Get tasks for this user
      const userTasks = allTasks.filter(t => t.user_id === userId) as TaskNotification[];

      for (const task of userTasks) {
        const daysOverdue = getDaysOverdue(task.due_date, today);
        
        // Find the appropriate milestone
        let milestone: number | null = null;
        for (const m of OVERDUE_MILESTONES) {
          if (daysOverdue === m) {
            milestone = m;
            break;
          }
        }

        // Skip if no milestone matches or already sent
        if (milestone === null) continue;
        
        const milestoneKey = `${userId}-${task.id}-${milestone}`;
        if (sentMilestones.has(milestoneKey)) {
          continue;
        }

        // Check preference based on milestone type
        if (milestone === 0 && prefs.upcomingDeadlines === false) continue;
        if (milestone > 0 && prefs.overdueTasks === false) continue;

        const { title, body } = getMilestoneMessage(milestone, task.title);
        if (!title) continue;

        // Send push notification
        const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
          body: { 
            userId, 
            title, 
            body, 
            url: "/?tab=tasks" 
          },
        });

        if (pushError) {
          console.error(`Push error for ${task.title}:`, pushError);
        }

        // Create database notification for history
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "task",
            title,
            message: body,
            data: { taskId: task.id, milestone, dueDate: task.due_date },
            read: false,
          });

        if (!notifError) {
          notified++;
          notifications.push({ userId, taskId: task.id, milestone, title });
          sentMilestones.add(milestoneKey); // Prevent duplicate in same run
          console.log(`✓ Sent milestone ${milestone} for task "${task.title}" to user ${userId}`);
        }
      }
    }

    console.log(`Sent ${notified} milestone notifications`);

    return new Response(
      JSON.stringify({
        message: "Task milestone check completed",
        stats: {
          tasksChecked: allTasks.length,
          notificationsSent: notified,
        },
        notifications,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-overdue-tasks:", message);
    return new Response(
      JSON.stringify({ error: 'An error occurred checking tasks' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
