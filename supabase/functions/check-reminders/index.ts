import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  time_of_day: string;
  frequency: string;
  custom_days: number[] | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

interface UserPreferences {
  timezone?: string;
}

interface Profile {
  user_id: string;
  notification_preferences: UserPreferences | null;
}

// Get the current time in a specific timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number; dayOfWeek: number; dateString: string } {
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
    // Fallback to UTC if timezone is invalid
    const now = new Date();
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateString: now.toISOString().split('T')[0],
    };
  }
}

// Check if a reminder should fire at the given local time
function shouldReminderFire(
  reminder: Reminder,
  localHour: number,
  localMinute: number,
  localDayOfWeek: number,
  localDateString: string
): boolean {
  // Check if end_date has passed
  if (reminder.end_date && reminder.end_date < localDateString) {
    return false;
  }

  // Check if start_date has not yet arrived
  if (reminder.start_date > localDateString) {
    return false;
  }

  // Parse reminder time
  const [reminderHour, reminderMinute] = reminder.time_of_day.split(':').map(Number);
  
  // Check if current time matches (within 1 minute window)
  if (reminderHour !== localHour || Math.abs(reminderMinute - localMinute) > 1) {
    return false;
  }

  // Check frequency
  switch (reminder.frequency) {
    case 'once':
      return reminder.start_date === localDateString;
    
    case 'daily':
      return true;
    
    case 'weekly': {
      // Get the day of week of the start_date
      const startDate = new Date(reminder.start_date + 'T00:00:00Z');
      const startDayOfWeek = startDate.getUTCDay();
      return localDayOfWeek === startDayOfWeek;
    }
    
    case 'custom':
      return reminder.custom_days?.includes(localDayOfWeek) ?? false;
    
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking reminders at', new Date().toISOString());

    // Fetch all active reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} active reminders`);

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(reminders.map(r => r.user_id))];

    // Fetch user profiles with notification preferences (for timezone)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, notification_preferences')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user_id to timezone
    const userTimezones: Record<string, string> = {};
    for (const profile of (profiles || []) as Profile[]) {
      const prefs = profile.notification_preferences;
      userTimezones[profile.user_id] = prefs?.timezone || 'America/Sao_Paulo';
    }

    // Filter reminders that should fire now based on each user's timezone
    const remindersToNotify: Reminder[] = [];
    
    for (const reminder of reminders as Reminder[]) {
      const timezone = userTimezones[reminder.user_id] || 'America/Sao_Paulo';
      const { hour, minute, dayOfWeek, dateString } = getCurrentTimeInTimezone(timezone);
      
      if (shouldReminderFire(reminder, hour, minute, dayOfWeek, dateString)) {
        remindersToNotify.push(reminder);
        console.log(`Reminder "${reminder.title}" matches for user ${reminder.user_id} (timezone: ${timezone}, local time: ${hour}:${minute})`);
      }
    }

    console.log(`${remindersToNotify.length} reminders match current time`);

    if (remindersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders at this time' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notifications via send-push-notification function
    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of remindersToNotify) {
      try {
        console.log(`Sending notification for reminder: ${reminder.title} to user: ${reminder.user_id}`);
        
        // Call the send-push-notification function with correct payload format
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: reminder.user_id,
            title: `${reminder.icon || '🔔'} ${reminder.title}`,
            body: reminder.description || 'Hora de completar seu lembrete!',
            url: '/?tab=reminders',
          }),
        });

        const result = await response.json();
        
        if (response.ok && result.sent > 0) {
          sentCount++;
          console.log(`✓ Notification sent for reminder: ${reminder.title}`);
        } else {
          failedCount++;
          console.log(`✗ Failed to send notification for reminder: ${reminder.title}`, result);
        }
      } catch (err) {
        failedCount++;
        console.error(`Error sending notification for reminder ${reminder.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${remindersToNotify.length} reminders, sent ${sentCount}, failed ${failedCount}` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-reminders function:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'An error occurred checking reminders' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
