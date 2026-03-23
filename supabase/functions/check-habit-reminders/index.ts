import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Habit {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  frequency: string;
  days_of_week: number[] | null;
  times_per_day: number;
  time_of_day: string;
  specific_time: string | null;
  is_active: boolean;
}

interface HabitLog {
  habit_id: string;
  date: string;
  count: number;
}

interface UserPreferences {
  habitReminders?: boolean;
  timezone?: string;
  bedtimeHour?: string;
}

interface Profile {
  user_id: string;
  notification_preferences: UserPreferences | null;
}

// Get current time info in a specific timezone
function getCurrentTimeInTimezone(timezone: string): { 
  hour: number; 
  minute: number; 
  dayOfWeek: number; 
  dateString: string;
} {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const year = parts.find(p => p.type === 'year')?.value || '2025';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[weekday] ?? 0;
    
    return { hour, minute, dayOfWeek, dateString: `${year}-${month}-${day}` };
  } catch {
    const now = new Date();
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateString: now.toISOString().split('T')[0],
    };
  }
}

// Check if a habit is scheduled for today
function isHabitScheduledForToday(habit: Habit, dayOfWeek: number): boolean {
  if (!habit.is_active) return false;
  
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return habit.days_of_week?.includes(dayOfWeek) ?? false;
    case 'specific_days':
      return habit.days_of_week?.includes(dayOfWeek) ?? false;
    default:
      return false;
  }
}

// Convert time_of_day enum to approximate hour
function getTimeOfDayHour(timeOfDay: string): number {
  switch (timeOfDay) {
    case 'morning': return 8;
    case 'afternoon': return 14;
    case 'evening': return 19;
    case 'anytime': return 9; // Default to morning for "anytime"
    default: return 9;
  }
}

// Check if it's time to send the scheduled reminder for a habit
function isTimeForScheduledReminder(
  habit: Habit,
  currentHour: number,
  currentMinute: number
): boolean {
  let targetHour: number;
  let targetMinute = 0;
  
  if (habit.specific_time) {
    const [h, m] = habit.specific_time.split(':').map(Number);
    targetHour = h;
    targetMinute = m;
  } else {
    targetHour = getTimeOfDayHour(habit.time_of_day);
  }
  
  // Check if within 30-minute window
  const currentTotal = currentHour * 60 + currentMinute;
  const targetTotal = targetHour * 60 + targetMinute;
  const diff = Math.abs(currentTotal - targetTotal);
  
  return diff <= 30;
}

