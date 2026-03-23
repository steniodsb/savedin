import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Target, 
  Calendar, 
  Bell, 
  BarChart3, 
  Users, 
  Zap, 
  Shield,
  ArrowRight,
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import logoLight from '@/assets/logo-light.webp';
import logoDark from '@/assets/logo-dark.webp';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// Feature cards data
const features = [
  {
    icon: Target,
    title: 'Metas Inteligentes',
    description: 'Defina e acompanhe metas com progresso visual e milestones claros.',
    size: 'large'
  },
  {
    icon: CheckCircle2,
    title: 'Gestão de Tarefas',
    description: 'Organize tarefas em hierarquias, projetos e subtarefas.',
    size: 'medium'
  },
  {
    icon: Calendar,
    title: 'Hábitos Diários',
    description: 'Construa rotinas saudáveis com tracking de streaks.',
    size: 'medium'
  },
  {
    icon: Bell,
    title: 'Lembretes',
    description: 'Nunca esqueça compromissos importantes.',
    size: 'small'
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Visualize seu progresso com gráficos detalhados.',
    size: 'small'
  },
  {
    icon: Clock,
    title: 'Timer Integrado',
    description: 'Cronômetro para focar nas suas atividades.',
    size: 'small'
  }
];

const testimonials = [
  {
    name: 'Ana Paula',
    role: 'Empreendedora',
    avatar: '👩‍💼',
    content: 'O SaveDin transformou minha vida financeira. Consigo acompanhar todas as minhas metas e investimentos em um só lugar!'
  },
  {
    name: 'Carlos Silva',
    role: 'Desenvolvedor',
    avatar: '👨‍💻',
    content: 'Interface linda e intuitiva. O sistema de streaks me motiva a manter meus hábitos todos os dias.'
  },
  {
    name: 'Marina Costa',
    role: 'Designer',
    avatar: '👩‍🎨',
    content: 'Finalmente um app que entende como organizo minha vida. As rotinas e o timer são perfeitos!'
  },
  {
    name: 'Pedro Henrique',
    role: 'Estudante',
    avatar: '🧑‍🎓',
    content: 'Me ajudou muito a organizar meus estudos e manter o foco nas minhas metas acadêmicas.'
  }
];

const stats = [
  { value: '10k+', label: 'Usuários ativos' },
  { value: '500k+', label: 'Tarefas concluídas' },
  { value: '98%', label: 'Satisfação' },
  { value: '4.9', label: 'Avaliação', icon: Star }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, var(--gradient-start, #909090) 0%, var(--gradient-middle, #ffffff) 50%, var(--gradient-end, #909090) 100%)' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'linear-gradient(135deg, var(--gradient-end, #909090) 0%, var(--gradient-start, #909090) 100%)' }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/50 border-b border-border/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src={logoDark} alt="SaveDin" className="h-8 hidden dark:block" onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }} />
              <img src={logoLight} alt="SaveDin" className="h-8 dark:hidden" onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }} />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gradient-bg text-primary-foreground">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium gradient-text">Novo: Compartilhamento de Metas</span>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight"
            >
              <span className="text-foreground">Controle suas finanças com</span>
              <br />
              <span className="gradient-text">clareza e propósito</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground"
            >
              Gerencie tarefas, construa hábitos e alcance suas metas com uma interface 
              intuitiva e bonita. Tudo em um só lugar.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/auth">
                <Button size="lg" className="gradient-bg text-primary-foreground px-8 h-12 text-base">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="h-12 text-base bg-card/50 backdrop-blur-sm border-border/20">
                  Ver Recursos
                </Button>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-8 pt-12"
            >
              {stats.map((stat, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</span>
                    {stat.icon && <stat.icon className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image / App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Glass card with app preview placeholder */}
              <div className="relative rounded-3xl bg-card/30 backdrop-blur-xl border border-border/20 p-4 sm:p-8 shadow-2xl">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent" />
                
                {/* Mock app interface */}
                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sidebar mock */}
                  <div className="hidden md:block rounded-2xl bg-card/50 backdrop-blur-md border border-border/10 p-4 space-y-3">
                    <div className="h-8 w-24 rounded-lg bg-primary/20" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 rounded-lg bg-muted/30 flex items-center gap-3 px-3">
                          <div className="h-5 w-5 rounded bg-primary/30" />
                          <div className="h-3 w-16 rounded bg-muted/50" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Main content mock */}
                  <div className="md:col-span-2 rounded-2xl bg-card/50 backdrop-blur-md border border-border/10 p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 w-32 rounded bg-muted/50 mb-2" />
                        <div className="h-8 w-48 rounded bg-foreground/10" />
                      </div>
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">85%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl bg-muted/20 p-4 space-y-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/20" />
                          <div className="h-3 w-20 rounded bg-muted/40" />
                          <div className="h-2 w-full rounded-full bg-muted/30">
                            <div className="h-2 rounded-full gradient-bg" style={{ width: `${30 + i * 15}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 sm:-right-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/20 p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Meta concluída!</div>
                    <div className="text-xs text-muted-foreground">Exercitar 30 dias</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 sm:-left-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/20 p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Streak de 15 dias!</div>
                    <div className="text-xs text-muted-foreground">Continue assim 🔥</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Tudo que você precisa para
              <br />
              <span className="gradient-text">alcançar seus objetivos</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas em uma interface elegante para você focar no que importa.
            </motion.p>
          </motion.div>

          {/* Bento Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className={cn(
                  "group relative rounded-3xl bg-card/50 backdrop-blur-xl border border-border/20 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:bg-card/70 hover:border-border/30",
                  feature.size === 'large' && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
                  feature.size === 'medium' && 'lg:col-span-1'
                )}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-primary/10 blur-3xl" />
                </div>
                
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl gradient-bg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  
                  {feature.size === 'large' && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/20 p-3">
                        <TrendingUp className="h-5 w-5 text-green-500 mb-2" />
                        <div className="text-sm font-medium">+45%</div>
                        <div className="text-xs text-muted-foreground">Produtividade</div>
                      </div>
                      <div className="rounded-xl bg-muted/20 p-3">
                        <Heart className="h-5 w-5 text-red-500 mb-2" />
                        <div className="text-sm font-medium">98%</div>
                        <div className="text-xs text-muted-foreground">Satisfação</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section id="testimonials" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-muted/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              O que nossos usuários
              <br />
              <span className="gradient-text">estão dizendo</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Milhares de pessoas já transformaram suas finanças com o SaveDin.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                className="rounded-3xl bg-card/50 backdrop-blur-xl border border-border/20 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <p className="text-foreground mb-4">&quot;{testimonial.content}&quot;</p>
                    <div>
                      <div className="font-medium">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Gradient background */}
            <div className="absolute inset-0 gradient-bg opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            
            <div className="relative z-10 p-8 sm:p-12 lg:p-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">100% Gratuito</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Comece sua jornada de
                <br />
                produtividade hoje
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Junte-se a milhares de pessoas que já estão organizando suas vidas 
                e alcançando seus objetivos com o SaveDin.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base bg-white text-foreground hover:bg-white/90">
                    Criar Conta Gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-center gap-6 mt-8 text-primary-foreground/70 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Dados seguros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>+10k usuários</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Sem limites</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-border/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={logoDark} alt="SaveDin" className="h-6 hidden dark:block" onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }} />
              <img src={logoLight} alt="SaveDin" className="h-6 dark:hidden" onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }} />
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2025 SaveDin. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}