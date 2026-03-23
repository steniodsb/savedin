import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Flame, Calendar, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingFeatureHabitsProps {
  onContinue: () => void;
  onBack: () => void;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
};

export function OnboardingFeatureHabits({ onContinue, onBack }: OnboardingFeatureHabitsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Card className="border-border/10 bg-card/50 backdrop-blur-md shadow-lg overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <motion.div variants={headerVariants} className="text-center mb-6">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Flame className="h-8 w-8 text-orange-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Hábitos & Streaks 🔥
            </h2>
            <p className="text-muted-foreground">
              Construa rotinas que transformam sua vida
            </p>
          </motion.div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-6">
            {[
              { icon: Flame, title: 'Streaks Motivacionais', desc: 'Mantenha a sequência e não quebre o ritmo', color: 'orange' },
              { icon: Calendar, title: 'Frequências Flexíveis', desc: 'Diário, semanal ou dias específicos', color: 'emerald' },
              { icon: Target, title: 'Tracking Avançado', desc: 'Quantidade, checklist ou tempo', color: 'purple' },
              { icon: BarChart3, title: 'Duas Visualizações', desc: 'Cards coloridos ou calendário heatmap', color: 'cyan' },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 4 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/10"
              >
                <motion.div
                  className={`w-10 h-10 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center`}
                  whileHover={{ rotate: 10 }}
                >
                  <feature.icon className={`h-5 w-5 text-${feature.color}-500`} />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mock preview - Two views */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {/* Card view preview */}
            <motion.div
              className="rounded-xl bg-muted/20 border border-border/10 p-3"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-[10px] text-muted-foreground mb-2 text-center">Cards</p>
              <div className="space-y-1.5">
                <motion.div
                  className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-xs">🏃</span>
                  <span className="text-[10px] flex-1">Exercício</span>
                  <span className="text-[10px] text-orange-500">🔥5</span>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="text-xs">📚</span>
                  <span className="text-[10px] flex-1">Leitura</span>
                  <span className="text-[10px] text-blue-500">🔥12</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Calendar view preview */}
            <motion.div
              className="rounded-xl bg-muted/20 border border-border/10 p-3"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-[10px] text-muted-foreground mb-2 text-center">Heatmap</p>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.03 }}
                    className={`w-3 h-3 rounded-sm ${
                      i % 3 === 0 ? 'bg-emerald-500/20' :
                      i % 2 === 0 ? 'bg-emerald-500/50' :
                      'bg-emerald-500'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Navigation */}
          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={onContinue} className="flex-1 gap-2">
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
