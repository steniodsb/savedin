import { useUIStore, ViewMode } from '@/store/useUIStore';
import { CalendarDays, Wallet } from 'lucide-react';

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div className="flex items-center bg-muted/30 rounded-xl border border-border/30 p-0.5">
      <ToggleButton
        active={viewMode === 'competencia'}
        onClick={() => setViewMode('competencia')}
        icon={<CalendarDays className="h-3.5 w-3.5" />}
        label="Competência"
      />
      <ToggleButton
        active={viewMode === 'caixa'}
        onClick={() => setViewMode('caixa')}
        icon={<Wallet className="h-3.5 w-3.5" />}
        label="Caixa"
      />
    </div>
  );
}

function ToggleButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-background shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
