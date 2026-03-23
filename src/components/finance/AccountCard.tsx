import { Card, CardContent } from '@/components/ui/card';
import { SparklineChart } from './SparklineChart';
import { formatCurrency, Account, accountTypeLabels } from '@/types/savedin';
import { Building2, PiggyBank, Wallet, TrendingUp } from 'lucide-react';
import type { AccountType } from '@/types/savedin';

const typeIcons: Record<AccountType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  checking: Building2,
  savings: PiggyBank,
  wallet: Wallet,
  investment: TrendingUp,
};

interface AccountCardProps {
  account: Account;
  sparklineData?: number[];
  variation?: number;
  onClick?: () => void;
}

export function AccountCard({ account, sparklineData = [], variation, onClick }: AccountCardProps) {
  const Icon = typeIcons[account.type] || Wallet;
  const variationColor = !variation || variation === 0
    ? 'text-muted-foreground'
    : variation > 0 ? 'text-green-500' : 'text-destructive';

  return (
    <Card
      className="min-w-[200px] max-w-[240px] flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: account.color + '20' }}
          >
            <Icon className="h-4 w-4" style={{ color: account.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{account.name}</p>
            <p className="text-[10px] text-muted-foreground">{accountTypeLabels[account.type]}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">{formatCurrency(Number(account.balance))}</p>
        <div className="flex items-center justify-between mt-2">
          {variation !== undefined && (
            <span className={`text-xs font-medium ${variationColor}`}>
              {variation > 0 ? '↑' : variation < 0 ? '↓' : '→'} {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
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
