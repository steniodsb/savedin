import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserProfile } from '@/components/admin/AdminUsersTable';

interface SubscriptionMetric {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_interval: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  type: string;
  billing_cycle: string;
  price_cents: number;
  price_display: string;
  is_active: boolean;
}

interface AdminMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  annualRevenue: number;
  mrr: number;
  churnRate: number;
  subscriptionsByPlan: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
}

export function useAdminData() {
  const queryClient = useQueryClient();

  // Fetch all subscriptions with user data
  const subscriptionsQuery = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_subscription_metrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SubscriptionMetric[];
    },
  });

  // Fetch all profiles count
  const profilesQuery = useQuery({
    queryKey: ['admin-profiles-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch all user profiles with subscription info (using edge function to get emails)
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      return result.users as UserProfile[];
    },
  });

  // Fetch all plans
  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
  });

  // Fetch payment history for revenue calculations
  const paymentsQuery = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const metrics: AdminMetrics | null = subscriptionsQuery.data && profilesQuery.data !== undefined && paymentsQuery.data ? (() => {
    const subscriptions = subscriptionsQuery.data;
    const payments = paymentsQuery.data;
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const trialingSubscriptions = subscriptions.filter(s => s.status === 'trialing').length;
    
    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    subscriptions.forEach(sub => {
      if (sub.status === 'active' && sub.plan_price) {
        if (sub.plan_interval === 'monthly') {
          mrr += sub.plan_price;
        } else if (sub.plan_interval === 'yearly') {
          mrr += sub.plan_price / 12;
        } else if (sub.plan_interval === 'lifetime') {
          // Lifetime doesn't count towards MRR
        }
      }
    });

    // Calculate revenue by period
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let annualRevenue = 0;

    payments.forEach(payment => {
      const paidAt = new Date(payment.paid_at);
      const amount = payment.amount_cents / 100;
      
      if (paidAt >= weekAgo) weeklyRevenue += amount;
      if (paidAt >= monthAgo) monthlyRevenue += amount;
      if (paidAt >= yearAgo) annualRevenue += amount;
    });

    // Subscriptions by plan
    const subscriptionsByPlan: Record<string, number> = {};
    subscriptions.forEach(sub => {
      const planName = sub.plan_name || 'Unknown';
      subscriptionsByPlan[planName] = (subscriptionsByPlan[planName] || 0) + 1;
    });

    // Revenue by month (last 12 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = date.toISOString();
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString();
      
      const monthRevenue = payments
        .filter(p => p.paid_at >= monthStart && p.paid_at < monthEnd)
        .reduce((sum, p) => sum + p.amount_cents / 100, 0);
      
      revenueByMonth.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
      });
    }

    return {
      totalUsers: profilesQuery.data,
      activeSubscriptions,
      trialingSubscriptions,
      monthlyRevenue,
      weeklyRevenue,
      annualRevenue,
      mrr: mrr / 100, // Convert cents to currency
      churnRate: 0, // TODO: Calculate churn rate
      subscriptionsByPlan,
      revenueByMonth,
    };
  })() : null;

  // Update subscription plan
  const updateSubscriptionPlan = useMutation({
    mutationFn: async ({ subscriptionId, newPlanId }: { subscriptionId: string; newPlanId: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan_id: newPlanId, updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast({ title: 'Sucesso', description: 'Plano atualizado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível atualizar o plano: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update subscription status
  const updateSubscriptionStatus = useMutation({
    mutationFn: async ({ subscriptionId, newStatus }: { subscriptionId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível atualizar o status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update user profile (name, username)
  const updateUserProfile = useMutation({
    mutationFn: async ({ userId, fullName, username }: { userId: string; fullName: string; username: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName, 
          username: username,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível atualizar o perfil: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Create or update subscription for user
  const assignPlanToUser = useMutation({
    mutationFn: async ({ userId, planId, status = 'active' }: { userId: string; planId: string; status?: string }) => {
      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // Default to 1 month

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            plan_id: planId, 
            status,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString() 
          })
          .eq('id', existingSub.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('subscriptions')
          .insert({ 
            user_id: userId,
            plan_id: planId, 
            status,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles-count'] });
      toast({ title: 'Sucesso', description: 'Plano atribuído com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível atribuir o plano: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Reset user password (via edge function)
  const resetUserPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível alterar a senha: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete user (via edge function)
  const deleteUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles-count'] });
      toast({ title: 'Sucesso', description: 'Usuário excluído com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro', 
        description: `Não foi possível excluir o usuário: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    subscriptions: subscriptionsQuery.data || [],
    plans: plansQuery.data || [],
    users: usersQuery.data || [],
    metrics,
    isLoading: subscriptionsQuery.isLoading || profilesQuery.isLoading || paymentsQuery.isLoading || usersQuery.isLoading,
    error: subscriptionsQuery.error || profilesQuery.error || paymentsQuery.error || usersQuery.error,
    updateSubscriptionPlan,
    updateSubscriptionStatus,
    updateUserProfile,
    assignPlanToUser,
    resetUserPassword,
    deleteUser,
    refetch: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-subscriptions'] }),
        queryClient.refetchQueries({ queryKey: ['admin-profiles-count'] }),
        queryClient.refetchQueries({ queryKey: ['admin-payments'] }),
        queryClient.refetchQueries({ queryKey: ['admin-users'] }),
        queryClient.refetchQueries({ queryKey: ['admin-plans'] }),
      ]);
    },
  };
}
