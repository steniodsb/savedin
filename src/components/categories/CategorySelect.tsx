import { useCategoriesData, CategoryType, Category } from '@/hooks/useCategoriesData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Icon3D } from '@/components/ui/icon-picker';

interface CategorySelectProps {
  type: CategoryType;
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  placeholder?: string;
}

export function CategorySelect({ 
  type, 
  value, 
  onChange, 
  label = 'Categoria',
  placeholder = 'Selecione uma categoria'
}: CategorySelectProps) {
  const { categories } = useCategoriesData(type);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select
        value={value || 'none'}
        onValueChange={(val) => onChange(val === 'none' ? undefined : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {value ? (
              <span className="flex items-center gap-2">
                <Icon3D icon={categories.find(c => c.id === value)?.icon} size="xs" />
                {categories.find(c => c.id === value)?.name}
              </span>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Sem categoria</span>
          </SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat.id} value={cat.id}>
              <span className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <Icon3D icon={cat.icon} size="xs" />
                </span>
                {cat.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
