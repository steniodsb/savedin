import { Card, CardContent } from '@/components/ui/card';
import { TechGridPattern } from '@/components/ui/TechGridPattern';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/types/savedin';

interface StatCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  variation?: number; // percentage
  subtitle?: string;
  icon?: React.ReactNode;
  linkText?: string;
  onLinkClick?: () => void;
  techGrid?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  isCurrency = true,
  variation,
  subtitle,
  icon,
  linkText,
  onLinkClick,
  techGrid = true,
  className = '',
}: StatCardProps) {
  const displayValue = isCurrency && typeof value === 'number' ? formatCurrency(value) : String(value);
  const variationColor = variation === undefined || variation === 0
    ? 'text-muted-foreground'
    : variation > 0 ? 'text-green-500' : 'text-destructive';

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {techGrid && <TechGridPattern position="top-right" size={80} opacity={0.08} />}
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          {icon && <div className="flex-shrink-0">{icon}</div>}
        </div>
        <p className="text-xl font-bold text-foreground leading-tight">{displayValue}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            {variation !== undefined && (
              <>
                {variation > 0 ? (
                  <TrendingUp className={`h-3.5 w-3.5 ${variationColor}`} />
                ) : variation < 0 ? (
                  <TrendingDown className={`h-3.5 w-3.5 ${variationColor}`} />
                ) : (
                  <Minus className={`h-3.5 w-3.5 ${variationColor}`} />
                )}
                <span className={`text-xs font-medium ${variationColor}`}>
                  {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                </span>
              </>
            )}
            {subtitle && <span className="text-xs text-muted-foreground ml-1">{subtitle}</span>}
          </div>
          {linkText && onLinkClick && (
            <button
              onClick={onLinkClick}
              className="text-xs text-primary hover:underline"
            >
              {linkText}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
