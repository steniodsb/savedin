import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubscriptionStatus {
  isPremium: boolean;
  isTrialing: boolean;
  plan: {
    id: string;
    name: string;
    slug: string;
    type: string;
  } | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  duoLink: {
    id: string;
    ownerUserId: string;
    inviteStatus: string;
  } | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  type: string;
  billing_cycle: string;
  mode: string;
  price_cents: number;
  price_display: string;
  trial_days: number;
  features: string[];
  savings_percentage: number;
  highlight: boolean;
  display_order: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription status - with fallback to direct DB query
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!user) {
        return {
          isPremium: false,
          isTrialing: false,
          plan: null,
          subscription: null,
          duoLink: null,
        };
      }

      // Try edge function first
      try {
        const { data, error } = await supabase.functions.invoke('get-subscription-status');

        if (!error && data && (data.isPremium !== undefined || data.hasPremium !== undefined)) {
          return {
            isPremium: data.isPremium ?? data.hasPremium ?? false,
            isTrialing: data.isTrialing ?? false,
            plan: data.plan ?? null,
            subscription: data.subscription ?? null,
            duoLink: data.duoLink ?? null,
          };
        }
      } catch (e) {
        console.error('Edge function error, falling back to direct query:', e);
      }

      // Fallback: Direct database query
      console.log('Using direct database query for subscription status');

      // Get user's active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscription) {
        return {
          isPremium: true,
          isTrialing: subscription.status === 'trialing',
          plan: subscription.plan ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            slug: subscription.plan.slug,
            type: subscription.plan.type,
          } : null,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            trialEnd: subscription.trial_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          duoLink: null,
        };
      }

      // Check duo link as partner
      const { data: duoLink } = await supabase
        .from('duo_links')
        .select(`
          *,
          subscription:subscriptions(
            *,
            plan:plans(*)
          )
        `)
        .eq('partner_user_id', user.id)
        .eq('invite_status', 'accepted')
        .single();

      if (duoLink?.subscription && ['active', 'trialing'].includes(duoLink.subscription.status)) {
        return {
          isPremium: true,
          isTrialing: duoLink.subscription.status === 'trialing',
          plan: duoLink.subscription.plan ? {
            id: duoLink.subscription.plan.id,
            name: duoLink.subscription.plan.name,
            slug: duoLink.subscription.plan.slug,
            type: duoLink.subscription.plan.type,
          } : null,
          subscription: {
            id: duoLink.subscription.id,
            status: duoLink.subscription.status,
            currentPeriodEnd: duoLink.subscription.current_period_end,
            trialEnd: duoLink.subscription.trial_end,
            cancelAtPeriodEnd: duoLink.subscription.cancel_at_period_end,
          },
          duoLink: {
            id: duoLink.id,
            ownerUserId: duoLink.owner_user_id,
            inviteStatus: duoLink.invite_status,
          },
        };
      }

      return {
        isPremium: false,
        isTrialing: false,
        plan: null,
        subscription: null,
        duoLink: null,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Limit retries to prevent infinite loop
    retryDelay: 5000, // Wait 5 seconds before retry
  });

  // Fetch available plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features)
          ? (plan.features as unknown as string[])
          : [],
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Create subscription mutation
  const createSubscription = useMutation({
    mutationFn: async (params: {
      planId: string;
      paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
      cpfCnpj: string;
      creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
      };
      withTrial?: boolean;
    }) => {
      // Refresh session to ensure JWT is valid before calling Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('create-asaas-subscription', {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });

      if (data.paymentUrl) {
        // For PIX or Boleto, redirect to payment page
        window.open(data.paymentUrl, '_blank');
      }

      if (data.subscription?.status === 'trialing') {
        toast.success('Trial de 7 dias ativado! Seu cartão será cobrado após o período de teste.');
      } else {
        toast.success('Assinatura criada com sucesso!');
      }
    },
    onError: (error: Error) => {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Erro ao criar assinatura');
    },
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation({
    mutationFn: async (immediate: boolean = false) => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { immediate },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });

      if (data.cancelledImmediately) {
        toast.success('Assinatura cancelada.');
      } else {
        toast.success('Assinatura será cancelada ao final do período.');
      }
    },
    onError: (error: Error) => {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Erro ao cancelar assinatura');
    },
  });

  // Helper to get days remaining in trial
  const getTrialDaysRemaining = useCallback(() => {
    if (!status?.subscription?.trialEnd) return 0;
    const trialEnd = new Date(status.subscription.trialEnd);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [status?.subscription?.trialEnd]);

  // Helper to get days remaining in current period
  const getPeriodDaysRemaining = useCallback(() => {
    if (!status?.subscription?.currentPeriodEnd) return null;
    const periodEnd = new Date(status.subscription.currentPeriodEnd);
    const now = new Date();
    const diffTime = periodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [status?.subscription?.currentPeriodEnd]);

  return {
    // Status
    isPremium: status?.isPremium ?? false,
    isTrialing: status?.isTrialing ?? false,
    plan: status?.plan ?? null,
    subscription: status?.subscription ?? null,
    duoLink: status?.duoLink ?? null,
    statusLoading,

    // Plans
    plans,
    plansLoading,

    // Actions
    createSubscription,
    cancelSubscription,
    refetchStatus,

    // Helpers
    getTrialDaysRemaining,
    getPeriodDaysRemaining,
  };
}
