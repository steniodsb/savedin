import { Card, CardContent } from '@/components/ui/card';
import { SparklineChart } from './SparklineChart';
import { formatCurrency } from '@/types/savedin';

interface EnvironmentCardProps {
  name: string;
  color: string;
  icon?: string;
  totalBalance: number;
  variation?: number;
  sparklineData?: number[];
  onClick?: () => void;
}

export function EnvironmentCard({
  name,
  color,
  icon,
  totalBalance,
  variation,
  sparklineData = [],
  onClick,
}: EnvironmentCardProps) {
  const variationColor = !variation || variation === 0
    ? 'text-muted-foreground'
    : variation > 0 ? 'text-green-500' : 'text-destructive';

  return (
    <Card
      className="min-w-[200px] flex-shrink-0 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <p className="text-sm font-semibold truncate">{icon} {name}</p>
        </div>
        <p className="text-lg font-bold text-foreground">{formatCurrency(totalBalance)}</p>
        <div className="flex items-center justify-between mt-2">
          {variation !== undefined && (
            <span className={`text-xs font-medium ${variationColor}`}>
              {variation > 0 ? '↑ +' : variation < 0 ? '↓ ' : '→ '}{variation.toFixed(1)}%
            </span>
          )}
          {sparklineData.length > 1 && (
            <SparklineChart data={sparklineData} width={60} height={24} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
