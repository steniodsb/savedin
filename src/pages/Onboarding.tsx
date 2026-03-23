import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GlowBackground } from '@/components/ui/GlowBackground';
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';
import { OnboardingFeatureTasks } from '@/components/onboarding/OnboardingFeatureTasks';
import { OnboardingFeatureHabits } from '@/components/onboarding/OnboardingFeatureHabits';
import { OnboardingFeatureGoals } from '@/components/onboarding/OnboardingFeatureGoals';
import { OnboardingFeatureMindMap } from '@/components/onboarding/OnboardingFeatureMindMap';
import { OnboardingFeatureSharing } from '@/components/onboarding/OnboardingFeatureSharing';
import { OnboardingPersonalization } from '@/components/onboarding/OnboardingPersonalization';
import { OnboardingPayment } from '@/components/onboarding/OnboardingPayment';
import { Loader2 } from 'lucide-react';
import { setVisualEffectsEnabled } from '@/hooks/useVisualEffects';

type OnboardingStep = 
  | 'welcome' 
  | 'feature-tasks' 
  | 'feature-habits' 
  | 'feature-goals' 
  | 'feature-mindmap' 
  | 'feature-sharing'
  | 'personalization'
  | 'payment';

const STEPS: OnboardingStep[] = [
  'welcome',
  'personalization', // 2nd - user picks theme before seeing features
  'feature-tasks',
  'feature-habits',
  'feature-goals',
  'feature-mindmap',
  'feature-sharing',
  'payment', // Last step - plan selection with trial explanation
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const { isPremium } = useSubscription();
  const { setMode, setAccentGradient } = useTheme();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isCompleting, setIsCompleting] = useState(false);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Handle payment step - redirect based on subscription status
  const handlePaymentContinue = async () => {
    setIsCompleting(true);
    try {
      await completeOnboarding();
      
      // If user already has premium, go to dashboard
      if (isPremium) {
        toast({
          title: 'Bem-vindo de volta! 🎉',
          description: 'Seu plano está ativo. Aproveite o app!',
        });
        navigate('/');
      } else {
        // Otherwise, go to subscription page for payment
        toast({
          title: 'Quase lá! 🎯',
          description: 'Complete seu cadastro para começar os 7 dias grátis.',
        });
        navigate('/subscription');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível continuar. Tente novamente.',
        variant: 'destructive',
      });
      setIsCompleting(false);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handlePersonalizationSave = async (settings: { gradient: string; effect: 'glass' | 'dark' | 'light' }) => {
    // Apply gradient
    setAccentGradient(settings.gradient);
    
    // Apply theme mode based on effect
    const themeMode = settings.effect === 'light' ? 'light' : 'dark';
    setMode(themeMode);
    
    // Apply visual effects (glass = enabled, dark/light = disabled)
    const visualEffects = settings.effect === 'glass';
    setVisualEffectsEnabled(visualEffects);
    
    // Save to database
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          accent_gradient: settings.gradient,
          theme_mode: themeMode,
          visual_effects_enabled: visualEffects,
        })
        .eq('user_id', user.id);
    }
    
    toast({
      title: 'Personalização salva! 🎨',
      description: 'Suas preferências foram aplicadas.',
    });
    
    goToNextStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <OnboardingWelcome onContinue={goToNextStep} />;
      case 'feature-tasks':
        return <OnboardingFeatureTasks onContinue={goToNextStep} onBack={goToPreviousStep} />;
      case 'feature-habits':
        return <OnboardingFeatureHabits onContinue={goToNextStep} onBack={goToPreviousStep} />;
      case 'feature-goals':
        return <OnboardingFeatureGoals onContinue={goToNextStep} onBack={goToPreviousStep} />;
      case 'feature-mindmap':
        return <OnboardingFeatureMindMap onContinue={goToNextStep} onBack={goToPreviousStep} />;
      case 'feature-sharing':
        return <OnboardingFeatureSharing onContinue={goToNextStep} onBack={goToPreviousStep} />;
      case 'personalization':
        return <OnboardingPersonalization onSave={handlePersonalizationSave} onBack={goToPreviousStep} />;
      case 'payment':
        return <OnboardingPayment onComplete={handlePaymentContinue} onBack={goToPreviousStep} isLoading={isCompleting} />;
      default:
        return null;
    }
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Preparando sua experiência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-auto">
      <GlowBackground intensity="medium" />
      
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <motion.div
          className="h-full gradient-bg"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step indicator - compact */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
        <div className="flex gap-1">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index <= currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {currentStepIndex + 1}/{STEPS.length}
        </span>
      </div>

      {/* Content - centered */}
      <div className="min-h-full flex items-center justify-center px-4 py-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
