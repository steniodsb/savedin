import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, BarChart2, TrendingUp, PieChart, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props { onContinue: () => void; onBack: () => void; }

const containerVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const, staggerChildren: 0.08 } }, exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } } };
const itemVariants = { hidden: { opacity: 0, x: -20, scale: 0.95 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } };
const headerVariants = { hidden: { opacity: 0, y: -20, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

export function OnboardingFeatureMindMap({ onContinue, onBack }: Props) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      <Card className="border-border/10 bg-card/50 backdrop-blur-md shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <motion.div variants={headerVariants} className="text-center mb-6">
            <motion.div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring', stiffness: 400 }}>
              <BarChart2 className="h-8 w-8 text-amber-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Relatórios e Insights</h2>
            <p className="text-muted-foreground">Entenda seus padrões financeiros com dados visuais</p>
          </motion.div>

          <div className="space-y-3 mb-6">
            {[
              { icon: PieChart, title: 'Gastos por Categoria', desc: 'Veja onde você mais gasta com gráficos intuitivos', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { icon: LineChart, title: 'Fluxo de Caixa', desc: 'Acompanhe receitas vs despesas mês a mês', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: TrendingUp, title: 'Evolução Patrimonial', desc: 'Veja seu patrimônio crescer ao longo do tempo', color: 'text-green-500', bg: 'bg-green-500/10' },
              { icon: BarChart2, title: 'Comparativos', desc: 'Compare meses e identifique tendências', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map((f) => (
              <motion.div key={f.title} variants={itemVariants} whileHover={{ scale: 1.02, x: 4 }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/10">
                <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center`}><f.icon className={`h-5 w-5 ${f.color}`} /></div>
                <div><h3 className="font-semibold text-sm text-foreground">{f.title}</h3><p className="text-xs text-muted-foreground">{f.desc}</p></div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1 gap-2"><ArrowLeft className="h-4 w-4" />Voltar</Button>
            <Button onClick={onContinue} className="flex-1 gap-2">Continuar<ArrowRight className="h-4 w-4" /></Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
