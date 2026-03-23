import { cn } from '@/lib/utils';
import { useId } from 'react';
import { useGradientColors } from '@/hooks/useGradientColors';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  label?: string;
  className?: string;
  strokeWidth?: number;
  glowOnComplete?: boolean;
}

const sizeConfig = {
  sm: { dimension: 40, fontSize: 'text-xs', labelSize: 'text-[8px]' },
  md: { dimension: 56, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  lg: { dimension: 80, fontSize: 'text-xl', labelSize: 'text-xs' },
  xl: { dimension: 120, fontSize: 'text-3xl', labelSize: 'text-sm' },
};

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  showValue = true,
  label,
  className,
  strokeWidth,
  glowOnComplete = true,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const dimension = config.dimension;
  const stroke = strokeWidth ?? (size === 'sm' ? 3 : size === 'md' ? 4 : size === 'lg' ? 5 : 6);
  const radius = (dimension - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;
  const gradientId = useId();
  const { color1, color2, color3 } = useGradientColors();

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        isComplete && glowOnComplete && 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]',
        className
      )}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            {color3 ? (
              <>
                <stop offset="50%" stopColor={color2} />
                <stop offset="100%" stopColor={color3} />
              </>
            ) : (
              <stop offset="100%" stopColor={color2} />
            )}
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          className="opacity-15"
        />
        {/* Progress circle with gradient */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? 'hsl(var(--status-completed))' : `url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out circular-progress-stroke"
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-semibold text-foreground', config.fontSize)}>
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className={cn('text-muted-foreground', config.labelSize)}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
