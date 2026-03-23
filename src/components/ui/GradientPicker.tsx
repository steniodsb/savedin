import React, { useState, useEffect } from 'react';
import { RotateCcw, Sparkles, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';

interface GradientPickerProps {
  value: string;
  onChange: (gradient: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GradientType = 'linear' | 'radial';
type ColorMode = '1' | '2' | '3';

// Default app gradient
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #909090 0%, #ffffff 50%, #909090 100%)';

const PRESET_GRADIENTS = [
  // Clássicos
  { name: 'Oceano', gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)' },
  { name: 'Pôr do Sol', gradient: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)' },
  { name: 'Floresta', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
  { name: 'Lavanda', gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)' },
  { name: 'Rosa', gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)' },
  { name: 'Âmbar', gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)' },
  // Vibrantes
  { name: 'Esmeralda', gradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' },
  { name: 'Safira', gradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)' },
  { name: 'Ametista', gradient: 'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)' },
  { name: 'Rubi', gradient: 'linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)' },
  { name: 'Noite', gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' },
  { name: 'Aurora', gradient: 'linear-gradient(135deg, #06B6D4 0%, #A78BFA 50%, #F472B6 100%)' },
  // Novos gradientes
  { name: 'Tropical', gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)' },
  { name: 'Menta', gradient: 'linear-gradient(135deg, #00D9A5 0%, #00B4DB 100%)' },
  { name: 'Cosmic', gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
  { name: 'Fogo', gradient: 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)' },
  { name: 'Glacial', gradient: 'linear-gradient(135deg, #74EBD5 0%, #9FACE6 100%)' },
  { name: 'Vintage', gradient: 'linear-gradient(135deg, #C9B8A8 0%, #8B7355 100%)' },
  { name: 'Neon', gradient: 'linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)' },
  { name: 'Grape', gradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)' },
  { name: 'Peach', gradient: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)' },
  { name: 'Marine', gradient: 'linear-gradient(135deg, #0077B6 0%, #023E8A 100%)' },
  { name: 'Candy', gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)' },
  { name: 'Midnight', gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
];

export function GradientPicker({ value, onChange, open, onOpenChange }: GradientPickerProps) {
  const parseGradient = (gradientString: string) => {
    const isRadial = gradientString.startsWith('radial');
    const type: GradientType = isRadial ? 'radial' : 'linear';
    
    const angleMatch = gradientString.match(/linear-gradient\((\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1]) : 135;
    
    const colorMatches = gradientString.match(/#[0-9A-Fa-f]{6}/g) || [];
    const color1 = colorMatches[0] || '#909090';
    const color2 = colorMatches.length >= 3 ? colorMatches[1] : null; // Middle color (optional)
    const color3 = colorMatches.length >= 3 ? colorMatches[2] : (colorMatches[1] || '#909090');
    
    const stopMatch = gradientString.match(/\s(\d+)%/);
    const intensity = stopMatch ? parseInt(stopMatch[1]) : 0;
    
    // Determine color count
    const colorCount: ColorMode = colorMatches.length >= 3 ? '3' : colorMatches.length === 2 ? '2' : '1';
    
    return { type, angle, color1, color2, color3, intensity, colorCount };
  };

  const parsed = parseGradient(value);
  const [type, setType] = useState(parsed.type);
  const [angle, setAngle] = useState(parsed.angle);
  const [color1, setColor1] = useState(parsed.color1);
  const [colorMiddle, setColorMiddle] = useState<string | null>(parsed.color2);
  const [color2, setColor2] = useState(parsed.color3);
  const [intensity, setIntensity] = useState(parsed.intensity);
  const [activeColorPicker, setActiveColorPicker] = useState<'color1' | 'colorMiddle' | 'color2' | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>(parsed.colorCount);

  // Reset state when dialog opens with new value
  useEffect(() => {
    if (open) {
      const parsed = parseGradient(value);
      setType(parsed.type);
      setAngle(parsed.angle);
      setColor1(parsed.color1);
      setColorMiddle(parsed.color2);
      setColor2(parsed.color3);
      setIntensity(parsed.intensity);
      setColorMode(parsed.colorCount);
      setActiveColorPicker(null);
    }
  }, [open, value]);

  const generateGradientCSS = () => {
    // Solid color (1 color)
    if (colorMode === '1') {
      return color1;
    }
    
    // Gradient with 2 or 3 colors
    if (type === 'linear') {
      if (colorMode === '3' && colorMiddle) {
        return `linear-gradient(${angle}deg, ${color1} ${intensity}%, ${colorMiddle} 50%, ${color2} 100%)`;
      }
      return `linear-gradient(${angle}deg, ${color1} ${intensity}%, ${color2} 100%)`;
    } else {
      if (colorMode === '3' && colorMiddle) {
        return `radial-gradient(circle, ${color1} ${intensity}%, ${colorMiddle} 50%, ${color2} 100%)`;
      }
      return `radial-gradient(circle, ${color1} ${intensity}%, ${color2} 100%)`;
    }
  };
  
  const isGradient = colorMode !== '1';

  const currentGradient = generateGradientCSS();

  const handlePresetClick = (gradient: string) => {
    const parsed = parseGradient(gradient);
    setType(parsed.type);
    setAngle(parsed.angle);
    setColor1(parsed.color1);
    setColorMiddle(parsed.color2);
    setColor2(parsed.color3);
    setIntensity(parsed.intensity);
    setColorMode(parsed.colorCount);
  };

  const handleResetToDefault = () => {
    // Reset to app default 3-color gradient
    setType('linear');
    setAngle(135);
    setColor1('#909090');
    setColorMiddle('#ffffff');
    setColor2('#909090');
    setIntensity(0);
    setColorMode('3');
  };

  const handleColorModeChange = (newMode: ColorMode) => {
    setColorMode(newMode);
    if (newMode === '3' && !colorMiddle) {
      setColorMiddle('#ffffff');
    }
  };

  const handleApply = () => {
    onChange(currentGradient);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalização
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-0 right-0 p-1.5 rounded-full bg-card/80 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Preview
            </Label>
            <div 
              className="h-24 rounded-2xl shadow-lg border border-border"
              style={{ background: currentGradient }}
            />
          </div>

          {/* Color Mode Selector */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Modo de Cor
            </Label>
            <Select value={colorMode} onValueChange={(v) => handleColorModeChange(v as ColorMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="1">1 cor (sólido)</SelectItem>
                <SelectItem value="2">2 cores (gradiente)</SelectItem>
                <SelectItem value="3">3 cores (gradiente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Selector - Only for gradients */}
          {isGradient && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Tipo de Gradiente
              </Label>
              <RadioGroup 
                value={type} 
                onValueChange={(v) => setType(v as GradientType)}
                className="flex gap-3"
              >
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${type === 'linear' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                  <RadioGroupItem value="linear" id="linear" className="sr-only" />
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Linear</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${type === 'radial' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}>
                  <RadioGroupItem value="radial" id="radial" className="sr-only" />
                  <Circle className="h-4 w-4" />
                  <span className="text-sm font-medium">Radial</span>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Color Pickers */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              {colorMode === '1' ? 'Cor' : 'Cores'}
            </Label>
            
            <div className={`grid gap-3 ${colorMode === '3' ? 'grid-cols-3' : colorMode === '2' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {colorMode === '1' ? 'Cor Principal' : 'Início'}
                </Label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveColorPicker(activeColorPicker === 'color1' ? null : 'color1')}
                    className="w-full h-12 rounded-xl border-2 border-border hover:border-primary transition-all shadow-sm"
                    style={{ backgroundColor: color1 }}
                  />
                  {activeColorPicker === 'color1' && (
                    <div className="space-y-2">
                      <HexColorPicker color={color1} onChange={setColor1} className="!w-full" />
                      <input
                        type="text"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono bg-background border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {colorMode === '3' && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Meio
                  </Label>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setActiveColorPicker(activeColorPicker === 'colorMiddle' ? null : 'colorMiddle')}
                      className="w-full h-12 rounded-xl border-2 border-border hover:border-primary transition-all shadow-sm"
                      style={{ backgroundColor: colorMiddle || '#ffffff' }}
                    />
                    {activeColorPicker === 'colorMiddle' && (
                      <div className="space-y-2">
                        <HexColorPicker color={colorMiddle || '#ffffff'} onChange={setColorMiddle} className="!w-full" />
                        <input
                          type="text"
                          value={colorMiddle || '#ffffff'}
                          onChange={(e) => setColorMiddle(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-background border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(colorMode === '2' || colorMode === '3') && (
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Fim
                  </Label>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setActiveColorPicker(activeColorPicker === 'color2' ? null : 'color2')}
                      className="w-full h-12 rounded-xl border-2 border-border hover:border-primary transition-all shadow-sm"
                      style={{ backgroundColor: color2 }}
                    />
                    {activeColorPicker === 'color2' && (
                      <div className="space-y-2">
                        <HexColorPicker color={color2} onChange={setColor2} className="!w-full" />
                        <input
                          type="text"
                          value={color2}
                          onChange={(e) => setColor2(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-background border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Angle Slider (only for linear gradient) */}
          {isGradient && type === 'linear' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Ângulo
                </Label>
                <span className="text-sm font-mono text-muted-foreground">{angle}°</span>
              </div>
              <Slider
                value={[angle]}
                onValueChange={([value]) => setAngle(value)}
                min={0}
                max={360}
                step={1}
                className="mb-2"
              />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setAngle(135)}
                className="w-full text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetar para 135°
              </Button>
            </div>
          )}

          {/* Intensity Slider - Only for gradients */}
          {isGradient && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Intensidade
                </Label>
                <span className="text-sm font-mono text-muted-foreground">{intensity}%</span>
              </div>
              <Slider
                value={[intensity]}
                onValueChange={([value]) => setIntensity(value)}
                min={0}
                max={50}
                step={1}
              />
            </div>
          )}

          {/* Quick Palette */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
              Paleta Rápida
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset.gradient)}
                  className="aspect-square rounded-xl shadow-sm border-2 border-transparent hover:border-primary hover:scale-105 transition-all"
                  style={{ background: preset.gradient }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleResetToDefault} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Padrão
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar Gradiente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
