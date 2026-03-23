import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, GitBranch, Eye, Move, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingFeatureMindMapProps {
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

export function OnboardingFeatureMindMap({ onContinue, onBack }: OnboardingFeatureMindMapProps) {
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
              className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Network className="h-8 w-8 text-cyan-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Mapa Mental 🧠
            </h2>
            <p className="text-muted-foreground">
              Visualize suas tarefas e projetos de forma visual
            </p>
          </motion.div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-6">
            {[
              { icon: GitBranch, title: 'Visualização Radial', desc: 'Veja tarefas como um mapa mental interativo', color: 'cyan' },
              { icon: Eye, title: 'Múltiplos Modos', desc: 'Mapa mental, organograma ou lista', color: 'purple' },
              { icon: Move, title: 'Drag & Drop', desc: 'Reorganize tarefas arrastando conexões', color: 'emerald' },
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

          {/* Mock preview - Mind map visualization */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl bg-muted/20 border border-border/10 p-4 mb-6 relative overflow-hidden"
            style={{ height: 160 }}
          >
            {/* Center node */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            >
              <div className="w-16 h-8 rounded-lg bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-medium">
                Projeto
              </div>
            </motion.div>

            {/* Branch 1 */}
            <motion.div
              className="absolute left-[20%] top-[25%]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="w-14 h-6 rounded bg-blue-500/20 flex items-center justify-center text-[9px] text-blue-500">
                Design
              </div>
            </motion.div>
            <motion.svg
              className="absolute inset-0 pointer-events-none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <line x1="50%" y1="50%" x2="27%" y2="28%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.3" />
            </motion.svg>

            {/* Branch 2 */}
            <motion.div
              className="absolute right-[20%] top-[25%]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-14 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-[9px] text-emerald-500">
                Backend
              </div>
            </motion.div>
            <motion.svg
              className="absolute inset-0 pointer-events-none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <line x1="50%" y1="50%" x2="73%" y2="28%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.3" />
            </motion.svg>

            {/* Branch 3 */}
            <motion.div
              className="absolute left-[15%] bottom-[25%]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="w-14 h-6 rounded bg-purple-500/20 flex items-center justify-center text-[9px] text-purple-500">
                Testes
              </div>
            </motion.div>
            <motion.svg
              className="absolute inset-0 pointer-events-none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <line x1="50%" y1="50%" x2="22%" y2="72%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.3" />
            </motion.svg>

            {/* Branch 4 */}
            <motion.div
              className="absolute right-[15%] bottom-[25%]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="w-14 h-6 rounded bg-amber-500/20 flex items-center justify-center text-[9px] text-amber-500">
                Deploy
              </div>
            </motion.div>
            <motion.svg
              className="absolute inset-0 pointer-events-none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <line x1="50%" y1="50%" x2="78%" y2="72%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.3" />
            </motion.svg>
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
