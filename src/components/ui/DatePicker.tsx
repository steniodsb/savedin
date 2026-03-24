import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Selecione uma data', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value + 'T12:00:00') : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const iso = date.toISOString().split('T')[0];
      onChange(iso);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {selectedDate
            ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}
