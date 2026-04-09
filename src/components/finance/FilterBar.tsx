import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Check } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAccountsData } from '@/hooks/useAccountsData';
import { useCreditCardsData } from '@/hooks/useCreditCardsData';
import { useSavedinCategories } from '@/hooks/useSavedinCategories';
import { useTagsData } from '@/hooks/useTagsData';
import { useEnvironmentsData } from '@/hooks/useEnvironmentsData';
import { LucideIcon } from '@/components/ui/LucideIcon';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type TransactionStatus = 'all' | 'pending' | 'paid' | 'overdue';
export type TransactionTypeFilter = 'all' | 'expense' | 'income';

export interface FilterState {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  type: TransactionTypeFilter;
  categoryIds: string[];
  accountIds: string[];
  cardIds: string[];
  tagIds: string[];
  environmentIds: string[];
  status: TransactionStatus;
  // Legacy single-value accessors for backward compatibility
  categoryId?: string | null;
  accountId?: string | null;
  cardId?: string | null;
  tagId?: string | null;
  environmentId?: string | null;
}

export const defaultFilters: FilterState = {
  datePreset: 'month',
  dateFrom: '',
  dateTo: '',
  type: 'all',
  categoryIds: [],
  accountIds: [],
  cardIds: [],
  tagIds: [],
  environmentIds: [],
  status: 'all',
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  showType?: boolean;
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

// Toggle an item in an array (add if not present, remove if present)
function toggleArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
}

