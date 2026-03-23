import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGradientColors } from '@/hooks/useGradientColors';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { color1, contrastColor } = useGradientColors();

  useEffect(() => {
    const handleOffline = () => {
      console.log('📴 App ficou offline');
      setIsOffline(true);
    };

    const handleOnline = () => {
      console.log('🌐 App voltou online');
      setIsOffline(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 pt-safe shadow-lg"
          style={{ 
            backgroundColor: color1,
            paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.625rem)`,
            paddingBottom: '0.625rem',
          }}
        >
          <div 
            className="flex items-center justify-center gap-2 text-sm font-medium px-4"
            style={{ color: contrastColor }}
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>Você está offline. Suas alterações serão sincronizadas quando voltar online.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
