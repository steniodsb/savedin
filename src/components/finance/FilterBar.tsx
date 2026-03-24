import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, X, CalendarDays } from 'lucide-react';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { LucideIcon } from '@/components/ui/LucideIcon';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type TransactionStatus = 'all' | 'pending' | 'paid' | 'overdue';

export interface FilterState {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  categoryId: string | null;
  accountId: string | null;
  cardId: string | null;
  tagId: string | null;
  environmentId: string | null;
  status: TransactionStatus;
}

export const defaultFilters: FilterState = {
  datePreset: 'month',
  dateFrom: '',
  dateTo: '',
  categoryId: null,
  accountId: null,
  cardId: null,
  tagId: null,
  environmentId: null,
  status: 'all',
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  showStatus?: boolean;
  showCategory?: boolean;
  showAccount?: boolean;
  showCard?: boolean;
  showTag?: boolean;
  showEnvironment?: boolean;
  showDate?: boolean;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'year', label: 'Este ano' },
  { value: 'all', label: 'Todo período' },
  { value: 'custom', label: 'Personalizado' },
];

export function getDateRange(preset: DatePreset, from: string, to: string): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { start: fmt(now), end: fmt(now) };
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'year': {
      return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
    }
    case 'all':
      return null;
    case 'custom':
      if (from && to) return { start: from, end: to };
      return null;
  }
}

export function FilterBar({
  filters,
  onChange,
  showStatus = false,
  showCategory = true,
  showAccount = true,
  showCard = true,
  showTag = true,
  showEnvironment = false,
  showDate = true,
}: FilterBarProps) {
  const { accounts } = useAccountsData();
  const { creditCards } = useCreditCardsData();
  const { categories } = useSavedinCategories();
  const { tags } = useTagsData();
  const { environments } = useEnvironmentsData();
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });

  const activeFilterCount = [
    filters.categoryId,
    filters.accountId,
    filters.cardId,
    filters.tagId,
    filters.environmentId,
    filters.status !== 'all' ? filters.status : null,
    filters.datePreset !== 'month' ? filters.datePreset : null,
  ].filter(Boolean).length;

  const clearAll = () => onChange({ ...defaultFilters });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Preset Chips */}
      {showDate && (
        <div className="flex gap-1.5 overflow-x-auto">
          {DATE_PRESETS.filter(p => p.value !== 'custom').map((p) => (
            <button
              key={p.value}
              onClick={() => update({ datePreset: p.value })}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                filters.datePreset === p.value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 relative">
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Filtros</p>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-xs text-primary hover:underline">Limpar tudo</button>
              )}
            </div>

            {/* Custom Date Range */}
            {showDate && (
              <div>
                <Label className="text-xs">Período personalizado</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => update({ dateFrom: e.target.value, datePreset: 'custom' })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => update({ dateTo: e.target.value, datePreset: 'custom' })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            {showStatus && (
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => update({ status: v as TransactionStatus })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="paid">Pagas</SelectItem>
                    <SelectItem value="overdue">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            {showCategory && (
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={filters.categoryId || 'all'} onValueChange={(v) => update({ categoryId: v === 'all' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.filter(c => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <LucideIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account */}
            {showAccount && accounts.length > 0 && (
              <div>
                <Label className="text-xs">Conta</Label>
                <Select value={filters.accountId || 'all'} onValueChange={(v) => update({ accountId: v === 'all' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {accounts.filter(a => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Card */}
            {showCard && creditCards.length > 0 && (
              <div>
                <Label className="text-xs">Cartão</Label>
                <Select value={filters.cardId || 'all'} onValueChange={(v) => update({ cardId: v === 'all' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {creditCards.filter(c => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tag */}
            {showTag && tags.length > 0 && (
              <div>
                <Label className="text-xs">Tag</Label>
                <Select value={filters.tagId || 'all'} onValueChange={(v) => update({ tagId: v === 'all' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Environment */}
            {showEnvironment && environments.length > 1 && (
              <div>
                <Label className="text-xs">Ambiente</Label>
                <Select value={filters.environmentId || 'all'} onValueChange={(v) => update({ environmentId: v === 'all' ? null : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {environments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                          <span>{e.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex gap-1 flex-wrap">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
              {filters.status === 'pending' ? 'Pendentes' : filters.status === 'paid' ? 'Pagas' : 'Vencidas'}
              <button onClick={() => update({ status: 'all' })}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
              {categories.find(c => c.id === filters.categoryId)?.name || 'Categoria'}
              <button onClick={() => update({ categoryId: null })}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.accountId && (
            <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
              {accounts.find(a => a.id === filters.accountId)?.name || 'Conta'}
              <button onClick={() => update({ accountId: null })}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.cardId && (
            <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
              {creditCards.find(c => c.id === filters.cardId)?.name || 'Cartão'}
              <button onClick={() => update({ cardId: null })}><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to filter transactions using FilterState
export function applyFilters<T extends { date: string; category_id?: string | null; account_id?: string | null; card_id?: string | null; tags?: string[] | null; environment_id?: string; status?: string }>(
  items: T[],
  filters: FilterState,
): T[] {
  let result = items;

  // Date filter
  const range = getDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  if (range) {
    result = result.filter(item => item.date >= range.start && item.date <= range.end);
  }

  // Category
  if (filters.categoryId) {
    result = result.filter(item => item.category_id === filters.categoryId);
  }

  // Account
  if (filters.accountId) {
    result = result.filter(item => item.account_id === filters.accountId);
  }

  // Card
  if (filters.cardId) {
    result = result.filter(item => item.card_id === filters.cardId);
  }

  // Tag
  if (filters.tagId) {
    result = result.filter(item => item.tags?.includes(filters.tagId!) || false);
  }

  // Environment
  if (filters.environmentId) {
    result = result.filter(item => item.environment_id === filters.environmentId);
  }

  // Status
  if (filters.status !== 'all') {
    result = result.filter(item => item.status === filters.status);
  }

  return result;
}