// Checkbox item component
function CheckboxItem({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
      }`}>
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <span className="text-xs truncate flex-1">{children}</span>
    </button>
  );
}

export function FilterBar({
  filters,
  onChange,
  showType = false,
  showStatus = false,
  showCategory = true,
  showAccount = true,
  showCard = true,
  showTag = true,
  showEnvironment = true,
  showDate = true,
}: FilterBarProps) {
  const { accounts } = useAccountsData();
  const { creditCards } = useCreditCardsData();
  const { categories, getSubcategories } = useSavedinCategories();
  const { tags } = useTagsData();
  const { environments } = useEnvironmentsData();
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });

  const activeFilterCount = [
    filters.type !== 'all' ? 1 : 0,
    filters.categoryIds.length,
    filters.accountIds.length,
    filters.cardIds.length,
    filters.tagIds.length,
    filters.environmentIds.length,
    filters.status !== 'all' ? 1 : 0,
    filters.datePreset !== 'month' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => onChange({ ...defaultFilters });

  // Build badge labels
  const badgeItems: { label: string; onRemove: () => void }[] = [];

  if (filters.type !== 'all') {
    badgeItems.push({ label: filters.type === 'expense' ? 'Despesas' : 'Receitas', onRemove: () => update({ type: 'all' }) });
  }
  if (filters.status !== 'all') {
    badgeItems.push({ label: filters.status === 'pending' ? 'Pendentes' : filters.status === 'paid' ? 'Pagas' : 'Vencidas', onRemove: () => update({ status: 'all' }) });
  }
  filters.categoryIds.forEach(id => {
    const cat = categories.find(c => c.id === id);
    if (cat) badgeItems.push({ label: cat.name, onRemove: () => update({ categoryIds: filters.categoryIds.filter(x => x !== id) }) });
  });
  filters.accountIds.forEach(id => {
    const acc = accounts.find(a => a.id === id);
    if (acc) badgeItems.push({ label: acc.name, onRemove: () => update({ accountIds: filters.accountIds.filter(x => x !== id) }) });
  });
  filters.cardIds.forEach(id => {
    const card = creditCards.find(c => c.id === id);
    if (card) badgeItems.push({ label: card.name, onRemove: () => update({ cardIds: filters.cardIds.filter(x => x !== id) }) });
  });
  filters.tagIds.forEach(id => {
    const tag = tags.find(t => t.id === id);
    if (tag) badgeItems.push({ label: tag.name, onRemove: () => update({ tagIds: filters.tagIds.filter(x => x !== id) }) });
  });
  filters.environmentIds.forEach(id => {
    const env = environments.find(e => e.id === id);
    if (env) badgeItems.push({ label: env.name, onRemove: () => update({ environmentIds: filters.environmentIds.filter(x => x !== id) }) });
  });

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
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 max-h-[70vh] overflow-y-auto" align="end">
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
                <div className="space-y-2 mt-1">
                  <DatePicker
                    value={filters.dateFrom}
                    onChange={(v) => update({ dateFrom: v, datePreset: 'custom' })}
                    placeholder="Data inicial"
                    className="h-8 text-xs"
                  />
                  <DatePicker
                    value={filters.dateTo}
                    onChange={(v) => update({ dateTo: v, datePreset: 'custom' })}
                    placeholder="Data final"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Type */}
            {showType && (
              <div>
                <Label className="text-xs mb-1.5 block">Tipo</Label>
                <div className="space-y-0.5">
                  {([
                    { value: 'all', label: 'Todos' },
                    { value: 'expense', label: 'Despesas' },
                    { value: 'income', label: 'Receitas' },
                  ] as const).map(({ value, label }) => (
                    <CheckboxItem
                      key={value}
                      checked={filters.type === value}
                      onClick={() => update({ type: value })}
                    >
                      {label}
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            {showStatus && (
              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <div className="space-y-0.5">
                  {([
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: 'Pendentes' },
                    { value: 'paid', label: 'Pagas' },
                    { value: 'overdue', label: 'Vencidas' },
                  ] as const).map(({ value, label }) => (
                    <CheckboxItem
                      key={value}
                      checked={filters.status === value}
                      onClick={() => update({ status: value as TransactionStatus })}
                    >
                      {label}
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}

            {/* Category — multi-select */}
            {showCategory && categories.filter(c => c.is_active && !c.parent_id).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Categorias</Label>
                  {filters.categoryIds.length > 0 && (
                    <button onClick={() => update({ categoryIds: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {categories.filter(c => c.is_active && !c.parent_id).map((c) => {
                    const subs = getSubcategories(c.id);
                    return (
                      <div key={c.id}>
                        <CheckboxItem
                          checked={filters.categoryIds.includes(c.id)}
                          onClick={() => update({ categoryIds: toggleArray(filters.categoryIds, c.id) })}
                        >
                          <div className="flex items-center gap-2">
                            <LucideIcon name={c.icon} className="h-3.5 w-3.5 flex-shrink-0" style={{ color: c.color }} />
                            <span>{c.name}</span>
                          </div>
                        </CheckboxItem>
                        {subs.map((sub) => (
                          <div key={sub.id} className="pl-4">
                            <CheckboxItem
                              checked={filters.categoryIds.includes(sub.id)}
                              onClick={() => update({ categoryIds: toggleArray(filters.categoryIds, sub.id) })}
                            >
                              <div className="flex items-center gap-2">
                                <LucideIcon name={sub.icon} className="h-3 w-3 flex-shrink-0" style={{ color: sub.color }} />
                                <span className="text-muted-foreground">{sub.name}</span>
                              </div>
                            </CheckboxItem>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account — multi-select */}
            {showAccount && accounts.filter(a => a.is_active).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Contas</Label>
                  {filters.accountIds.length > 0 && (
                    <button onClick={() => update({ accountIds: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {accounts.filter(a => a.is_active).map((a) => (
                    <CheckboxItem
                      key={a.id}
                      checked={filters.accountIds.includes(a.id)}
                      onClick={() => update({ accountIds: toggleArray(filters.accountIds, a.id) })}
                    >
                      {a.name}
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}

            {/* Card — multi-select */}
            {showCard && creditCards.filter(c => c.is_active).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Cartões</Label>
                  {filters.cardIds.length > 0 && (
                    <button onClick={() => update({ cardIds: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {creditCards.filter(c => c.is_active).map((c) => (
                    <CheckboxItem
                      key={c.id}
                      checked={filters.cardIds.includes(c.id)}
                      onClick={() => update({ cardIds: toggleArray(filters.cardIds, c.id) })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span>{c.name}</span>
                      </div>
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}

            {/* Tag — multi-select */}
            {showTag && tags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Tags</Label>
                  {filters.tagIds.length > 0 && (
                    <button onClick={() => update({ tagIds: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {tags.map((t) => (
                    <CheckboxItem
                      key={t.id}
                      checked={filters.tagIds.includes(t.id)}
                      onClick={() => update({ tagIds: toggleArray(filters.tagIds, t.id) })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span>{t.name}</span>
                      </div>
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}

            {/* Environment — multi-select */}
            {showEnvironment && environments.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Ambientes</Label>
                  {filters.environmentIds.length > 0 && (
                    <button onClick={() => update({ environmentIds: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {environments.map((e) => (
                    <CheckboxItem
                      key={e.id}
                      checked={filters.environmentIds.includes(e.id)}
                      onClick={() => update({ environmentIds: toggleArray(filters.environmentIds, e.id) })}
                    >
                      <div className="flex items-center gap-2">
                        {e.avatar_url ? (
                          <img src={e.avatar_url} alt="" className="h-3.5 w-3.5 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                        )}
                        <span>{e.name}</span>
                      </div>
                    </CheckboxItem>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {badgeItems.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {badgeItems.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
              {item.label}
              <button onClick={item.onRemove}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to filter transactions using FilterState
export function applyFilters<T extends { date: string; type?: string; category_id?: string | null; account_id?: string | null; card_id?: string | null; tags?: string[] | null; environment_id?: string; status?: string }>(
  items: T[],
  filters: FilterState,
  allCategories?: { id: string; parent_id: string | null }[],
): T[] {
  let result = items;

  // Type filter
  if (filters.type !== 'all') {
    result = result.filter(item => item.type === filters.type);
  }

  // Date filter
  const range = getDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  if (range) {
    result = result.filter(item => item.date >= range.start && item.date <= range.end);
  }

  // Category (multi-select, includes subcategories when filtering by parent)
  if (filters.categoryIds.length > 0) {
    const expandedIds = new Set(filters.categoryIds);
    if (allCategories) {
      filters.categoryIds.forEach(id => {
        allCategories.filter(c => c.parent_id === id).forEach(c => expandedIds.add(c.id));
      });
    }
    result = result.filter(item => item.category_id && expandedIds.has(item.category_id));
  }

  // Account (multi-select)
  if (filters.accountIds.length > 0) {
    const ids = new Set(filters.accountIds);
    result = result.filter(item => item.account_id && ids.has(item.account_id));
  }

  // Card (multi-select)
  if (filters.cardIds.length > 0) {
    const ids = new Set(filters.cardIds);
    result = result.filter(item => item.card_id && ids.has(item.card_id));
  }

  // Tag (multi-select)
  if (filters.tagIds.length > 0) {
    const ids = new Set(filters.tagIds);
    result = result.filter(item => item.tags?.some(t => ids.has(t)) || false);
  }

  // Environment (multi-select)
  if (filters.environmentIds.length > 0) {
    const ids = new Set(filters.environmentIds);
    result = result.filter(item => item.environment_id && ids.has(item.environment_id));
  }

  // Status
  if (filters.status !== 'all') {
    result = result.filter(item => item.status === filters.status);
  }

  return result;
}
