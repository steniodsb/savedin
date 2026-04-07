import { useEffect, useState, useCallback, useRef } from 'react';
import { getContrastColor } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeSettings {
  mode: ThemeMode;
  accentColor: string;
  accentGradient: string;
  customColors: string[];
}

const ACCENT_COLORS = [
  { name: 'Cyan', hex: '#22D3EE', hsl: '187 94% 53%' },
  { name: 'Magenta', hex: '#D946EF', hsl: '292 91% 63%' },
  { name: 'Yellow', hex: '#FACC15', hsl: '48 96% 53%' },
  { name: 'Blue', hex: '#3b82f6', hsl: '217 91% 60%' },
  { name: 'Purple', hex: '#8b5cf6', hsl: '262 83% 58%' },
  { name: 'Green', hex: '#22c55e', hsl: '142 71% 45%' },
  { name: 'Orange', hex: '#f97316', hsl: '25 95% 53%' },
  { name: 'Pink', hex: '#ec4899', hsl: '330 81% 60%' },
];

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #909090 0%, #ffffff 50%, #909090 100%)';

// Detect system preference for initial theme
export function getSystemThemePreference(): EffectiveTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Get effective theme based on mode and system preference
function getEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') {
    return getSystemThemePreference();
  }
  return mode;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'system',
  accentColor: '#909090',
  accentGradient: DEFAULT_GRADIENT,
  customColors: [],
};

const LOCAL_STORAGE_KEY = 'savedin-theme';

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 56%';
  
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
}

function getAccentHsl(hex: string): string {
  const color = ACCENT_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  return color?.hsl || hexToHsl(hex);
}

// Extract colors from gradient for CSS variables
function extractColorsFromGradient(gradient: string): { start: string; middle: string | null; end: string } {
  const colorMatches = gradient.match(/#[0-9A-Fa-f]{6}/g);
  const hslMatches = gradient.match(/hsl\([^)]+\)/g);
  
  if (colorMatches && colorMatches.length >= 2) {
    const middle = colorMatches.length >= 3 ? colorMatches[Math.floor(colorMatches.length / 2)] : null;
    return { start: colorMatches[0], middle, end: colorMatches[colorMatches.length - 1] };
  }
  
  if (hslMatches && hslMatches.length >= 2) {
    const middle = hslMatches.length >= 3 ? hslMatches[Math.floor(hslMatches.length / 2)] : null;
    return { start: hslMatches[0], middle, end: hslMatches[hslMatches.length - 1] };
  }
  
  return { start: '#909090', middle: '#ffffff', end: '#909090' };
}

// Extract primary color from gradient for HSL variables
function extractPrimaryFromGradient(gradient: string): string {
  const colors = extractColorsFromGradient(gradient);
  return colors.start;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function getRgbLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastColorFromMultiple(colors: string[]): 'white' | 'black' {
  let totalLuminance = 0;
  let count = 0;
  for (const color of colors) {
    const rgb = hexToRgb(color);
    if (rgb) {
      totalLuminance += getRgbLuminance(rgb.r, rgb.g, rgb.b);
      count++;
    }
  }
  if (count === 0) return 'white';
  return (totalLuminance / count) > 0.4 ? 'black' : 'white';
}

function applyTheme(settings: ThemeSettings, skipTransition = false) {
  const root = document.documentElement;
  const effectiveTheme = getEffectiveTheme(settings.mode);

  // Temporarily disable CSS transitions to prevent flicker during theme load
  if (skipTransition) {
    root.setAttribute('data-no-transition', '');
    // Force reflow so the attribute is applied before changes
    void root.offsetHeight;
  }

  // Apply theme mode
  root.setAttribute('data-theme', effectiveTheme);
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Apply accent color for HSL variables
  const accentHsl = getAccentHsl(settings.accentColor);
  root.style.setProperty('--primary', accentHsl);
  root.style.setProperty('--ring', accentHsl);
  root.style.setProperty('--sidebar-primary', accentHsl);
  root.style.setProperty('--sidebar-ring', accentHsl);
  root.style.setProperty('--status-progress', accentHsl);
  
  // Apply accent gradient
  root.style.setProperty('--accent-gradient', settings.accentGradient);
  root.style.setProperty('--gradient-primary', settings.accentGradient);
  
  // Extract gradient colors for components that need them (like circular progress)
  const gradientColors = extractColorsFromGradient(settings.accentGradient);
  root.style.setProperty('--gradient-start', gradientColors.start);
  root.style.setProperty('--gradient-middle', gradientColors.middle || '');
  root.style.setProperty('--gradient-end', gradientColors.end);
  
  // Apply contrast-aware foreground color based on average luminance of all gradient colors
  const allGradientColors = [gradientColors.start, gradientColors.middle, gradientColors.end].filter(Boolean) as string[];
  const contrastColor = getContrastColorFromMultiple(allGradientColors);
  const foregroundHsl = contrastColor === 'white' ? '0 0% 100%' : '0 0% 5%';
  root.style.setProperty('--primary-foreground', foregroundHsl);
  root.style.setProperty('--on-primary', foregroundHsl);
  root.style.setProperty('--sidebar-primary-foreground', foregroundHsl);
  
  // Accent glow based on theme
  const glowOpacity = effectiveTheme === 'dark' ? '0.15' : '0.1';
  root.style.setProperty('--accent-glow', `${accentHsl} / ${glowOpacity}`);
  
  // Update shadows
  const shadowOpacity = effectiveTheme === 'dark' ? '0.2' : '0.12';
  root.style.setProperty('--shadow-glow', `0 0 30px hsl(${accentHsl} / ${shadowOpacity})`);
  root.style.setProperty('--shadow-accent', `0 4px 20px hsl(${accentHsl} / ${effectiveTheme === 'dark' ? '0.15' : '0.1'})`);

  // Re-enable transitions after theme is fully applied
  if (skipTransition) {
    // Use rAF to ensure paint happens before re-enabling transitions
    requestAnimationFrame(() => {
      root.removeAttribute('data-no-transition');
    });
  }
}

// Load from localStorage for initial/fallback
function loadLocalSettings(): ThemeSettings {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

// Save to localStorage as fallback
function saveLocalSettings(settings: ThemeSettings) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: settings }));
}

