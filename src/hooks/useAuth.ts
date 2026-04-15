import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';

// Helper function to sanitize and generate username from string
function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9_]/g, '_') // Replace invalid chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 15); // Max 15 chars to leave room for suffix
}

// Generate a unique username
async function generateUniqueUsername(email: string, fullName?: string | null): Promise<string> {
  let baseUsername = '';

  // Strategy 1: Use full name if available
  if (fullName && fullName.trim()) {
    baseUsername = sanitizeUsername(fullName);
  }

  // Strategy 2: Extract from email
  if (!baseUsername || baseUsername.length < 3) {
    const emailPart = email.split('@')[0];
    baseUsername = sanitizeUsername(emailPart);
  }

  // Strategy 3: Generate random if all else fails
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = 'user';
  }

  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = baseUsername.padEnd(3, '_');
  }

  // Check if username exists and find unique one
  let finalUsername = baseUsername;
  let counter = 0;
  let isUnique = false;

  while (!isUnique) {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', finalUsername)
      .maybeSingle();

    if (!existingUser) {
      isUnique = true;
    } else {
      counter++;
      finalUsername = `${baseUsername}${counter}`;
    }

    // Safety limit
    if (counter > 100) {
      finalUsername = `user_${Math.random().toString(36).substring(2, 8)}`;
      isUnique = true;
    }
  }

  return finalUsername;
}

// Update last_seen_at timestamp
async function updateLastSeen(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating last_seen_at:', error);
  }
}

// Ensure user profile is complete (username, avatar, full_name)
// Uses INSERT + UPDATE to create profile if it doesn't exist (e.g., new database without trigger)
async function ensureProfileComplete(user: User): Promise<void> {
  try {
    // Check current profile state
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('username, avatar_url, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return;
    }

    // Extract Google metadata
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const email = user.email || '';

    // If no profile exists, create one (bank without trigger handle_new_user)
    if (profile === null) {
      console.log('[Auth] Profile not found, creating one...');
      const generatedUsername = await generateUniqueUsername(email, googleName);
      const { error: insertError } = await supabase
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({
          user_id: user.id,
          email: email,
          username: generatedUsername,
          full_name: googleName || null,
          avatar_url: googleAvatar || null,
          last_seen_at: new Date().toISOString(),
        } as any);

      if (insertError) {
        console.error('Error creating profile:', insertError);
      } else {
        toast.success(`Bem-vindo, @${generatedUsername}!`);
      }
      return;
    }

    // Profile exists — update only the fields that need updating
    const updates: Record<string, string> = {};

    // Username: generate if missing or generic
    const needsUsername = !profile?.username ||
      profile.username.startsWith('user_') ||
      profile.username.length < 3;

    if (needsUsername) {
      updates.username = await generateUniqueUsername(email, googleName);
    }

    // Avatar: use Google's if profile doesn't have one
    if (!profile?.avatar_url && googleAvatar) {
      updates.avatar_url = googleAvatar;
    }

    // Full name: use Google's if profile doesn't have one
    if (!profile?.full_name && googleName) {
      updates.full_name = googleName;
    }

    // Always update last_seen_at
    updates.last_seen_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return;
    }

    // Show welcome toast if username was set
    if (updates.username && updates.username !== profile?.username) {
      toast.success(`Bem-vindo, @${updates.username}!`);
    }
  } catch (error) {
    console.error('Error ensuring profile complete:', error);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Clean up any stale auth tokens from the old Supabase project
    // (keys use the project URL as prefix — remove old project's tokens)
    const OLD_PROJECT_IDS = ['qtqwxwumenxvmzpeykse'];
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && OLD_PROJECT_IDS.some(id => key.includes(id))) {
        keysToRemove.push(key);
      }
    }
    if (keysToRemove.length > 0) {
      console.log('[Auth] Clearing stale tokens from old project:', keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Safety timeout - ensure loading is set to false after max time
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Auth] Safety timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 seconds max

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // When user signs in (especially via OAuth), ensure they have a username
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to defer the Supabase call and avoid deadlock
          setTimeout(() => {
            ensureProfileComplete(session.user);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
          if (isMounted) setLoading(false);
          return;
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        const sessionKey = 'auth_session_active';

        if (session) {
          sessionStorage.setItem(sessionKey, 'true');
          setTimeout(() => {
            updateLastSeen(session.user.id);
          }, 0);
        }
      } catch (error) {
        console.error('[Auth] Error checking session:', error);
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // If signup successful and we have a username, update the profile
    if (!error && data.user && username) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('user_id', data.user.id);

      if (profileError) {
        console.error('Error updating username:', profileError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
      extraParams: {
        prompt: 'select_account',
        access_type: 'offline',
        scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    });
    return { error: error || null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Clear persisted React Query cache so stale data doesn't linger
    localStorage.removeItem('SAVEDIN_CACHE');
    sessionStorage.removeItem('auth_session_active');
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };
}
