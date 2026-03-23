import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, AlertCircle, Gift, RefreshCw, LogOut } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, isTrialing, statusLoading, subscription, refetchStatus } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('rememberMe');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };
  // Determine if user has active access (premium or trialing)
  const hasAccess = isPremium || isTrialing;
  
  // Determine if subscription is expired (had a subscription but it ended)
  const isExpired = subscription && 
    !hasAccess && 
    subscription.status !== 'active' && 
    subscription.status !== 'trialing';

  // Check if user is new (never had a subscription)
  const isNewUser = !subscription && user;

  useEffect(() => {
    // Show modal when user doesn't have access and isn't loading
    if (!authLoading && !statusLoading && user && !hasAccess) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [authLoading, statusLoading, user, hasAccess]);

  // If still loading, show nothing (let protected route handle loading state)
  if (authLoading || statusLoading) {
    return <>{children}</>;
  }

  // If not logged in, show children (let auth handle this)
  if (!user) {
    return <>{children}</>;
  }

  // If has access, show children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show subscription gate modal
  return (
    <>
      {/* Background content (blurred) */}
      <div className="pointer-events-none select-none filter blur-sm opacity-50">
        {children}
      </div>

      {/* Subscription Gate Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="border-primary/20 shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 shadow-lg">
                      {isExpired ? (
                        <AlertCircle className="h-8 w-8 text-amber-500" />
                      ) : (
                        <Crown className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {isExpired ? 'Renove seu plano' : 'Assine para continuar'}
                    </h2>
                    
                    <p className="text-muted-foreground text-sm">
                      {isExpired 
                        ? 'Seu plano expirou. Renove para continuar utilizando todas as funcionalidades.'
                        : 'Para utilizar o SaveDin, você precisa de um plano ativo.'
                      }
                    </p>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Trial banner for new users */}
                  {isNewUser && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <Gift className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-600 text-sm">7 dias grátis!</p>
                          <p className="text-xs text-muted-foreground">
                            Experimente todas as funcionalidades sem compromisso
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Features list */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Incluso em todos os planos:</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Hábitos, tarefas e metas ilimitados
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Sincronização em todos os dispositivos
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Lembretes e notificações
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Relatórios e estatísticas
                      </li>
                    </ul>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2 pt-2">
                    <Button 
                      className="w-full gap-2" 
                      size="lg"
                      onClick={() => navigate('/subscription')}
                    >
                      <Crown className="h-4 w-4" />
                      {isExpired ? 'Renovar plano' : 'Escolher plano'}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => refetchStatus()}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Já assinei? Atualizar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-muted-foreground border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      {isLoggingOut ? 'Saindo...' : 'Sair'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
