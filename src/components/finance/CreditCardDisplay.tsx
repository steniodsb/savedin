import { formatCurrency, CreditCard } from '@/types/savedin';
import { Wifi } from 'lucide-react';

interface CreditCardDisplayProps {
  card: CreditCard;
  currentUsage?: number;
  daysUntilDue?: number;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Visual credit card component styled like a physical card.
 */
export function CreditCardDisplay({
  card,
  currentUsage = 0,
  daysUntilDue,
  isActive = false,
  onClick,
}: CreditCardDisplayProps) {
  const available = Number(card.credit_limit) - currentUsage;
  const usagePercent = Number(card.credit_limit) > 0
    ? (currentUsage / Number(card.credit_limit)) * 100
    : 0;

  return (
    <div
      className={`relative w-full max-w-[340px] aspect-[1.6/1] rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${card.color}, ${card.color}cc, ${card.color}99)`,
      }}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-[10px] uppercase tracking-widest">Cartão de crédito</p>
          <p className="text-white font-bold text-base mt-0.5">{card.name}</p>
        </div>
        <Wifi className="h-5 w-5 text-white/50 rotate-90" />
      </div>

      {/* Middle — card number placeholder */}
      <div className="flex items-center gap-3">
        <span className="text-white/40 text-sm tracking-[0.25em]">••••</span>
        <span className="text-white/40 text-sm tracking-[0.25em]">••••</span>
        <span className="text-white/40 text-sm tracking-[0.25em]">••••</span>
        <span className="text-white/80 text-sm tracking-[0.25em] font-medium">
          {String(card.closing_day).padStart(2, '0')}{String(card.due_day).padStart(2, '0')}
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white/50 text-[10px]">Fatura atual</p>
          <p className="text-white font-bold text-lg leading-tight">{formatCurrency(currentUsage)}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[10px]">Disponível</p>
          <p className="text-white/90 font-semibold text-sm">{formatCurrency(available)}</p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-2xl overflow-hidden">
        <div
          className="h-full transition-all rounded-b-2xl"
          style={{
            width: `${Math.min(usagePercent, 100)}%`,
            backgroundColor: usagePercent > 80 ? '#ef4444' : 'rgba(255,255,255,0.4)',
          }}
        />
      </div>

      {/* Due date badge */}
      {daysUntilDue !== undefined && daysUntilDue <= 7 && (
        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-white text-[10px] font-medium">
            {daysUntilDue <= 0 ? 'Vencida' : `${daysUntilDue}d`}
          </span>
        </div>
      )}
    </div>
  );
}
