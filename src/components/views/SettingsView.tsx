import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Moon, Sun, Bell, Shield, HelpCircle, Info, LogOut, Sparkles, Save, RotateCcw, Palette, Layers, Monitor, Calendar, Clock, Download, UserX, AlertTriangle, Crown, ChevronRight, Eraser } from 'lucide-react';
import { useTheme, ThemeMode } from '@/hooks/useTheme';
import { useDisplayPreferences, DateFormat, TimeFormat, FirstDayOfWeek } from '@/hooks/useDisplayPreferences';
import { useAuth } from '@/hooks/useAuth';
import { savedinClient } from '@/integrations/supabase/savedinClient';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileEditor } from '@/components/settings/ProfileEditor';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { Button } from '@/components/ui/button';
import { GradientPicker } from '@/components/ui/GradientPicker';
import { getContrastColor } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualEffects } from '@/hooks/useVisualEffects';
import { useSubscription } from '@/hooks/useSubscription';
import { useGradientColors } from '@/hooks/useGradientColors';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { CategoriesManager } from '@/components/finance/CategoriesManager';
import { TagsManager } from '@/components/finance/TagsManager';
import { TelegramSettings } from '@/components/settings/TelegramSettings';
import { EnvironmentSettings } from '@/components/settings/EnvironmentSettings';


