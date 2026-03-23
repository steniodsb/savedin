import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, ListTree, Clock, Flag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingFeatureTasksProps {
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

export function OnboardingFeatureTasks({ onContinue, onBack }: OnboardingFeatureTasksProps) {
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
              className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Tarefas Inteligentes ✅
            </h2>
            <p className="text-muted-foreground">
              Organize tudo com hierarquia e prioridades
            </p>
          </motion.div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-6">
            {[
              { icon: ListTree, title: 'Hierarquia Infinita', desc: 'Crie subtarefas em quantos níveis precisar', color: 'blue' },
              { icon: Flag, title: 'Prioridades', desc: 'Alta, média ou baixa - organize o que importa', color: 'red' },
              { icon: Clock, title: 'Cronômetro Integrado', desc: 'Meça quanto tempo gasta em cada tarefa', color: 'purple' },
              { icon: Layers, title: 'Múltiplas Visualizações', desc: 'Lista, Kanban, Timeline ou Hierarquia', color: 'cyan' },
            ].map((feature, index) => (
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
            <div className="space-y-2">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="w-5 h-5 rounded border-2 border-blue-500" />
                <span className="text-sm font-medium">Projeto App Mobile</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500">Alta</span>
              </motion.div>
              <div className="ml-6 space-y-1.5">
                <motion.div
                  className="flex items-center gap-2 opacity-70"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 0.7, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="w-4 h-4 rounded border border-muted-foreground" />
                  <span className="text-xs">Design da interface</span>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 opacity-70"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 0.7, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="w-4 h-4 rounded bg-primary border border-primary flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-xs line-through">Criar wireframes</span>
                </motion.div>
              </div>
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
