import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  variation?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
  };
  className?: string;
}

export function StatCard({ icon: Icon, value, label, variation, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 rounded-xl',
        'bg-card/50 backdrop-blur-md border border-border/10 shadow-lg',
        'hover:border-border/20 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {variation && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1',
              variation.type === 'positive' && 'bg-status-completed/20 text-status-completed',
              variation.type === 'negative' && 'bg-status-blocked/20 text-status-blocked',
              variation.type === 'neutral' && 'bg-muted/20 text-muted-foreground'
            )}
          >
            {variation.type === 'positive' && '↗'}
            {variation.type === 'negative' && '↘'}
            {variation.type === 'neutral' && '→'}
            {variation.value}%
          </span>
        )}
      </div>
      <div className="mt-1">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
