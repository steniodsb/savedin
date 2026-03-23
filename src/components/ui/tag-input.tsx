import { useState, KeyboardEvent } from 'react';
import { X, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30',
  'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30',
  'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
];

function getTagColor(tag: string): string {
  // Generate a consistent color based on the tag string
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagInput({ 
  tags, 
  onTagsChange, 
  placeholder = 'Adicionar tag...', 
  className,
  maxTags = 10 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue && addTag(inputValue)}
          placeholder={tags.length >= maxTags ? 'Limite atingido' : placeholder}
          disabled={tags.length >= maxTags}
          className="flex-1"
        />
      </div>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="outline"
              className={cn(
                'px-2 py-0.5 text-xs font-medium border',
                getTagColor(tag)
              )}
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1.5 hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {tags.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Pressione Enter ou vírgula para adicionar tags
        </p>
      )}
    </div>
  );
}

// Display-only component for showing tags
export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <Badge 
          key={tag} 
          variant="outline"
          className={cn(
            'px-1.5 py-0 text-[10px] font-medium border',
            getTagColor(tag)
          )}
        >
          #{tag}
        </Badge>
      ))}
    </div>
  );
}
