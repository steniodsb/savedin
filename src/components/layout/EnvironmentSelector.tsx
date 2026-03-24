import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { useUIStore } from '@/store/useUIStore';
import { Globe, ChevronDown, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

export function EnvironmentSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { environments } = useEnvironmentsData();
  const { selectedEnvironmentId, setSelectedEnvironmentId, setActiveTab } = useUIStore();
  const [open, setOpen] = useState(false);

  const selected = environments.find(e => e.id === selectedEnvironmentId);
  const label = selected ? selected.name : 'Todos os ambientes';
  const color = selected?.color || undefined;

  const handleSelect = (id: string | null) => {
    setSelectedEnvironmentId(id);
    setOpen(false);
  };

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/30 transition-colors">
            {selected ? (
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: selected.color }} />
            ) : (
              <Globe className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-52 p-1.5">
          <EnvironmentList
            environments={environments}
            selectedId={selectedEnvironmentId}
            onSelect={handleSelect}
            onManage={() => { setActiveTab('settings'); setOpen(false); }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/10 transition-colors">
          {selected ? (
            <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground flex-1 text-left truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <EnvironmentList
          environments={environments}
          selectedId={selectedEnvironmentId}
          onSelect={handleSelect}
          onManage={() => { setActiveTab('settings'); setOpen(false); }}
        />
      </PopoverContent>
    </Popover>
  );
}

function EnvironmentList({
  environments,
  selectedId,
  onSelect,
  onManage,
}: {
  environments: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedId === null ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
        }`}
      >
        <Globe className="h-4 w-4 flex-shrink-0" />
        <span>Todos os ambientes</span>
      </button>

      {environments.map((env) => (
        <button
          key={env.id}
          onClick={() => onSelect(env.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedId === env.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
          }`}
        >
          <div className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: env.color }} />
          <span className="truncate">{env.name}</span>
          {env.is_default && <span className="text-[9px] text-muted-foreground ml-auto">padrão</span>}
        </button>
      ))}

      <div className="border-t border-border/50 mt-1 pt-1">
        <button
          onClick={onManage}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Gerenciar ambientes</span>
        </button>
      </div>
    </div>
  );
}
