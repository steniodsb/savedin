import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Share, 
  Plus, 
  CheckCircle2, 
  Smartphone, 
  Bell, 
  Wifi, 
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import logoDark from '@/assets/logo-dark.webp';
import logoLight from '@/assets/logo-light.webp';


export default function Install() {
  const { 
    isInstalled, 
    canPromptInstall, 
    promptInstall, 
    isIOS, 
    isAndroid, 
    platform,
    isSafari,
    isStandalone
  } = usePWAInstall();

  const [showInstructions, setShowInstructions] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'prompting' | 'success'>('idle');

  // Apply system theme on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleInstall = async () => {
    if (canPromptInstall) {
      setInstallStatus('prompting');
      const success = await promptInstall();
      setInstallStatus(success ? 'success' : 'idle');
    } else if (isIOS) {
      setShowInstructions(true);
    }
  };

  const features = [
    { icon: Smartphone, title: 'Acesso Rápido', description: 'Abra direto da tela inicial' },
    { icon: Bell, title: 'Notificações', description: 'Receba lembretes importantes' },
    { icon: Wifi, title: 'Funciona Offline', description: 'Use mesmo sem internet' },
    { icon: Zap, title: 'Super Rápido', description: 'Carrega instantaneamente' },
  ];

  // If already installed, show success state
  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow effects */}
        <div
          className="fixed pointer-events-none"
          style={{
            top: '-10%',
            left: '-10%',
            width: '50%',
            height: '50%',
            background: 'linear-gradient(180deg, var(--gradient-start, #909090), transparent)',
            filter: 'blur(60px)',
            opacity: 0.5,
            zIndex: 0,
          }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-green-500/20 backdrop-blur-sm flex items-center justify-center mb-6 relative z-10"
        >
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2 relative z-10">App Instalado!</h1>
        <p className="text-muted-foreground text-center mb-8 relative z-10">
          O SaveDin já está na sua tela inicial.
        </p>
        <Button asChild className="relative z-10">
          <a href="/">Abrir App</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Glow effects */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'linear-gradient(180deg, var(--gradient-start, #909090), transparent)',
          filter: 'blur(60px)',
          opacity: 0.5,
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-5%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: 'linear-gradient(0deg, var(--gradient-end, #909090), transparent)',
          filter: 'blur(60px)',
          opacity: 0.5,
          zIndex: 0,
        }}
      />
      
      {/* Hero Section */}
      <div className="relative z-10">
        <div className="relative px-6 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="h-10 mb-6">
              <img 
                src={logoLight} 
                alt="SaveDin" 
                className="h-full w-auto object-contain dark:hidden"
                onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }}
              />
              <img 
                src={logoDark} 
                alt="SaveDin" 
                className="h-full w-auto object-contain hidden dark:block"
                onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }}
              />
            </div>
            <p className="text-muted-foreground text-lg">
              Controle suas finanças em um só lugar
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-8 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-border/10 shadow-lg"
            >
              <feature.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Install Section */}
      <div className="px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card/50 backdrop-blur-md rounded-3xl p-6 border border-border/10 shadow-lg"
        >
          <h2 className="text-xl font-bold text-foreground mb-4 text-center">
            Instale o App
          </h2>

          {/* Android/Desktop - Native prompt available */}
          {canPromptInstall && (
            <Button 
              onClick={handleInstall} 
              className="w-full h-14 text-lg rounded-2xl"
              disabled={installStatus === 'prompting'}
            >
              <Download className="w-5 h-5 mr-2" />
              {installStatus === 'prompting' ? 'Instalando...' : 'Instalar Agora'}
            </Button>
          )}

          {/* iOS - Show instructions */}
          {isIOS && (
            <div className="space-y-4">
              {!isSafari && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Atenção:</strong> Para instalar o app no iPhone/iPad, 
                    abra esta página no Safari.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-3 w-full"
                    onClick={() => {
                      // Copy URL to clipboard
                      navigator.clipboard.writeText(window.location.href);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                </div>
              )}

              {isSafari && (
                <>
                  <Button 
                    onClick={() => setShowInstructions(!showInstructions)} 
                    className="w-full h-14 text-lg rounded-2xl"
                  >
                    <Share className="w-5 h-5 mr-2" />
                    Como Instalar
                    {showInstructions ? (
                      <ChevronUp className="w-5 h-5 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 ml-2" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-4">
                          <IOSStep 
                            step={1} 
                            icon={<Share className="w-5 h-5" />}
                            title="Toque em Compartilhar"
                            description="Na barra inferior do Safari, toque no ícone de compartilhar"
                          />
                          <IOSStep 
                            step={2} 
                            icon={<Plus className="w-5 h-5" />}
                            title="Adicionar à Tela de Início"
                            description="Role para baixo e toque em 'Adicionar à Tela de Início'"
                          />
                          <IOSStep 
                            step={3} 
                            icon={<CheckCircle2 className="w-5 h-5" />}
                            title="Confirme"
                            description="Toque em 'Adicionar' no canto superior direito"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}

          {/* Android without prompt (rare case) */}
          {isAndroid && !canPromptInstall && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Toque no menu do navegador (⋮) e selecione "Instalar app" ou "Adicionar à tela inicial"
              </p>
            </div>
          )}

          {/* Desktop without prompt */}
          {platform === 'desktop' && !canPromptInstall && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Para instalar, clique no ícone de instalação na barra de endereços do navegador
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Already have account */}
      <div className="px-6 pb-12 text-center relative z-10">
        <p className="text-muted-foreground mb-3">Já tem uma conta?</p>
        <Button variant="outline" asChild className="rounded-2xl bg-card/50 backdrop-blur-sm border-border/10">
          <a href="/auth">Fazer Login</a>
        </Button>
      </div>
    </div>
  );
}

function IOSStep({ 
  step, 
  icon, 
  title, 
  description 
}: { 
  step: number; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center text-primary font-bold">
        {step}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary">{icon}</span>
          <h4 className="font-semibold text-foreground">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
