import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  const checkAdminStatus = useCallback(async () => {
    if (!user?.id) {
      setState({ isAdmin: false, isLoading: false, error: null });
      return;
    }

    try {
      // Check if user has admin role using the is_admin function
      const { data, error } = await supabase
        .rpc('is_admin', { _user_id: user.id });

      if (error) {
        console.error('Error checking admin status:', error);
        setState({ isAdmin: false, isLoading: false, error: error.message });
        return;
      }

      setState({ isAdmin: !!data, isLoading: false, error: null });
    } catch (err) {
      console.error('Error checking admin status:', err);
      setState({ 
        isAdmin: false, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [authLoading, checkAdminStatus]);

  return {
    ...state,
    user,
    refetch: checkAdminStatus,
  };
}
