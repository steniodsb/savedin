import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Download, X, Share, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BANNER_DISMISSED_KEY = 'pwa-install-banner-dismissed';
const BANNER_DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallBanner() {
  const navigate = useNavigate();
  const { 
    isInstalled, 
    isStandalone,
    canPromptInstall, 
    promptInstall, 
    isIOS,
    platform
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled || isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if banner was dismissed recently
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < BANNER_DISMISS_DURATION) {
        return;
      }
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled, isStandalone]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (canPromptInstall) {
      setIsInstalling(true);
      const success = await promptInstall();
      setIsInstalling(false);
      if (success) {
        setIsVisible(false);
      }
    } else {
      // Navigate to install page for instructions
      navigate('/install');
    }
  };

  // Don't render if installed or not visible
  if (isInstalled || isStandalone || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
      >
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Instale o SaveDin
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isIOS 
                  ? 'Adicione à tela inicial para acesso rápido'
                  : 'Instale para acesso offline e notificações'
                }
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="h-8 rounded-lg text-xs"
                >
                  {isIOS ? (
                    <>
                      <Share className="w-3.5 h-3.5 mr-1.5" />
                      Como instalar
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isInstalling ? 'Instalando...' : 'Instalar'}
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 rounded-lg text-xs text-muted-foreground"
                >
                  Agora não
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
