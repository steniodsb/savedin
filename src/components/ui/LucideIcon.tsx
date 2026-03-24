import {
  Home, ShoppingCart, Car, Heart, PartyPopper, BookOpen, Shirt, CreditCard,
  TrendingUp, MoreHorizontal, Briefcase, Laptop, Wallet, PiggyBank, Building2,
  Coffee, Utensils, Dumbbell, Plane, Bus, Gift, Music, Film, Gamepad2,
  Baby, Dog, Scissors, Wrench, Lightbulb, Phone, Wifi, Droplets, Flame,
  Zap, TreePine, Flower2, Apple, Pizza, Beer, IceCream, Pill,
  Stethoscope, GraduationCap, Palette, Camera, Headphones, Monitor,
  Smartphone, Watch, Gem, Crown, Star, Shield, Umbrella, Key,
  type LucideIcon as LucideIconType
} from 'lucide-react';

const iconMap: Record<string, LucideIconType> = {
  Home, ShoppingCart, Car, Heart, PartyPopper, BookOpen, Shirt, CreditCard,
  TrendingUp, MoreHorizontal, Briefcase, Laptop, Wallet, PiggyBank, Building2,
  Coffee, Utensils, Dumbbell, Plane, Bus, Gift, Music, Film, Gamepad2,
  Baby, Dog, Scissors, Wrench, Lightbulb, Phone, Wifi, Droplets, Flame,
  Zap, TreePine, Flower2, Apple, Pizza, Beer, IceCream, Pill,
  Stethoscope, GraduationCap, Palette, Camera, Headphones, Monitor,
  Smartphone, Watch, Gem, Crown, Star, Shield, Umbrella, Key,
};

export const availableIcons = Object.keys(iconMap);

interface LucideIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LucideIcon({ name, className = '', style }: LucideIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return <MoreHorizontal className={className} style={style} />;
  return <Icon className={className} style={style} />;
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-1.5 max-h-[200px] overflow-y-auto p-1">
      {availableIcons.map((name) => {
        const Icon = iconMap[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
              value === name
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted/30 border-2 border-transparent hover:bg-muted/50'
            }`}
            title={name}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
