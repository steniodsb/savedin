import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Target, TrendingUp, FolderKanban, Trophy, Milestone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingFeatureGoalsProps {
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

export function OnboardingFeatureGoals({ onContinue, onBack }: OnboardingFeatureGoalsProps) {
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
              className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Target className="h-8 w-8 text-purple-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Metas & Projetos 🎯
            </h2>
            <p className="text-muted-foreground">
              Defina objetivos e acompanhe seu progresso
            </p>
          </motion.div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-6">
            {[
              { icon: TrendingUp, title: 'Metas Mensuráveis', desc: 'Defina valores e acompanhe o progresso', color: 'purple' },
              { icon: FolderKanban, title: 'Projetos Complexos', desc: 'Organize tarefas dentro de projetos maiores', color: 'blue' },
              { icon: Milestone, title: 'Marcos de Progresso', desc: 'Divida grandes objetivos em etapas', color: 'amber' },
              { icon: Trophy, title: 'Contribuição de Hábitos', desc: 'Hábitos podem contribuir para suas metas', color: 'emerald' },
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

          {/* Mock preview */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl bg-muted/20 border border-border/10 p-4 mb-6"
          >
            <div className="space-y-3">
              {/* Measurable goal */}
              <motion.div
                className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>📚</span>
                    <span className="text-sm font-medium">Ler 24 livros este ano</span>
                  </div>
                  <span className="text-xs text-purple-500">67%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: '67%' }}
                    transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">16 de 24 livros</p>
              </motion.div>

              {/* Project */}
              <motion.div
                className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>🚀</span>
                    <span className="text-sm font-medium">Lançar produto</span>
                  </div>
                  <span className="text-xs text-blue-500">40%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: '40%' }}
                    transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">4 de 10 tarefas</p>
              </motion.div>
            </div>
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
