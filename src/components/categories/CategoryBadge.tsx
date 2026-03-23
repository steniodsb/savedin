import { useCategoriesData, CategoryType } from '@/hooks/useCategoriesData';
import { cn } from '@/lib/utils';
import { Icon3D } from '@/components/ui/icon-picker';

interface CategoryBadgeProps {
  categoryId?: string;
  type: CategoryType;
  size?: 'sm' | 'md';
  className?: string;
}

export function CategoryBadge({ categoryId, type, size = 'sm', className }: CategoryBadgeProps) {
  const { categories } = useCategoriesData(type);
  
  if (!categoryId) return null;
  
  const category = categories.find(c => c.id === categoryId);
  if (!category) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
      style={{ 
        backgroundColor: category.color + '20',
        color: category.color,
      }}
    >
      <Icon3D icon={category.icon} size="xs" />
      <span>{category.name}</span>
    </span>
  );
}
