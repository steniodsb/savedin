import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logoLight from '@/assets/logo-light.webp';
import logoDark from '@/assets/logo-dark.webp';

interface OnboardingWelcomeProps {
  onContinue: () => void;
}

export function OnboardingWelcome({ onContinue }: OnboardingWelcomeProps) {
  return (
    <Card className="border-border/10 bg-card/50 backdrop-blur-md shadow-lg overflow-hidden">
      <CardContent className="p-8 text-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <img 
            src={logoLight} 
            alt="SaveDin" 
            className="h-14 mx-auto dark:hidden" 
            onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }}
          />
          <img 
            src={logoDark} 
            alt="SaveDin" 
            className="h-14 mx-auto hidden dark:block" 
            onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }}
          />
        </motion.div>

        {/* Welcome message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo ao SaveDin! 🎉
          </h1>
          <p className="text-muted-foreground text-lg">
            Sua jornada para uma vida mais organizada e produtiva começa agora.
          </p>
        </motion.div>

        {/* Highlight */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-muted/50 border border-border/20 mb-8"
        >
          <div className="flex items-center justify-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">7 dias grátis para experimentar</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Explore todas as funcionalidades sem compromisso
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onContinue} size="lg" className="w-full gap-2">
            Começar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
