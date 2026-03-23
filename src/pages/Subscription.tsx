import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Crown, Check, Sparkles, Shield, Zap, Users, 
  CreditCard, ArrowLeft, Loader2, AlertCircle,
  Calendar, Gift, Lock, Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Tabs removed - using custom billing selector
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'plans' | 'checkout';
type PaymentMethod = 'CREDIT_CARD' | 'PIX';

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromOnboarding = searchParams.get('from') === 'onboarding';
  const { user } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { 
    isPremium, 
    isTrialing, 
    plan: currentPlan, 
    subscription,
    plans, 
    plansLoading,
    createSubscription,
    cancelSubscription,
    getTrialDaysRemaining,
    getPeriodDaysRemaining,
  } = useSubscription();

  const [step, setStep] = useState<Step>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [withTrial, setWithTrial] = useState(true);
  
  // Form state
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Handle onboarding completion after successful subscription
  useEffect(() => {
    const handleOnboardingComplete = async () => {
      if (createSubscription.isSuccess && isFromOnboarding) {
        try {
          await completeOnboarding();
          toast.success('Bem-vindo ao SaveDin! 🎉');
          navigate('/');
        } catch (error) {
          console.error('Error completing onboarding:', error);
          // Still navigate even if onboarding completion fails
          navigate('/');
        }
      }
    };

    handleOnboardingComplete();
  }, [createSubscription.isSuccess, isFromOnboarding, completeOnboarding, navigate]);

  // Filter plans by billing cycle
  const filteredPlans = plans.filter(p => {
    if (billingCycle === 'monthly') return p.billing_cycle === 'monthly';
    if (billingCycle === 'yearly') return p.billing_cycle === 'yearly';
    if (billingCycle === 'lifetime') return p.billing_cycle === 'once' || p.type === 'lifetime';
    return true;
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Format helpers
  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setStep('checkout');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan || !user) return;

    // Validation
    const cleanCpf = cpfCnpj.replace(/\D/g, '');
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error('CPF ou CNPJ inválido');
      return;
    }

    if (paymentMethod === 'CREDIT_CARD') {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 13 || cleanCard.length > 19) {
        toast.error('Número do cartão inválido');
        return;
      }
      if (!cardName.trim()) {
        toast.error('Nome no cartão é obrigatório');
        return;
      }
      const [month, year] = cardExpiry.split('/');
      if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
        toast.error('Data de validade inválida');
        return;
      }
      if (cardCvv.length < 3 || cardCvv.length > 4) {
        toast.error('CVV inválido');
        return;
      }
    }

    const [expiryMonth, expiryYear] = cardExpiry.split('/');

    createSubscription.mutate({
      planId: selectedPlan.id,
      paymentMethod,
      cpfCnpj: cleanCpf,
      withTrial: paymentMethod === 'CREDIT_CARD' && withTrial && selectedPlan.trial_days > 0,
      creditCard: paymentMethod === 'CREDIT_CARD' ? {
        holderName: cardName,
        number: cardNumber.replace(/\D/g, ''),
        expiryMonth: expiryMonth,
        expiryYear: '20' + expiryYear,
        ccv: cardCvv,
      } : undefined,
      creditCardHolderInfo: paymentMethod === 'CREDIT_CARD' ? {
        name: cardName,
        email: user.email || '',
        cpfCnpj: cleanCpf,
        postalCode: postalCode.replace(/\D/g, ''),
        addressNumber,
        phone: phone.replace(/\D/g, ''),
      } : undefined,
    });
  };

  // If already premium, show current subscription
  if (isPremium && !plansLoading) {
    const trialDays = getTrialDaysRemaining();
    const periodDays = getPeriodDaysRemaining();

    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Minha Assinatura</h1>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentPlan?.name || 'Premium'}
                      {isTrialing && (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                          Trial
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {subscription?.status === 'active' && 'Assinatura ativa'}
                      {subscription?.status === 'trialing' && `${trialDays} dias restantes de trial`}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTrialing && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Gift className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Período de teste: {trialDays} dias restantes
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Após o trial, você será cobrado automaticamente.
                  </p>
                </div>
              )}

              {periodDays !== null && !isTrialing && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Próxima cobrança</span>
                  <span className="font-medium">em {periodDays} dias</span>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Cancelamento agendado
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sua assinatura será cancelada ao final do período atual.
                  </p>
                </div>
              )}

              <Separator />

              {!subscription?.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => cancelSubscription.mutate(false)}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Cancelar assinatura
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (step === 'checkout') {
                setStep('plans');
              } else if (isFromOnboarding) {
                // Go back to onboarding
                navigate('/onboarding');
              } else {
                // Try to go back, fallback to home if no history
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {step === 'plans' ? 'Escolha seu plano' : 'Finalizar assinatura'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Trial Banner */}
              <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <Gift className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-600">7 dias de garantia!</p>
                      <p className="text-sm text-muted-foreground">
                        Cartão: cobrado só após 7 dias de teste. PIX: reembolso garantido em 7 dias.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Cycle Selector */}
              <div className="p-1.5 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border/30">
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Mensal */}
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      "relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
                      billingCycle === 'monthly'
                        ? "bg-background shadow-md border border-border/50"
                        : "hover:bg-background/50"
                    )}
                  >
                    <Calendar className={cn(
                      "h-5 w-5 transition-colors",
                      billingCycle === 'monthly' ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      billingCycle === 'monthly' ? "text-foreground" : "text-muted-foreground"
                    )}>
                      Mensal
                    </span>
                  </button>

                  {/* Anual */}
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={cn(
                      "relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
                      billingCycle === 'yearly'
                        ? "bg-gradient-to-br from-primary/10 to-primary/5 shadow-md border border-primary/30"
                        : "hover:bg-background/50"
                    )}
                  >
                    <div className="absolute -top-2 -right-1">
                      <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
                        -40%
                      </Badge>
                    </div>
                    <Sparkles className={cn(
                      "h-5 w-5 transition-colors",
                      billingCycle === 'yearly' ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      billingCycle === 'yearly' ? "text-primary" : "text-muted-foreground"
                    )}>
                      Anual
                    </span>
                    {billingCycle === 'yearly' && (
                      <span className="text-[10px] text-green-600 font-medium">Mais popular</span>
                    )}
                  </button>

                  {/* Vitalício */}
                  <button
                    onClick={() => setBillingCycle('lifetime')}
                    className={cn(
                      "relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
                      billingCycle === 'lifetime'
                        ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-md border border-amber-500/30"
                        : "hover:bg-background/50"
                    )}
                  >
                    <div className="absolute -top-2 -right-1">
                      <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
                        ∞
                      </Badge>
                    </div>
                    <Crown className={cn(
                      "h-5 w-5 transition-colors",
                      billingCycle === 'lifetime' ? "text-amber-500" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      billingCycle === 'lifetime' ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      Vitalício
                    </span>
                    {billingCycle === 'lifetime' && (
                      <span className="text-[10px] text-amber-600 font-medium">Pague uma vez</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Lifetime Banner (when selected) */}
              {billingCycle === 'lifetime' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-amber-500/20">
                          <Crown className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-600">Acesso vitalício!</p>
                          <p className="text-sm text-muted-foreground">
                            Pague uma única vez e tenha acesso para sempre
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Plans */}
              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPlans.map((plan) => {
                    const isLifetime = plan.billing_cycle === 'once' || plan.type === 'lifetime';
                    const isDuo = plan.type === 'duo' || plan.name.toLowerCase().includes('duo');
                    
                    return (
                      <Card 
                        key={plan.id}
                        className={cn(
                          "relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg",
                          plan.highlight && "border-primary ring-2 ring-primary/20",
                          isLifetime && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
                        )}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {plan.highlight && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary shadow-md">
                              <Star className="h-3 w-3 mr-1" />
                              Mais popular
                            </Badge>
                          </div>
                        )}
                        
                        {isLifetime && !plan.highlight && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-amber-500 shadow-md">
                              <Crown className="h-3 w-3 mr-1" />
                              Para sempre
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {isLifetime && <Crown className="h-5 w-5 text-amber-500" />}
                              {plan.name}
                            </CardTitle>
                            {isDuo && (
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                                <Users className="h-3 w-3 mr-1" />
                                2 pessoas
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-bold">{plan.price_display}</span>
                            {!isLifetime && (
                              <span className="text-muted-foreground">
                                /{plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}
                              </span>
                            )}
                          </div>
                          
                          {plan.savings_percentage > 0 && (
                            <Badge variant="outline" className="w-fit text-green-600 border-green-600/30 mt-2">
                              Economize {plan.savings_percentage}%
                            </Badge>
                          )}
                          
                          {isLifetime && (
                            <p className="text-xs text-amber-600 mt-2">
                              Pagamento único • Acesso vitalício
                            </p>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <Button className={cn(
                            "w-full",
                            isLifetime && "bg-amber-500 hover:bg-amber-600"
                          )}>
                            {plan.trial_days > 0 ? 'Começar 7 dias grátis' : 'Assinar agora'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* All Plans Include - Unified features section */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Todos os planos incluem
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Hábitos, tarefas e metas ilimitados</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Sincronização em todos os dispositivos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Lembretes e notificações</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Relatórios e estatísticas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Backup automático na nuvem</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Suporte prioritário</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'checkout' && selectedPlan && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Selected Plan Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{selectedPlan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPlan.billing_cycle === 'monthly' && 'Cobrança mensal'}
                          {selectedPlan.billing_cycle === 'yearly' && 'Cobrança anual'}
                          {selectedPlan.billing_cycle === 'lifetime' && 'Pagamento único'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{selectedPlan.price_display}</p>
                      {selectedPlan.trial_days > 0 && paymentMethod === 'CREDIT_CARD' && withTrial && (
                        <p className="text-xs text-green-600">7 dias grátis</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Forma de pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label
                      htmlFor="pix"
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        paymentMethod === 'PIX'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <RadioGroupItem value="PIX" id="pix" className="sr-only" />
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.45 22.73L12.09 19.37C11.82 19.1 11.5 18.97 11.14 18.97H9.89C9.25 18.97 8.66 18.72 8.22 18.28L6.06 16.11C5.63 15.68 5.38 15.09 5.38 14.45V11.64C5.38 11 5.63 10.41 6.06 9.97L8.23 7.8C8.66 7.37 9.25 7.12 9.89 7.12H11.14C11.5 7.12 11.82 6.98 12.09 6.72L15.45 3.36C15.86 2.95 16.5 2.95 16.91 3.36L20.27 6.72C20.54 6.99 20.86 7.12 21.22 7.12H22.47C23.11 7.12 23.7 7.37 24.13 7.81L26.3 9.98C26.73 10.41 26.98 11 26.98 11.64V14.45C26.98 15.09 26.73 15.68 26.3 16.12L24.13 18.29C23.7 18.72 23.11 18.97 22.47 18.97H21.22C20.86 18.97 20.54 19.11 20.27 19.37L16.91 22.73C16.5 23.14 15.86 23.14 15.45 22.73Z" transform="translate(-4 -2) scale(0.85)" />
                      </svg>
                      <span className="text-sm font-medium">PIX</span>
                    </Label>
                    <Label
                      htmlFor="credit_card"
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        paymentMethod === 'CREDIT_CARD'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <RadioGroupItem value="CREDIT_CARD" id="credit_card" className="sr-only" />
                      <CreditCard className="h-5 w-5" />
                      <span className="text-sm font-medium">Cartão</span>
                    </Label>
                  </RadioGroup>

                  {paymentMethod === 'PIX' && selectedPlan.trial_days > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 text-blue-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Pagamento via PIX: acesso imediato com 7 dias para solicitar reembolso
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Form */}
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dados de pagamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* CPF/CNPJ */}
                    <div>
                      <Label htmlFor="cpf">CPF ou CNPJ</Label>
                      <Input
                        id="cpf"
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={18}
                        required
                      />
                    </div>

                    {paymentMethod === 'CREDIT_CARD' && (
                      <>
                        {/* Trial Option */}
                        {selectedPlan.trial_days > 0 && (
                          <div 
                            className={cn(
                              "p-4 rounded-lg border-2 cursor-pointer transition-all",
                              withTrial 
                                ? "border-green-500 bg-green-500/10" 
                                : "border-border"
                            )}
                            onClick={() => setWithTrial(!withTrial)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Gift className={cn("h-5 w-5", withTrial ? "text-green-500" : "text-muted-foreground")} />
                                <div>
                                  <p className="font-medium">Ativar 7 dias grátis</p>
                                  <p className="text-xs text-muted-foreground">
                                    Você só será cobrado após o período de teste
                                  </p>
                                </div>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                withTrial ? "border-green-500 bg-green-500" : "border-muted-foreground"
                              )}>
                                {withTrial && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Card Number */}
                        <div>
                          <Label htmlFor="cardNumber">Número do cartão</Label>
                          <Input
                            id="cardNumber"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            required
                          />
                        </div>

                        {/* Card Name */}
                        <div>
                          <Label htmlFor="cardName">Nome no cartão</Label>
                          <Input
                            id="cardName"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            placeholder="NOME COMO NO CARTÃO"
                            required
                          />
                        </div>

                        {/* Expiry + CVV */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cardExpiry">Validade</Label>
                            <Input
                              id="cardExpiry"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/AA"
                              maxLength={5}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="cardCvv">CVV</Label>
                            <Input
                              id="cardCvv"
                              type="password"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="000"
                              maxLength={4}
                              required
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Additional Info */}
                        <p className="text-sm text-muted-foreground">Dados do titular</p>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="postalCode">CEP</Label>
                            <Input
                              id="postalCode"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2'))}
                              placeholder="00000-000"
                              maxLength={9}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="addressNumber">Número</Label>
                            <Input
                              id="addressNumber"
                              value={addressNumber}
                              onChange={(e) => setAddressNumber(e.target.value)}
                              placeholder="123"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            required
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Security Badge */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span className="text-xs">
                        Pagamento seguro processado pelo Asaas
                      </span>
                    </div>

                    {/* Submit */}
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base"
                      disabled={createSubscription.isPending}
                    >
                      {createSubscription.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          {paymentMethod === 'CREDIT_CARD' && withTrial && selectedPlan.trial_days > 0 ? (
                            <>
                              <Gift className="h-4 w-4 mr-2" />
                              Começar trial de 7 dias
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              {paymentMethod === 'PIX' ? 'Gerar PIX' : `Pagar ${selectedPlan.price_display}`}
                            </>
                          )}
                        </>
                      )}
                    </Button>

                    {paymentMethod === 'CREDIT_CARD' && withTrial && selectedPlan.trial_days > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        Seu cartão será cobrado {selectedPlan.price_display} após os 7 dias de teste
                      </p>
                    )}
                    {paymentMethod === 'PIX' && selectedPlan.trial_days > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        Acesso imediato após confirmação do PIX • 7 dias de garantia para reembolso
                      </p>
                    )}
                  </CardContent>
                </Card>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
