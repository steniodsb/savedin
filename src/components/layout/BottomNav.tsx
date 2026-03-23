import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Plus, CreditCard, MoreHorizontal,
  Moon, Sun, Building2, Target, BarChart2, Flag, Tag, Hash, Calendar,
  TrendingUp, Settings, Crown, LogOut
} from 'lucide-react';
import { SavedinTabType } from '@/types/savedin';
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from '@/hooks/useTheme';
import { useGradientColors } from '@/hooks/useGradientColors';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoLight from '@/assets/logo-light.webp';
import logoDark from '@/assets/logo-dark.webp';

const mainNavItems: { id: SavedinTabType | 'add'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações', icon: ArrowLeftRight },
  { id: 'add', label: 'Adicionar', icon: Plus },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
];

interface DrawerGroup {
  label: string;
  items: { id: SavedinTabType; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const drawerGroups: DrawerGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'accounts', label: 'Contas', icon: Building2 },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { id: 'planning', label: 'Planejamento', icon: Target },
      { id: 'reports', label: 'Relatórios', icon: BarChart2 },
      { id: 'goals', label: 'Objetivos', icon: Flag },
      { id: 'calendar', label: 'Calendário', icon: Calendar },
    ],
  },
  {
    label: 'Mais',
    items: [
      { id: 'categories', label: 'Categorias', icon: Tag },
      { id: 'tags', label: 'Tags', icon: Hash },
      { id: 'performance', label: 'Meu Desempenho', icon: TrendingUp },
      { id: 'settings', label: 'Configurações', icon: Settings },
    ],
  },
];

const allDrawerItemIds = drawerGroups.flatMap(g => g.items.map(i => i.id));

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export function BottomNav() {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useUIStore();
  const { mode, setMode } = useTheme();
  const { contrastColor, color1 } = useGradientColors();
  const { isPremium, isTrialing } = useSubscription();
  const { signOut, user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('full_name, avatar_url').eq('user_id', user.id).single().then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user?.id]);

  const getUserInitial = () => profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  const getUserName = () => profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const getSubscriptionLabel = () => isPremium ? (isTrialing ? 'Trial' : 'Premium') : 'Gratuito';

  const handleLogout = async () => { setIsSheetOpen(false); await signOut(); navigate('/auth'); };

  const isMoreActive = allDrawerItemIds.includes(activeTab as any);
  const activeTextColor = contrastColor === 'white' ? 'text-white' : 'text-black';

  const handleNavItemClick = (id: SavedinTabType) => { setActiveTab(id); setIsSheetOpen(false); };

  const handleAddClick = () => {
    setActiveTab('transactions');
    window.dispatchEvent(new CustomEvent('savedin:add-transaction'));
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isAdd = item.id === 'add';
            const isActive = !isAdd && activeTab === item.id;

            if (isAdd) {
              return (
                <button key="add" onClick={handleAddClick} className="relative flex flex-col items-center justify-center gap-1 py-1 px-3">
                  <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-lg -mt-4">
                    <Plus className={`h-6 w-6 ${activeTextColor}`} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as SavedinTabType)}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {isActive && <div className="absolute inset-0 rounded-xl gradient-bg" />}
                <Icon className={cn("h-5 w-5 relative z-10 transition-transform", isActive && "scale-110", isActive && activeTextColor)} />
                <span className={cn("text-[11px] font-medium relative z-10", isActive && activeTextColor)}>{item.label}</span>
              </button>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setIsSheetOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 ${isMoreActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {isMoreActive && <div className="absolute inset-0 rounded-xl gradient-bg" />}
            <MoreHorizontal className={cn("h-5 w-5 relative z-10 transition-transform", isMoreActive && "scale-110", isMoreActive && activeTextColor)} />
            <span className={cn("text-[11px] font-medium relative z-10", isMoreActive && activeTextColor)}>Menu</span>
          </button>
        </div>
      </nav>

      {/* Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <SheetHeader className="p-5 border-b border-border">
              <div className="flex items-center justify-center">
                <img src={logoLight} alt="SaveDin" className="h-7 dark:hidden" onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }} />
                <img src={logoDark} alt="SaveDin" className="h-7 hidden dark:block" onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }} />
              </div>
            </SheetHeader>

            {/* Profile */}
            <button
              onClick={() => { setIsSheetOpen(false); navigate('/subscription'); }}
              className="mx-4 mt-4 flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt={getUserName()} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">{getUserInitial()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground text-sm">{getUserName()}</p>
                <p className="text-xs text-muted-foreground">{getSubscriptionLabel()}</p>
              </div>
              {isPremium && <Crown className="h-5 w-5" style={{ color: color1 }} />}
            </button>

            {/* Grouped Navigation */}
            <ScrollArea className="flex-1 p-4">
              {drawerGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 mb-1">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavItemClick(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  {mode === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">{mode === 'dark' ? 'Escuro' : 'Claro'}</span>
                </div>
                <Switch checked={mode === 'dark'} onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')} />
              </div>
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">Sair</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
