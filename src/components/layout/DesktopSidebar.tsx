import {
  LayoutDashboard, Building2, ArrowLeftRight, CreditCard, LineChart, Target, BarChart2, Flag,
  Tag, Hash, Calendar, TrendingUp, Settings, Moon, Sun, PanelLeftClose, PanelLeft, Crown
} from 'lucide-react';
import { SavedinTabType } from '@/types/savedin';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/hooks/useAuth';
import { EnvironmentSelector } from './EnvironmentSelector';
import { useTheme } from '@/hooks/useTheme';
import { useGradientColors } from '@/hooks/useGradientColors';
import { useSidebarState, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/hooks/useSidebarState';
import { useSubscription } from '@/hooks/useSubscription';
import { useEffect, useState, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoLight from '@/assets/logo-light.webp';
import logoDark from '@/assets/logo-dark.webp';
import logoIcon from '@/assets/logo-icon.webp';

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };

interface NavGroup {
  label: string;
  items: { id: SavedinTabType; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'accounts', label: 'Contas', icon: Building2 },
      { id: 'transactions', label: 'Transações', icon: ArrowLeftRight },
      { id: 'cards', label: 'Cartões', icon: CreditCard },
      { id: 'investments', label: 'Investimentos', icon: LineChart },
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
    label: 'Configurações',
    items: [
      { id: 'categories', label: 'Categorias', icon: Tag },
      { id: 'tags', label: 'Tags', icon: Hash },
      { id: 'performance', label: 'Meu Desempenho', icon: TrendingUp },
      { id: 'settings', label: 'Configurações', icon: Settings },
    ],
  },
];

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export function DesktopSidebar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { user } = useAuth();
  const { mode, setMode } = useTheme();
  const { contrastColor } = useGradientColors();
  const { isCollapsed, toggleCollapsed } = useSidebarState();
  const { isPremium, isTrialing } = useSubscription();
  const [profile, setProfile] = useState<Profile | null>(null);

  const activeTextColor = contrastColor === 'white' ? 'text-white' : 'text-black';

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user?.id]);

  const getUserInitial = () => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getUserName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  };

  const NavButton = memo(({ item, isActive, isCollapsed: collapsed }: { item: NavGroup['items'][0]; isActive: boolean; isCollapsed: boolean }) => {
    const Icon = item.icon;

    const buttonContent = (
      <button
        onClick={() => setActiveTab(item.id)}
        className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-200 ${collapsed ? 'justify-center px-2' : ''
          } ${isActive
            ? activeTextColor
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
      >
        {isActive && (
          <div className="absolute inset-0 rounded-xl gradient-bg" />
        )}
        <Icon className={`h-[18px] w-[18px] relative z-10 flex-shrink-0 ${isActive ? activeTextColor : ''}`} />
        {!collapsed && (
          <span className="text-sm font-medium relative z-10 flex-1 text-left whitespace-nowrap overflow-hidden">
            {item.label}
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  });

  return (
    <aside
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-md border-r border-border/10 z-40 transition-[width] duration-200 ease-in-out"
    >
      {/* Logo */}
      <div className={`flex items-center px-3 py-4 mb-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {isCollapsed ? (
          <img src={logoIcon} alt="SaveDin" className="h-7 w-7" onError={(e) => { e.currentTarget.src = '/logo-icon.webp'; }} />
        ) : (
          <>
            <img src={logoLight} alt="SaveDin" className="h-7 dark:hidden" onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }} />
            <img src={logoDark} alt="SaveDin" className="h-7 hidden dark:block" onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }} />
          </>
        )}
        {!isCollapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleCollapsed} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p>Recolher</p></TooltipContent>
          </Tooltip>
        )}
      </div>

      {isCollapsed && (
        <div className="px-2 mb-2 flex justify-center">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleCollapsed} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p>Expandir</p></TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Environment Selector */}
      <div className="px-2 mb-2">
        <EnvironmentSelector collapsed={isCollapsed} />
      </div>

      {/* Navigation grouped */}
      <ScrollArea className="flex-1 px-2">
        <nav className="py-1">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {!isCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 pt-4 pb-1">
                  {group.label}
                </p>
              )}
              {isCollapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t border-border/10" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavButton key={item.id} item={item} isActive={activeTab === item.id} isCollapsed={isCollapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Theme Toggle */}
      <div className={`px-2 mb-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} className="w-10 h-10 p-0 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/10">
                {mode === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p>{mode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</p></TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/10">
            <div className="flex items-center gap-3">
              {mode === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium text-foreground">{mode === 'dark' ? 'Escuro' : 'Claro'}</span>
            </div>
            <Switch checked={mode === 'dark'} onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')} />
          </div>
        )}
      </div>

      {/* User */}
      <div className={`pt-3 border-t border-border/10 mx-2 mb-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={() => setActiveTab('settings')} className="w-10 h-10 rounded-full flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className={`w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-sm font-semibold ${activeTextColor}`}>{getUserInitial()}</div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p>{getUserName()}</p>
              <p className="text-xs text-muted-foreground">{isPremium ? (isTrialing ? 'Trial' : 'Premium') : 'Gratuito'}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={() => setActiveTab('settings')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/30 transition-colors">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className={`w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-sm font-semibold ${activeTextColor}`}>{getUserInitial()}</div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">{getUserName()}</p>
              <p className="text-xs text-muted-foreground">{isPremium ? (isTrialing ? 'Trial' : 'Premium') : 'Gratuito'}</p>
            </div>
            {isPremium && <Crown className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--gradient-start)' }} />}
          </button>
        )}
      </div>
    </aside>
  );
}
