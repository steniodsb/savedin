import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Palette } from 'lucide-react';

const PRESET_COLORS = [
  // Row 1 — Vibrant
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
  '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  // Row 2 — Warm/Neutral
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B',
  '#9E9E9E', '#000000',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div>
      {label && <p className="text-sm font-medium mb-1.5">{label}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
              value.toLowerCase() === color.toLowerCase()
                ? 'border-foreground scale-110 ring-2 ring-foreground/20'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}

        {/* Custom color picker */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all hover:scale-110 ${
                !PRESET_COLORS.includes(value.toUpperCase()) && value !== ''
                  ? 'border-foreground ring-2 ring-foreground/20'
                  : 'border-border/50 hover:border-border'
              }`}
              style={{
                backgroundColor: !PRESET_COLORS.includes(value.toUpperCase()) ? value : 'transparent',
              }}
            >
              {PRESET_COLORS.includes(value.toUpperCase()) && (
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Cor personalizada</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-10 w-10 rounded-lg cursor-pointer border border-border/50 bg-transparent"
                />
                <Input
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
                  }}
                  placeholder="#FF5722"
                  className="w-28 h-10 font-mono text-sm"
                  maxLength={7}
                />
              </div>
              <div
                className="h-8 rounded-lg border border-border/30"
                style={{ backgroundColor: value }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