// Check if it's time for evening reminder (2 hours before bedtime)
function isTimeForEveningReminder(
  bedtimeHour: string,
  currentHour: number,
  currentMinute: number
): boolean {
  const [bedHour] = bedtimeHour.split(':').map(Number);
  const eveningReminderHour = (bedHour - 2 + 24) % 24; // 2 hours before bedtime
  
  const currentTotal = currentHour * 60 + currentMinute;
  const targetTotal = eveningReminderHour * 60;
  const diff = Math.abs(currentTotal - targetTotal);
  
  return diff <= 30;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking habit reminders at', new Date().toISOString());

    // Fetch all active habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, user_id, title, icon, frequency, days_of_week, times_per_day, time_of_day, specific_time, is_active')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (habitsError) {
      console.error('Error fetching habits:', habitsError);
      throw habitsError;
    }

    console.log(`Found ${habits?.length || 0} active habits`);

    if (!habits || habits.length === 0) {
      return new Response(JSON.stringify({ message: 'No habits to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(habits.map(h => h.user_id))];

    // Fetch user profiles with notification preferences
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, notification_preferences')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user preferences
    const userPrefs: Record<string, UserPreferences> = {};
    for (const profile of (profiles || []) as Profile[]) {
      const prefs = profile.notification_preferences;
      userPrefs[profile.user_id] = {
        habitReminders: prefs?.habitReminders ?? true,
        timezone: prefs?.timezone || 'America/Sao_Paulo',
        bedtimeHour: prefs?.bedtimeHour || '22:00',
      };
    }

    // Get today's habit logs for all users to check completion
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase
      .from('habit_logs')
      .select('habit_id, date, count')
      .eq('date', todayStr);

    const completionMap: Record<string, number> = {};
    if (todayLogs) {
      for (const log of todayLogs as HabitLog[]) {
        completionMap[log.habit_id] = log.count;
      }
    }

    // Track sent notifications to avoid duplicates
    const { data: sentToday } = await supabase
      .from('notifications')
      .select('data')
      .eq('type', 'habit')
      .gte('created_at', todayStr);

    const sentHabitReminders = new Set<string>();
    if (sentToday) {
      for (const notif of sentToday) {
        const data = notif.data as { habitId?: string; reminderType?: string } | null;
        if (data?.habitId && data?.reminderType) {
          sentHabitReminders.add(`${data.habitId}-${data.reminderType}`);
        }
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    const notifications: Array<{ userId: string; habitTitle: string; type: string }> = [];

    for (const habit of habits as Habit[]) {
      const prefs = userPrefs[habit.user_id] || {
        habitReminders: true,
        timezone: 'America/Sao_Paulo',
        bedtimeHour: '22:00',
      };

      // Skip if habit reminders are disabled
      if (prefs.habitReminders === false) continue;

      const timezone = prefs.timezone || 'America/Sao_Paulo';
      const bedtimeHour = prefs.bedtimeHour || '22:00';
      const { hour, minute, dayOfWeek, dateString } = getCurrentTimeInTimezone(timezone);

      // Check if habit is scheduled for today
      if (!isHabitScheduledForToday(habit, dayOfWeek)) continue;

      // Check current completion
      const currentCount = completionMap[habit.id] || 0;
      const isCompleted = currentCount >= habit.times_per_day;

      // Skip if already completed
      if (isCompleted) continue;

      // Determine which reminder to send
      let shouldSendScheduled = false;
      let shouldSendEvening = false;

      // Check scheduled reminder time
      if (isTimeForScheduledReminder(habit, hour, minute)) {
        const key = `${habit.id}-scheduled`;
        if (!sentHabitReminders.has(key)) {
          shouldSendScheduled = true;
          sentHabitReminders.add(key);
        }
      }

      // Check evening reminder (2h before bedtime) for incomplete habits
      if (isTimeForEveningReminder(bedtimeHour, hour, minute)) {
        const key = `${habit.id}-evening`;
        if (!sentHabitReminders.has(key)) {
          shouldSendEvening = true;
          sentHabitReminders.add(key);
        }
      }

      // Send scheduled reminder
      if (shouldSendScheduled) {
        const title = `Hora do hábito!`;
        const body = `Lembrete: "${habit.title}"`;

        try {
          await supabase.functions.invoke('send-push-notification', {
            body: { userId: habit.user_id, title: `${habit.icon || '🔄'} ${title}`, body, url: '/?tab=habits' },
          });

          await supabase.from('notifications').insert({
            user_id: habit.user_id,
            type: 'habit',
            title,
            message: body,
            data: { habitId: habit.id, reminderType: 'scheduled', icon: habit.icon || '🔄' },
            read: false,
          });

          sentCount++;
          notifications.push({ userId: habit.user_id, habitTitle: habit.title, type: 'scheduled' });
          console.log(`✓ Scheduled reminder sent for habit "${habit.title}"`);
        } catch (err) {
          failedCount++;
          console.error(`Error sending scheduled reminder for ${habit.id}:`, err);
        }
      }

      // Send evening reminder
      if (shouldSendEvening) {
        const remaining = habit.times_per_day - currentCount;
        const title = `Hábito pendente!`;
        const body = remaining === 1
          ? `"${habit.title}" ainda não foi completado hoje`
          : `"${habit.title}" - faltam ${remaining}/${habit.times_per_day}`;

        try {
          await supabase.functions.invoke('send-push-notification', {
            body: { userId: habit.user_id, title: `🌙 ${title}`, body, url: '/?tab=habits' },
          });

          await supabase.from('notifications').insert({
            user_id: habit.user_id,
            type: 'habit',
            title,
            message: body,
            data: { habitId: habit.id, reminderType: 'evening', icon: habit.icon || '🌙' },
            read: false,
          });

          sentCount++;
          notifications.push({ userId: habit.user_id, habitTitle: habit.title, type: 'evening' });
          console.log(`✓ Evening reminder sent for habit "${habit.title}"`);
        } catch (err) {
          failedCount++;
          console.error(`Error sending evening reminder for ${habit.id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${habits.length} habits, sent ${sentCount}, failed ${failedCount}`,
        notifications,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-habit-reminders function:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred checking habit reminders' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
