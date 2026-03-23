import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopSidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/components/layout/DesktopSidebar';

import { DashboardView } from '@/components/views/DashboardView';
import { TransactionsView } from '@/components/views/TransactionsView';
import { AccountsView } from '@/components/views/AccountsView';
import { CardsView } from '@/components/views/CardsView';
import { FinancialGoalsView } from '@/components/views/FinancialGoalsView';
import { ReportsView } from '@/components/views/ReportsView';
import { PlanningView } from '@/components/views/PlanningView';
import { CategoriesView } from '@/components/views/CategoriesView';
import { TagsView } from '@/components/views/TagsView';
import { CalendarView } from '@/components/views/CalendarView';
import { PerformanceView } from '@/components/views/PerformanceView';
import { SettingsView } from '@/components/views/SettingsView';

import { InstallBanner } from '@/components/pwa/InstallBanner';
import { GlowBackground } from '@/components/ui/GlowBackground';
import { useSidebarState } from '@/hooks/useSidebarState';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const DESKTOP_BREAKPOINT = 1024;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

const Index = () => {
  const { activeTab, isLoading } = useStore();
  const { isCollapsed } = useSidebarState();
  const isDesktop = useIsDesktop();
  const [forceShow, setForceShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (isLoading) { setForceShow(true); }
    }, 10000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [isLoading]);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'accounts': return <AccountsView />;
      case 'transactions': return <TransactionsView />;
      case 'cards': return <CardsView />;
      case 'planning': return <PlanningView />;
      case 'reports': return <ReportsView />;
      case 'goals': return <FinancialGoalsView />;
      case 'categories': return <CategoriesView />;
      case 'tags': return <TagsView />;
      case 'calendar': return <CalendarView />;
      case 'performance': return <PerformanceView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  if (isLoading && !forceShow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <GlowBackground intensity="medium" className="bg-background">
      <div className="min-h-screen overflow-x-hidden">
        <DesktopSidebar />
        <motion.main
          className="min-h-screen overflow-y-auto overflow-x-hidden pt-safe lg:pt-0"
          initial={false}
          animate={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <div className="max-w-3xl lg:max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pb-4 lg:py-6 safe-bottom">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.main>
        <div className="lg:hidden"><BottomNav /></div>
        <InstallBanner />
      </div>
    </GlowBackground>
  );
};

export default Index;
