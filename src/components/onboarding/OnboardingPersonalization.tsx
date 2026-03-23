import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Moon, Sun, Layers, Check, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { HexColorPicker } from 'react-colorful';
import { useTheme } from '@/hooks/useTheme';
import { setVisualEffectsEnabled, getVisualEffectsEnabled } from '@/hooks/useVisualEffects';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingPersonalizationProps {
  onSave: (settings: { gradient: string; effect: 'glass' | 'dark' | 'light' }) => void;
  onBack: () => void;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #909090 0%, #ffffff 50%, #909090 100%)';

const PRESET_COLORS = [
  { name: 'Ocean', colors: ['#06B6D4', '#3B82F6'] },
  { name: 'Sunset', colors: ['#F97316', '#EC4899'] },
  { name: 'Forest', colors: ['#22C55E', '#14B8A6'] },
  { name: 'Royal', colors: ['#8B5CF6', '#EC4899'] },
  { name: 'Fire', colors: ['#EF4444', '#F97316'] },
  { name: 'Lavender', colors: ['#A855F7', '#6366F1'] },
];

type ThemeType = 'dark' | 'light';

export function OnboardingPersonalization({ onSave, onBack }: OnboardingPersonalizationProps) {
  const { setAccentGradient, setMode, accentGradient } = useTheme();
  
  // Theme: dark or light
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(() => {
    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? 'dark' : 'light';
  });
  
  // Glass effect: separate toggle
  const [glassEnabled, setGlassEnabled] = useState(() => getVisualEffectsEnabled());
  
  const [numColors, setNumColors] = useState<1 | 2 | 3>(() => {
    const colors = accentGradient?.match(/#[0-9A-Fa-f]{6}/g) || [];
    if (colors.length >= 3) return 3;
    if (colors.length === 2) return 2;
    return 1;
  });
  
  const [customColor1, setCustomColor1] = useState('#909090');
  const [customColor2, setCustomColor2] = useState('#ffffff');
  const [customColor3, setCustomColor3] = useState('#909090');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number>(0);
  const [useDefault, setUseDefault] = useState(true);

  // Initialize colors from current gradient
  useEffect(() => {
    if (accentGradient) {
      const colors = accentGradient.match(/#[0-9A-Fa-f]{6}/g) || [];
      if (colors.length >= 1) setCustomColor1(colors[0]);
      if (colors.length >= 2) setCustomColor2(colors[colors.length >= 3 ? 1 : 1]);
      if (colors.length >= 3) setCustomColor3(colors[2]);
      
      setUseDefault(accentGradient === DEFAULT_GRADIENT);
    }
  }, []);

  // Build gradient from current colors
  const buildGradient = (colors: number) => {
    if (colors === 1) {
      return customColor1; // Solid color
    }
    if (colors === 2) {
      return `linear-gradient(135deg, ${customColor1} 0%, ${customColor3} 100%)`;
    }
    return `linear-gradient(135deg, ${customColor1} 0%, ${customColor2} 50%, ${customColor3} 100%)`;
  };

  // Apply gradient in real-time
  const applyGradient = (gradient: string) => {
    setAccentGradient(gradient);
  };

  // Apply theme in real-time
  const applyTheme = (theme: ThemeType) => {
    setSelectedTheme(theme);
    setMode(theme);
  };

  // Apply glass effect in real-time
  const applyGlassEffect = (enabled: boolean) => {
    setGlassEnabled(enabled);
    setVisualEffectsEnabled(enabled);
  };

  const handlePresetSelect = (colors: string[]) => {
    setUseDefault(false);
    setCustomColor1(colors[0]);
    setCustomColor3(colors[1]);
    setNumColors(2);
    const gradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
    applyGradient(gradient);
  };

  const handleUseDefault = () => {
    setUseDefault(true);
    setCustomColor1('#909090');
    setCustomColor2('#ffffff');
    setCustomColor3('#909090');
    setNumColors(3);
    applyGradient(DEFAULT_GRADIENT);
  };

  const handleNumColorsChange = (num: 1 | 2 | 3) => {
    setNumColors(num);
    setUseDefault(false);
    const gradient = buildGradient(num);
    applyGradient(gradient);
  };

  const handleColorChange = (color: string) => {
    setUseDefault(false);
    
    if (editingColorIndex === 0) {
      setCustomColor1(color);
    } else if (editingColorIndex === 1) {
      setCustomColor2(color);
    } else {
      setCustomColor3(color);
    }
  };

  // Apply gradient when colors change
  useEffect(() => {
    if (!useDefault) {
      const gradient = buildGradient(numColors);
      applyGradient(gradient);
    }
  }, [customColor1, customColor2, customColor3, numColors, useDefault]);

  const handleSave = () => {
    const gradient = useDefault ? DEFAULT_GRADIENT : buildGradient(numColors);
    // Determine effect based on theme + glass
    const effect = glassEnabled ? 'glass' : selectedTheme;
    onSave({
      gradient,
      effect,
    });
  };

  const openColorPicker = (index: number) => {
    setEditingColorIndex(index);
    setShowColorPicker(true);
  };

  const getCurrentGradient = () => {
    return useDefault ? DEFAULT_GRADIENT : buildGradient(numColors);
  };

  const isDefaultSelected = useDefault;

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <Palette className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Personalize seu app ✨
          </h2>
          <p className="text-muted-foreground text-sm">
            Escolha uma cor e estilo visual
          </p>
        </motion.div>

        {/* Card Container */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/10 bg-card/50 backdrop-blur-md p-4 space-y-5"
        >
          {/* Color Selection */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Cor de destaque</p>
            
            {/* Preview Bar */}
            <div 
              className="h-11 rounded-xl mb-4 flex items-center justify-center shadow-lg"
              style={{ background: getCurrentGradient() }}
            >
              <span className="text-sm font-medium text-white drop-shadow-md">
                {isDefaultSelected ? 'Cor Padrão' : 'Sua Cor'}
              </span>
            </div>

            {/* Default option */}
            <button
              onClick={handleUseDefault}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all mb-3 flex items-center gap-3",
                isDefaultSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-primary/50 bg-background/50"
              )}
            >
              <div 
                className="w-9 h-9 rounded-lg flex-shrink-0"
                style={{ background: DEFAULT_GRADIENT }}
              />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Usar cor padrão</p>
                <p className="text-xs text-muted-foreground">Gradiente SaveDin</p>
              </div>
              {isDefaultSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>

            {/* Presets */}
            <p className="text-xs text-muted-foreground mb-2">Ou escolha um preset</p>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {PRESET_COLORS.map((preset) => {
                const gradient = `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 100%)`;
                const isSelected = !useDefault && 
                  customColor1 === preset.colors[0] && 
                  customColor3 === preset.colors[1] &&
                  numColors === 2;
                return (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset.colors)}
                    className={cn(
                      "aspect-square rounded-lg transition-all shadow-md hover:scale-105",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{ background: gradient }}
                    title={preset.name}
                  />
                );
              })}
            </div>

            {/* Custom color section */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-foreground">Personalizar cores</p>
                <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50">
                  <button
                    onClick={() => handleNumColorsChange(1)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-all",
                      numColors === 1 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    1 cor
                  </button>
                  <button
                    onClick={() => handleNumColorsChange(2)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-all",
                      numColors === 2 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    2 cores
                  </button>
                  <button
                    onClick={() => handleNumColorsChange(3)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-all",
                      numColors === 3 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    3 cores
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Color 1 - always visible */}
                <button
                  onClick={() => openColorPicker(0)}
                  className="flex-1 h-10 rounded-lg border-2 border-transparent hover:border-primary/50 transition-all shadow-inner"
                  style={{ background: customColor1 }}
                  title={numColors === 1 ? "Cor sólida" : "Cor inicial"}
                />
                
                {/* Color 2 (middle) - only show if 3 colors */}
                {numColors === 3 && (
                  <button
                    onClick={() => openColorPicker(1)}
                    className="flex-1 h-10 rounded-lg border-2 border-transparent hover:border-primary/50 transition-all shadow-inner"
                    style={{ background: customColor2 }}
                    title="Cor do meio"
                  />
                )}
                
                {/* Color 3 (end) - only show if 2+ colors */}
                {numColors >= 2 && (
                  <button
                    onClick={() => openColorPicker(2)}
                    className="flex-1 h-10 rounded-lg border-2 border-transparent hover:border-primary/50 transition-all shadow-inner"
                    style={{ background: customColor3 }}
                    title="Cor final"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Theme Toggle - Dark / Light */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {selectedTheme === 'dark' ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Tema Escuro</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTheme === 'dark' ? 'Modo noturno ativado' : 'Modo claro ativado'}
                </p>
              </div>
            </div>
            <Switch
              checked={selectedTheme === 'dark'}
              onCheckedChange={(checked) => applyTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Glass Effect Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/20 to-white/5 backdrop-blur border border-white/20 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Efeito Glass</p>
                <p className="text-xs text-muted-foreground">Transparência e brilhos</p>
              </div>
            </div>
            <Switch
              checked={glassEnabled}
              onCheckedChange={applyGlassEffect}
            />
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 space-y-2"
        >
          <Button onClick={handleSave} size="lg" className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Salvar e Continuar
          </Button>
          
          <Button variant="ghost" onClick={onBack} className="w-full gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </motion.div>
      </div>

      {/* Color Picker Dialog */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader className="relative">
            <DialogTitle className="text-center">
              {editingColorIndex === 0 
                ? (numColors === 1 ? 'Cor sólida' : 'Cor inicial') 
                : editingColorIndex === 1 
                  ? 'Cor do meio' 
                  : 'Cor final'}
            </DialogTitle>
            <button
              onClick={() => setShowColorPicker(false)}
              className="absolute right-0 top-0 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <HexColorPicker 
              color={
                editingColorIndex === 0 ? customColor1 : 
                editingColorIndex === 1 ? customColor2 : 
                customColor3
              } 
              onChange={handleColorChange}
              style={{ width: '100%' }}
            />
            <div 
              className="w-full h-10 rounded-lg border border-border"
              style={{ 
                background: editingColorIndex === 0 ? customColor1 : 
                           editingColorIndex === 1 ? customColor2 : 
                           customColor3 
              }}
            />
            <Button 
              className="w-full" 
              onClick={() => setShowColorPicker(false)}
            >
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
