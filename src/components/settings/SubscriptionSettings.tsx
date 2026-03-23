import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Crown, Calendar, Clock, CreditCard, Users, 
  Mail, Loader2, Check, AlertCircle, X, UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useGradientColors } from '@/hooks/useGradientColors';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DuoLinkFull {
  id: string;
  subscription_id: string;
  owner_user_id: string;
  partner_user_id: string | null;
  invite_email: string | null;
  invite_status: string;
  invite_token: string;
  invited_at: string | null;
  accepted_at: string | null;
  expires_at: string;
  partner_profile?: {
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface SubscriptionSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionSettings({ open, onOpenChange }: SubscriptionSettingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { color1 } = useGradientColors();
  const { 
    isPremium, 
    isTrialing, 
    plan, 
    subscription, 
    duoLink,
    getTrialDaysRemaining,
    getPeriodDaysRemaining 
  } = useSubscription();

  const [partnerEmail, setPartnerEmail] = useState('');
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [confirmChangePartner, setConfirmChangePartner] = useState(false);
  const [newPartnerEmail, setNewPartnerEmail] = useState('');

  // Fetch detailed duo link info if user is owner
  const { data: duoLinkDetails, isLoading: duoLoading } = useQuery({
    queryKey: ['duo-link-details', user?.id],
    queryFn: async (): Promise<DuoLinkFull | null> => {
      if (!user) return null;

      // Check if user owns a duo subscription
      const { data: ownerLink, error } = await supabase
        .from('duo_links')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !ownerLink) {
        // Check if user is a partner
        const { data: partnerLink } = await supabase
          .from('duo_links')
          .select('*')
          .eq('partner_user_id', user.id)
          .eq('invite_status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (partnerLink) {
          return partnerLink as DuoLinkFull;
        }
        return null;
      }

      // If there's a partner, fetch their profile
      if (ownerLink.partner_user_id) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('user_id', ownerLink.partner_user_id)
          .single();

        return {
          ...ownerLink,
          partner_profile: partnerProfile,
        } as DuoLinkFull;
      }

      return ownerLink as DuoLinkFull;
    },
    enabled: !!user && open && plan?.type === 'duo',
  });

  // Check if current user is the owner
  const isOwner = duoLinkDetails?.owner_user_id === user?.id;
  const isDuoPlan = plan?.type === 'duo' || (plan as any)?.mode === 'duo';

  // Initialize partner email from existing duo link
  useEffect(() => {
    if (duoLinkDetails?.invite_email) {
      setPartnerEmail(duoLinkDetails.invite_email);
    }
  }, [duoLinkDetails?.invite_email]);

  // Mutation to update/invite partner
  const updatePartnerMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user || !duoLinkDetails) throw new Error('Dados inválidos');

      const emailLower = email.toLowerCase().trim();

      // If there's an existing partner, remove them first
      if (duoLinkDetails.partner_user_id) {
        // Update the duo link to remove old partner
        const { error: removeError } = await supabase
          .from('duo_links')
          .update({
            partner_user_id: null,
            invite_email: emailLower,
            invite_status: 'pending',
            accepted_at: null,
            invited_at: new Date().toISOString(),
            // Generate new token
            invite_token: crypto.randomUUID(),
          })
          .eq('id', duoLinkDetails.id);

        if (removeError) throw removeError;
      } else {
        // Just update the invite email
        const { error } = await supabase
          .from('duo_links')
          .update({
            invite_email: emailLower,
            invite_status: 'pending',
            invited_at: new Date().toISOString(),
          })
          .eq('id', duoLinkDetails.id);

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Convite enviado para o parceiro!');
      queryClient.invalidateQueries({ queryKey: ['duo-link-details'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      setIsEditingPartner(false);
      setConfirmChangePartner(false);
      setNewPartnerEmail('');
    },
    onError: (error: Error) => {
      console.error('Error updating partner:', error);
      toast.error('Erro ao atualizar parceiro');
    },
  });

  // Handle save partner
  const handleSavePartner = () => {
    const emailToSave = isEditingPartner ? newPartnerEmail : partnerEmail;
    
    if (!emailToSave.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSave)) {
      toast.error('Email inválido');
      return;
    }

    // If there's already a partner, show confirmation dialog
    if (duoLinkDetails?.partner_user_id && duoLinkDetails.invite_status === 'accepted') {
      setNewPartnerEmail(emailToSave);
      setConfirmChangePartner(true);
    } else {
      updatePartnerMutation.mutate(emailToSave);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Get status label
  const getStatusLabel = () => {
    if (!isPremium) return { label: 'Sem assinatura', color: 'bg-muted text-muted-foreground' };
    if (isTrialing) return { label: 'Período de teste', color: 'bg-amber-500/10 text-amber-600' };
    if (subscription?.cancelAtPeriodEnd) return { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' };
    return { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-600' };
  };

  const status = getStatusLabel();
  const trialDays = getTrialDaysRemaining();
  const periodDays = getPeriodDaysRemaining();

  // Render owner partner management section
  const renderPartnerSection = () => {
    if (!isDuoPlan) return null;

    // Partner viewing (read-only)
    if (!isOwner && duoLink) {
      return (
        <div className="space-y-4">
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Plano Duo - Parceiro
            </h3>
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Você está usando este plano como convidado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O proprietário do plano gerencia o acesso
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Owner managing partner
    if (isOwner) {
      const hasAcceptedPartner = duoLinkDetails?.invite_status === 'accepted' && duoLinkDetails?.partner_user_id;
      const hasPendingInvite = duoLinkDetails?.invite_status === 'pending' && duoLinkDetails?.invite_email;

      return (
        <div className="space-y-4">
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Plano Duo - Gerenciar Parceiro
            </h3>

            {/* Current partner status */}
            {hasAcceptedPartner && duoLinkDetails?.partner_profile && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={duoLinkDetails.partner_profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {duoLinkDetails.partner_profile.full_name?.[0] || 
                       duoLinkDetails.partner_profile.username?.[0] || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {duoLinkDetails.partner_profile.full_name || duoLinkDetails.partner_profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{duoLinkDetails.partner_profile.username}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <Check className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
                {duoLinkDetails.accepted_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Parceiro desde {formatDate(duoLinkDetails.accepted_at)}
                  </p>
                )}
              </div>
            )}

            {/* Pending invite */}
            {hasPendingInvite && !hasAcceptedPartner && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Convite pendente</p>
                    <p className="text-sm text-muted-foreground">
                      {duoLinkDetails?.invite_email}
                    </p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Aguardando o parceiro aceitar o convite
                </p>
              </div>
            )}

            {/* Edit/Add partner form */}
            {(!hasAcceptedPartner || isEditingPartner) && (
              <div className="space-y-3">
                <Label htmlFor="partnerEmail" className="text-sm">
                  {hasAcceptedPartner ? 'Novo email do parceiro' : 'Email do parceiro'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="partnerEmail"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={isEditingPartner ? newPartnerEmail : partnerEmail}
                    onChange={(e) => {
                      if (isEditingPartner) {
                        setNewPartnerEmail(e.target.value);
                      } else {
                        setPartnerEmail(e.target.value);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSavePartner}
                    disabled={updatePartnerMutation.isPending}
                  >
                    {updatePartnerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {hasPendingInvite ? 'Atualizar' : 'Convidar'}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O parceiro receberá acesso ao plano após aceitar o convite
                </p>
                {isEditingPartner && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsEditingPartner(false);
                      setNewPartnerEmail('');
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar alteração
                  </Button>
                )}
              </div>
            )}

            {/* Button to change partner */}
            {hasAcceptedPartner && !isEditingPartner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPartner(true)}
                className="mt-4"
              >
                <Mail className="h-4 w-4 mr-2" />
                Alterar parceiro
              </Button>
            )}

            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Ao alterar o parceiro, o acesso premium do parceiro anterior será 
                  revogado imediatamente e transferido para o novo email.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color1}, ${color1}88)` }}
              >
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle>Minha Assinatura</DialogTitle>
                <DialogDescription>
                  Gerencie seu plano e informações de pagamento
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={cn('gap-1', status.color)}>
                {status.label}
              </Badge>
            </div>

            {/* Plan Info */}
            {plan && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5" style={{ color: color1 }} />
                    <div>
                      <p className="font-medium text-foreground">{plan.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {plan.type === 'lifetime' ? 'Vitalício' : 
                         plan.type === 'recurring' ? 'Recorrente' : plan.type}
                        {isDuoPlan && ' • Plano Duo'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trial info */}
                {isTrialing && trialDays > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">
                      {trialDays} dia{trialDays !== 1 ? 's' : ''} restante{trialDays !== 1 ? 's' : ''} de teste
                    </span>
                  </div>
                )}

                {/* Period end */}
                {subscription?.currentPeriodEnd && !isTrialing && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {subscription.cancelAtPeriodEnd 
                        ? `Acesso até ${formatDate(subscription.currentPeriodEnd)}`
                        : `Próxima cobrança em ${formatDate(subscription.currentPeriodEnd)}`
                      }
                    </span>
                  </div>
                )}

                {/* Trial end */}
                {isTrialing && subscription?.trialEnd && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Teste termina em {formatDate(subscription.trialEnd)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* No subscription */}
            {!isPremium && (
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <Crown className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium text-foreground">Sem assinatura ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Assine para desbloquear todos os recursos
                </p>
              </div>
            )}

            {/* Partner section for DUO plans */}
            {duoLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderPartnerSection()
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm change partner dialog */}
      <AlertDialog open={confirmChangePartner} onOpenChange={setConfirmChangePartner}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar parceiro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ao confirmar, o acesso premium de{' '}
                <strong>{duoLinkDetails?.partner_profile?.full_name || duoLinkDetails?.partner_profile?.username}</strong>{' '}
                será revogado imediatamente.
              </p>
              <p>
                O novo convite será enviado para <strong>{newPartnerEmail}</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmChangePartner(false);
              setNewPartnerEmail('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updatePartnerMutation.mutate(newPartnerEmail)}
              disabled={updatePartnerMutation.isPending}
            >
              {updatePartnerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
