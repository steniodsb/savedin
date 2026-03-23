import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Users, Share2, Bell, CheckCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OnboardingFeatureSharingProps {
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

export function OnboardingFeatureSharing({ onContinue, onBack }: OnboardingFeatureSharingProps) {
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
              className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center mx-auto mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Users className="h-8 w-8 text-pink-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Compartilhamento 👥
            </h2>
            <p className="text-muted-foreground">
              Colabore em tarefas com amigos e família
            </p>
          </motion.div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-6">
            {[
              { icon: Share2, title: 'Compartilhe Tarefas', desc: 'Envie tarefas para amigos conectados', color: 'pink' },
              { icon: CheckCheck, title: 'Sincronização em Tempo Real', desc: 'Ambos veem atualizações instantaneamente', color: 'blue' },
              { icon: Bell, title: 'Notificações', desc: 'Seja notificado quando completarem', color: 'amber' },
              { icon: UserPlus, title: 'Conexões', desc: 'Adicione amigos pelo @username', color: 'emerald' },
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
              {/* Shared task */}
              <motion.div
                className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-5 h-5 rounded border-2 border-pink-500"
                    whileHover={{ scale: 1.2 }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Planejar viagem de férias</p>
                    <p className="text-[10px] text-muted-foreground">Compartilhado com você</p>
                  </div>
                  <div className="flex -space-x-2">
                    <motion.div
                      initial={{ scale: 0, x: 10 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-[10px] bg-pink-500 text-white">V</AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0, x: 10 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-[10px] bg-blue-500 text-white">M</AvatarFallback>
                      </Avatar>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Activity indicator */}
              <motion.div
                className="flex items-center gap-2 px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <p className="text-[10px] text-muted-foreground">Maria marcou como concluída há 2 min</p>
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
