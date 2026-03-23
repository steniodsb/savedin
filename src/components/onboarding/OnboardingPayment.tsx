import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Shield, Calendar, CreditCard, CheckCircle2, ArrowLeft, Sparkles, User, Users, ArrowRight, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface OnboardingPaymentProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

type PlanMode = 'individual' | 'duo';

export function OnboardingPayment({ onComplete, onBack, isLoading }: OnboardingPaymentProps) {
  const navigate = useNavigate();
  const { isPremium, plan } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [planMode, setPlanMode] = useState<PlanMode>('individual');

  const getPlans = () => {
    if (planMode === 'individual') {
      return [
        {
          id: 'monthly' as const,
          name: 'Mensal',
          price: 'R$ 14,90',
          period: '/mês',
          description: 'Flexibilidade total',
        },
        {
          id: 'yearly' as const,
          name: 'Anual',
          price: 'R$ 99,90',
          period: '/ano',
          description: 'Economize 44%',
          highlight: true,
        },
        {
          id: 'lifetime' as const,
          name: 'Vitalício',
          price: 'R$ 249,90',
          period: 'único',
          description: 'Pague uma vez',
        },
      ];
    } else {
      return [
        {
          id: 'monthly' as const,
          name: 'Mensal Duo',
          price: 'R$ 19,90',
          period: '/mês',
          description: 'Para 2 pessoas',
        },
        {
          id: 'yearly' as const,
          name: 'Anual Duo',
          price: 'R$ 149,90',
          period: '/ano',
          description: 'Economize 37%',
          highlight: true,
        },
        {
          id: 'lifetime' as const,
          name: 'Vitalício Duo',
          price: 'R$ 399,90',
          period: 'único',
          description: 'Para sempre, a dois',
        },
      ];
    }
  };

  const plans = getPlans();

  const benefits = [
    'Hábitos, tarefas e metas ilimitados',
    'Sincronização em todos os dispositivos',
    'Lembretes e notificações personalizados',
    'Relatórios e estatísticas detalhadas',
    'Compartilhamento com amigos e família',
  ];

  // If user already has active subscription, show simplified view
  if (isPremium) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 px-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Você já é Premium!</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Seu plano <span className="font-semibold text-primary">{plan?.name || 'Premium'}</span> está ativo. 
            Aproveite todos os recursos do SaveDin.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{plan?.name || 'Plano Premium'}</p>
                  <p className="text-xs text-muted-foreground">Assinatura ativa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full space-y-3 pt-4"
        >
          <Button
            onClick={onComplete}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? 'Entrando...' : 'Ir para o app'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 px-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Comece sua jornada de produtividade com 7 dias grátis
        </p>
      </motion.div>

      {/* Plan Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div className="flex p-1 bg-muted rounded-xl">
          <button
            onClick={() => setPlanMode('individual')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              planMode === 'individual'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" />
            Individual
          </button>
          <button
            onClick={() => setPlanMode('duo')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              planMode === 'duo'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            Duo
          </button>
        </div>
        {planMode === 'duo' && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Compartilhe com seu parceiro(a), familiar ou amigo
          </p>
        )}
      </motion.div>

      {/* Trial Info Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full"
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm">Experimente 7 dias grátis</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Você não será cobrado agora. A cobrança só ocorre após os 7 dias de teste. 
                  Se não gostar, cancele a qualquer momento e não será cobrado nada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full space-y-2"
      >
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              "w-full p-3 rounded-xl border-2 transition-all text-left",
              selectedPlan === plan.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  selectedPlan === plan.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {selectedPlan === plan.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{plan.name}</span>
                    {plan.highlight && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
            </div>
          </button>
        ))}
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full text-left"
      >
        <p className="text-xs font-medium text-muted-foreground mb-2">Incluso em todos os planos:</p>
        <div className="space-y-1.5">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full space-y-3 pt-2"
      >
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="w-full gap-2"
          size="lg"
        >
          <CreditCard className="h-4 w-4" />
          {isLoading ? 'Processando...' : 'Continuar para pagamento'}
        </Button>
        
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Cobrança apenas após 7 dias • Cancele quando quiser</span>
        </div>

        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="w-full gap-2"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </motion.div>
    </div>
  );
}