export function useTheme() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const stored = loadLocalSettings();
    return stored;
  });
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Load settings from database when user is available
  useEffect(() => {
    async function loadFromDatabase() {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // If no user, use localStorage settings (already applied by initializeTheme)
      if (!user?.id) {
        console.log('[Theme] No user, using localStorage settings');
        setIsLoading(false);
        return;
      }

      // Skip if we already loaded for this user
      if (lastUserId.current === user.id && initialLoadDone.current) {
        return;
      }

      console.log('[Theme] Loading theme from database for user:', user.id);
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_mode, accent_gradient')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const dbSettings: ThemeSettings = {
            mode: (data.theme_mode as ThemeMode) || 'system',
            accentGradient: data.accent_gradient || DEFAULT_GRADIENT,
            accentColor: extractPrimaryFromGradient(data.accent_gradient || DEFAULT_GRADIENT),
            customColors: settings.customColors, // Keep local custom colors
          };
          
          console.log('[Theme] Loaded from database:', {
            mode: dbSettings.mode,
            gradient: dbSettings.accentGradient?.substring(0, 50) + '...',
          });
          
          setSettings(dbSettings);
          applyTheme(dbSettings, true); // skipTransition to prevent flicker on login
          saveLocalSettings(dbSettings); // Sync to localStorage
          lastUserId.current = user.id;
          initialLoadDone.current = true;
        }
      } catch (error) {
        console.error('[Theme] Error loading from database:', error);
        // Fall back to localStorage (already applied by initializeTheme)
      } finally {
        setIsLoading(false);
      }
    }

    loadFromDatabase();
  }, [user?.id, authLoading]);

  // Theme is already applied on initial load by initializeTheme() in App.tsx
  // No need for a redundant useEffect here

  // Listen for theme changes from other components
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<ThemeSettings>) => {
      setSettings(e.detail);
      applyTheme(e.detail);
    };
    
    window.addEventListener('theme-changed', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener);
    };
  }, []);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (settings.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      applyTheme(settings);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [settings]);

  // Save to database (debounced)
  const saveToDatabase = useCallback(async (newSettings: ThemeSettings) => {
    if (!user?.id) {
      console.log('[Theme] No user, skipping database save');
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce database saves
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[Theme] Saving to database:', {
          theme_mode: newSettings.mode,
          accent_gradient: newSettings.accentGradient?.substring(0, 50) + '...',
        });
        
        const { error, data } = await supabase
          .from('profiles')
          .update({
            theme_mode: newSettings.mode,
            accent_gradient: newSettings.accentGradient,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('[Theme] Database save error:', error);
          throw error;
        }
        
        console.log('[Theme] Saved successfully to database');
      } catch (error) {
        console.error('[Theme] Error saving theme to database:', error);
      }
    }, 300); // 300ms debounce for faster feedback
  }, [user?.id]);

  const updateSettings = useCallback((newSettings: ThemeSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings);
    saveLocalSettings(newSettings);
    saveToDatabase(newSettings);
  }, [saveToDatabase]);

  const setMode = useCallback((mode: ThemeMode) => {
    const newSettings = { ...settings, mode };
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  const setAccentColor = useCallback((accentColor: string) => {
    const newSettings = { ...settings, accentColor };
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  const setAccentGradient = useCallback((accentGradient: string) => {
    // Also update accent color from gradient's first color
    const primaryHex = extractPrimaryFromGradient(accentGradient);
    const newSettings = { ...settings, accentGradient, accentColor: primaryHex };
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  const addCustomColor = useCallback((hex: string) => {
    if (!settings.customColors.includes(hex)) {
      const newCustomColors = [...settings.customColors, hex].slice(-5);
      const newSettings = { ...settings, customColors: newCustomColors, accentColor: hex };
      updateSettings(newSettings);
    } else {
      setAccentColor(hex);
    }
  }, [settings, updateSettings, setAccentColor]);

  const removeCustomColor = useCallback((hex: string) => {
    const newCustomColors = settings.customColors.filter(c => c !== hex);
    const newSettings = { 
      ...settings, 
      customColors: newCustomColors,
      accentColor: settings.accentColor === hex ? '#22D3EE' : settings.accentColor
    };
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  // Get the effective (resolved) theme
  const effectiveTheme = getEffectiveTheme(settings.mode);

  return {
    mode: settings.mode,
    effectiveTheme,
    accentColor: settings.accentColor,
    accentGradient: settings.accentGradient,
    customColors: settings.customColors,
    isLoading,
    setMode,
    setAccentColor,
    setAccentGradient,
    addCustomColor,
    removeCustomColor,
    accentColors: ACCENT_COLORS,
  };
}

export function initializeTheme() {
  const settings = loadLocalSettings();
  applyTheme(settings, true); // skipTransition to prevent flicker on page load
}