export function SettingsView() {
  const { mode, accentColor, accentGradient, effectiveTheme, setMode, setAccentColor, setAccentGradient } = useTheme();
  const { preferences: displayPreferences, updatePreference: updateDisplayPreference } = useDisplayPreferences();
  const { signOut, user } = useAuth();
  const { isPremium, isTrialing, plan } = useSubscription();
  const { color1 } = useGradientColors();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [subscriptionSettingsOpen, setSubscriptionSettingsOpen] = useState(false);
  const [gradientPickerOpen, setGradientPickerOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearAccountDialogOpen, setClearAccountDialogOpen] = useState(false);
  const [clearAccountConfirmText, setClearAccountConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const { visualEffectsEnabled, setVisualEffectsEnabled, isLoading: isVisualEffectsLoading } = useVisualEffects();



  // Pending settings state (local changes before saving)
  const [pendingMode, setPendingMode] = useState<ThemeMode>(mode);
  const [pendingAccentColor, setPendingAccentColor] = useState<string>(accentColor);
  const [pendingAccentGradient, setPendingAccentGradient] = useState<string>(accentGradient);

  // Sync pending state when actual values change (e.g., on mount)
  useEffect(() => {
    setPendingMode(mode);
    setPendingAccentColor(accentColor);
    setPendingAccentGradient(accentGradient);
  }, [mode, accentColor, accentGradient]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      pendingMode !== mode ||
      pendingAccentColor !== accentColor ||
      pendingAccentGradient !== accentGradient
    );
  }, [pendingMode, pendingAccentColor, pendingAccentGradient, mode, accentColor, accentGradient]);

  // Apply pending theme visually (preview) without saving
  useEffect(() => {
    const root = document.documentElement;
    
    // Get effective theme based on pending mode
    const getEffectiveTheme = (m: ThemeMode) => {
      if (m === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return m;
    };
    
    const effectivePendingTheme = getEffectiveTheme(pendingMode);
    
    // Apply pending mode for preview
    root.setAttribute('data-theme', effectivePendingTheme);
    if (effectivePendingTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply pending accent color for preview
    const hexToHsl = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '187 94% 53%';
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const accentHsl = hexToHsl(pendingAccentColor);
    root.style.setProperty('--primary', accentHsl);
    root.style.setProperty('--ring', accentHsl);
    
    // Apply pending gradient for preview
    root.style.setProperty('--accent-gradient', pendingAccentGradient);
    root.style.setProperty('--gradient-primary', pendingAccentGradient);
    
    const contrastColor = getContrastColor(pendingAccentColor);
    const foregroundHsl = contrastColor === 'white' ? '0 0% 100%' : '0 0% 5%';
    root.style.setProperty('--primary-foreground', foregroundHsl);
  }, [pendingMode, pendingAccentColor, pendingAccentGradient]);

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
    navigate('/auth');
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setPendingMode(newMode);
  };

  const handleSaveSettings = () => {
    // Save all changes together
    if (pendingMode !== mode) {
      setMode(pendingMode);
    }
    if (pendingAccentColor !== accentColor) {
      setAccentColor(pendingAccentColor);
    }
    if (pendingAccentGradient !== accentGradient) {
      setAccentGradient(pendingAccentGradient);
    }

    toast.success('Configurações salvas com sucesso');
  };

  const handleCancelChanges = () => {
    // Revert to original values
    setPendingMode(mode);
    setPendingAccentColor(accentColor);
    setPendingAccentGradient(accentGradient);
    toast.info('Alterações descartadas');
  };

  const handleGradientChange = (gradient: string) => {
    setPendingAccentGradient(gradient);
    // Extract primary color from gradient
    const colorMatches = gradient.match(/#[0-9A-Fa-f]{6}/g);
    if (colorMatches?.[0]) {
      setPendingAccentColor(colorMatches[0]);
    }
  };

  const handleClearData = async () => {
    try {
      // Clear localStorage except for theme preferences
      const themeMode = localStorage.getItem('taskflow-theme');
      const themeColor = localStorage.getItem('taskflow-accent-color');
      const themeGradient = localStorage.getItem('taskflow-accent-gradient');
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore theme preferences
      if (themeMode) localStorage.setItem('taskflow-theme', themeMode);
      if (themeColor) localStorage.setItem('taskflow-accent-color', themeColor);
      if (themeGradient) localStorage.setItem('taskflow-accent-gradient', themeGradient);
      
      toast.success('Dados locais limpos com sucesso');
      setClearDataDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao limpar dados');
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;
    
    try {
      toast.info('Preparando exportação de dados...');
      
      // Fetch all user data
      const [
        tasksRes,
        habitsRes,
        goalsRes,
        remindersRes,
        categoriesRes,
        routinesRes,
        habitLogsRes,
        profileRes
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('reminders').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('routines').select('*').eq('user_id', user.id),
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profileRes.data,
        tasks: tasksRes.data || [],
        habits: habitsRes.data || [],
        habitLogs: habitLogsRes.data || [],
        goals: goalsRes.data || [],
        reminders: remindersRes.data || [],
        categories: categoriesRes.data || [],
        routines: routinesRes.data || []
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `savedin-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const [clearingStep, setClearingStep] = useState('');

  const handleClearAccount = async () => {
    if (clearAccountConfirmText !== 'LIMPAR') {
      toast.error('Digite LIMPAR para confirmar');
      return;
    }

    setIsClearing(true);
    const toastId = toast.loading('Iniciando limpeza dos dados...', { duration: Infinity });
    try {
      if (user?.id) {
        // Step 1
        setClearingStep('Removendo transações...');
        toast.loading('Removendo transações...', { id: toastId });
        await savedinClient.from('transactions').delete().eq('user_id', user.id);

        // Step 2
        setClearingStep('Removendo faturas e orçamentos...');
        toast.loading('Removendo faturas e orçamentos...', { id: toastId });
        await Promise.all([
          savedinClient.from('invoices').delete().eq('user_id', user.id),
          savedinClient.from('budgets').delete().eq('user_id', user.id),
        ]);

        // Step 3
        setClearingStep('Removendo cartões, contas e objetivos...');
        toast.loading('Removendo cartões, contas e objetivos...', { id: toastId });
        await Promise.all([
          savedinClient.from('credit_cards').delete().eq('user_id', user.id),
          savedinClient.from('accounts').delete().eq('user_id', user.id),
          savedinClient.from('goals').delete().eq('user_id', user.id),
        ]);

        // Step 4
        setClearingStep('Removendo categorias e tags...');
        toast.loading('Removendo categorias e tags...', { id: toastId });
        await Promise.all([
          savedinClient.from('categories').delete().eq('user_id', user.id).eq('is_default', false),
          savedinClient.from('tags').delete().eq('user_id', user.id),
        ]);
      }

      toast.success('Todos os dados da conta foram apagados com sucesso!', { id: toastId });
      setClearAccountDialogOpen(false);
      setClearAccountConfirmText('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Clear account error:', error);
      toast.error('Erro ao limpar dados da conta. Tente novamente.', { id: toastId });
    } finally {
      setIsClearing(false);
      setClearingStep('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all user data
      if (user?.id) {
        await savedinClient.from('transactions').delete().eq('user_id', user.id);
        await Promise.all([
          savedinClient.from('invoices').delete().eq('user_id', user.id),
          savedinClient.from('budgets').delete().eq('user_id', user.id),
        ]);
        await Promise.all([
          savedinClient.from('credit_cards').delete().eq('user_id', user.id),
          savedinClient.from('accounts').delete().eq('user_id', user.id),
          savedinClient.from('goals').delete().eq('user_id', user.id),
          savedinClient.from('tags').delete().eq('user_id', user.id),
          savedinClient.from('categories').delete().eq('user_id', user.id).eq('is_default', false),
          savedinClient.from('environments').delete().eq('user_id', user.id),
        ]);
        await Promise.all([
          supabase.from('notifications').delete().eq('user_id', user.id),
          supabase.from('push_subscriptions').delete().eq('user_id', user.id),
        ]);
      }

      // Sign out and clear local data
      localStorage.clear();
      sessionStorage.clear();
      
      await signOut();
      
      toast.success('Conta excluída com sucesso');
      navigate('/auth');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Erro ao excluir conta. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
      setDeleteAccountDialogOpen(false);
      setDeleteConfirmText('');
    }
  };

  const handleResetOnboarding = async () => {
    if (!user?.id) return;
    
    try {
      // Reset onboarding flag in database
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('user_id', user.id);
      
      // Navigate to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      toast.error('Erro ao reiniciar tour');
    }
  };

  const menuItems = [
    {
      section: 'Notificações',
      items: [
        { icon: Bell, label: 'Lembretes', description: 'Configurar notificações', action: () => setNotificationSettingsOpen(true) },
      ],
    },
    {
      section: 'Sobre',
      items: [
        { icon: Sparkles, label: 'Ver tour novamente', description: 'Rever introdução ao app', action: handleResetOnboarding },
        { icon: HelpCircle, label: 'Ajuda', description: 'Central de suporte' },
        { icon: Info, label: 'Sobre o App', description: 'Versão 1.0.0' },
        { icon: Shield, label: 'Privacidade', description: 'Política de privacidade' },
      ],
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen pb-40 lg:pb-24 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky sticky-safe-top z-10 py-5 flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 mt-4"
      >
        {/* Profile Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Perfil
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-border/10">
            <ProfileEditor />
          </div>
        </motion.section>

        {/* Subscription Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Assinatura
          </h2>
          <button
            onClick={() => setSubscriptionSettingsOpen(true)}
            className="w-full bg-card/50 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-border/10 transition-colors hover:bg-card/60"
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color1}, ${color1}88)` }}
              >
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">
                  {isPremium 
                    ? (isTrialing ? 'Período de Teste' : plan?.name || 'Plano Premium')
                    : 'Sem assinatura ativa'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPremium 
                    ? 'Toque para ver detalhes e gerenciar'
                    : 'Assine para desbloquear recursos'
                  }
                </p>
              </div>
              {isPremium && (
                <Badge className={cn(
                  'gap-1',
                  isTrialing 
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                )}>
                  {isTrialing ? 'Trial' : 'Ativo'}
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
        </motion.section>


        {/* Appearance Section - 3 Cards Grid */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Aparência
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Theme Card */}
            <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {pendingMode === 'dark' || (pendingMode === 'system' && effectiveTheme === 'dark') ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-primary" />
                  )}
                  <h3 className="font-medium text-foreground">Tema</h3>
                </div>
                <Switch
                  checked={pendingMode === 'dark' || (pendingMode === 'system' && effectiveTheme === 'dark')}
                  onCheckedChange={(checked) => handleModeChange(checked ? 'dark' : 'light')}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Alterne entre modo claro e escuro
              </p>
            </div>

            {/* Accent Color Card */}
            <button
              onClick={() => setGradientPickerOpen(true)}
              className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4 text-left hover:bg-card/60 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-foreground">Cor de Destaque</h3>
                </div>
                <div className="relative">
                  {/* Glow effect on hover */}
                  <div 
                    className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-300 scale-125"
                    style={{ background: pendingAccentGradient }}
                  />
                  {/* Main gradient ball */}
                  <div 
                    className="relative w-10 h-10 rounded-full shadow-lg border-2 border-white/50 dark:border-white/20 group-hover:scale-110 transition-all duration-300 cursor-pointer"
                    style={{ background: pendingAccentGradient }}
                  />
                  {/* Edit badge - always visible */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Toque para editar o gradiente
              </p>
            </button>

            {/* Visual Effects Card */}
            <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-foreground">Efeitos Visuais</h3>
                </div>
                <Switch
                  checked={visualEffectsEnabled}
                  onCheckedChange={setVisualEffectsEnabled}
                  disabled={isVisualEffectsLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Glassmorphism, brilhos e transparências
              </p>
            </div>
          </div>
        </motion.section>

        {/* Display Preferences Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Preferências de Exibição
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 divide-y divide-border/10">
            {/* First Day of Week */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Primeiro dia da semana</p>
                  <p className="text-sm text-muted-foreground">Defina como seu calendário começa</p>
                </div>
              </div>
              <Select
                value={displayPreferences.firstDayOfWeek.toString()}
                onValueChange={(value) => updateDisplayPreference('firstDayOfWeek', parseInt(value) as FirstDayOfWeek)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Domingo</SelectItem>
                  <SelectItem value="1">Segunda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Format */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Formato de data</p>
                  <p className="text-sm text-muted-foreground">Como as datas são exibidas</p>
                </div>
              </div>
              <Select
                value={displayPreferences.dateFormat}
                onValueChange={(value) => updateDisplayPreference('dateFormat', value as DateFormat)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Format */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Formato de hora</p>
                  <p className="text-sm text-muted-foreground">Como as horas são exibidas</p>
                </div>
              </div>
              <Select
                value={displayPreferences.timeFormat}
                onValueChange={(value) => updateDisplayPreference('timeFormat', value as TimeFormat)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="12h">12h (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.section>

        {menuItems.map((section) => (
          <motion.section key={section.section} variants={item}>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {section.section}
            </h2>
            <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 divide-y divide-border/10">
              {section.items.map((menuItem) => {
                const Icon = menuItem.icon;
                return (
                  <button
                    key={menuItem.label}
                    onClick={menuItem.action}
                    className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">
                        {menuItem.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {menuItem.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Environments Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Ambientes
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
            <EnvironmentSettings />
          </div>
        </motion.section>

        {/* Telegram Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Telegram Bot
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
            <TelegramSettings />
          </div>
        </motion.section>

        {/* Categories Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Categorias
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
            <CategoriesManager />
          </div>
        </motion.section>

        {/* Tags Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Tags
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 p-4">
            <TagsManager />
          </div>
        </motion.section>

        {/* Account Section */}
        <motion.section variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Conta
          </h2>
          <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-lg border border-border/10 divide-y divide-border/10">
            {/* Export Data Button */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 first:rounded-t-2xl"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Exportar meus dados</p>
                <p className="text-sm text-muted-foreground">Baixar todos os seus dados em JSON</p>
              </div>
            </button>

            {/* Clear Data Button */}
            <button
              onClick={() => setClearDataDialogOpen(true)}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
                <Trash2 className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Limpar Dados Locais</p>
                <p className="text-sm text-muted-foreground">Apagar dados armazenados no navegador</p>
              </div>
            </button>

            {/* Clear Account Data Button */}
            <button
              onClick={() => setClearAccountDialogOpen(true)}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Eraser className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Limpar Conta</p>
                <p className="text-sm text-muted-foreground">Apagar todas as transações, categorias, contas e cartões</p>
              </div>
            </button>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Sair</p>
                <p className="text-sm text-muted-foreground">Encerrar sessão</p>
              </div>
            </button>

            {/* Delete Account Button */}
            <button
              onClick={() => setDeleteAccountDialogOpen(true)}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 last:rounded-b-2xl"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-destructive">Excluir conta</p>
                <p className="text-sm text-muted-foreground">Remover permanentemente sua conta e dados</p>
              </div>
            </button>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div variants={item} className="text-center pt-4 pb-8">
          <p className="text-sm text-muted-foreground">SaveDin v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">
            Controle suas finanças, alcance seus objetivos ✨
          </p>
        </motion.div>
      </motion.div>

      {/* Notification Settings Modal */}
      <NotificationSettings 
        open={notificationSettingsOpen} 
        onOpenChange={setNotificationSettingsOpen} 
      />

      {/* Subscription Settings Modal */}
      <SubscriptionSettings
        open={subscriptionSettingsOpen}
        onOpenChange={setSubscriptionSettingsOpen}
      />

      {/* Fixed Save/Cancel Bar - Only visible when there are changes */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-0 right-0 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-md px-4"
          >
            {/* Unsaved changes indicator */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-t-xl px-4 py-2 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Alterações não salvas
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="bg-card border border-border rounded-b-xl border-t-0 p-4 shadow-lg flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelChanges}
                className="flex-1 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSettings}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Picker Modal */}
      <GradientPicker
        value={pendingAccentGradient}
        onChange={handleGradientChange}
        open={gradientPickerOpen}
        onOpenChange={setGradientPickerOpen}
      />

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os dados locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar todos os dados armazenados localmente no seu navegador. 
              Seus dados salvos na nuvem não serão afetados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar Dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Account Confirmation Dialog */}
      <AlertDialog open={clearAccountDialogOpen} onOpenChange={(open) => { if (!isClearing) setClearAccountDialogOpen(open); }}>
        <AlertDialogContent>
          {isClearing && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium text-foreground animate-pulse">{clearingStep || 'Processando...'}</p>
              <p className="text-xs text-muted-foreground">Não feche esta janela</p>
            </div>
          )}
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Eraser className="h-6 w-6 text-orange-500" />
              </div>
              <AlertDialogTitle>Limpar todos os dados da conta?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong className="text-foreground">Esta ação é irreversível.</strong> Todos os seus dados serão permanentemente excluídos, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todas as suas transações</li>
                <li>Todos os seus cartões e faturas</li>
                <li>Todas as suas contas bancárias</li>
                <li>Seus orçamentos e objetivos financeiros</li>
                <li>Suas categorias e tags personalizadas</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Sua conta, perfil e assinatura serão mantidos.
              </p>
              <p className="pt-2">
                Para confirmar, digite <strong className="text-foreground">LIMPAR</strong> abaixo:
              </p>
              <Input
                value={clearAccountConfirmText}
                onChange={(e) => setClearAccountConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite LIMPAR para confirmar"
                className="mt-2"
                disabled={isClearing}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearAccountConfirmText('')} disabled={isClearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAccount}
              disabled={clearAccountConfirmText !== 'LIMPAR' || isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? 'Limpando...' : 'Limpar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-destructive">Excluir conta permanentemente?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong className="text-foreground">Esta ação é irreversível.</strong> Todos os seus dados serão permanentemente excluídos, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todas as suas transações e faturas</li>
                <li>Todos os seus cartões e contas</li>
                <li>Seus orçamentos e objetivos financeiros</li>
                <li>Suas categorias e tags personalizadas</li>
                <li>Suas configurações e preferências</li>
              </ul>
              <p className="pt-2">
                Para confirmar, digite <strong className="text-foreground">EXCLUIR</strong> abaixo:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite EXCLUIR para confirmar"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir minha conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
