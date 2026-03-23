import { useState } from 'react';
import { Clock, Save, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useRemindersData, Reminder, ReminderFrequency } from '@/hooks/useRemindersData';
import { IconPicker } from '@/components/ui/icon-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditReminderFormProps {
  reminder: Reminder;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const weekDays = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function EditReminderForm({ reminder, onSuccess, onCancel }: EditReminderFormProps) {
  const { updateReminder } = useRemindersData();
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: reminder.title,
    description: reminder.description || '',
    icon: reminder.icon,
    frequency: reminder.frequency,
    time: reminder.timeOfDay.slice(0, 5),
    customDays: reminder.customDays || [],
    reminderDate: reminder.startDate || new Date().toISOString().split('T')[0],
  });

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      customDays: prev.customDays.includes(day)
        ? prev.customDays.filter(d => d !== day)
        : [...prev.customDays, day].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateReminder({
        id: reminder.id,
        updates: {
          title: formData.title,
          description: formData.description || undefined,
          icon: formData.icon,
          frequency: formData.frequency,
          customDays: formData.frequency === 'custom' ? formData.customDays : undefined,
          timeOfDay: formData.time + ':00',
          startDate: formData.frequency === 'once' ? formData.reminderDate : undefined,
        }
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 overflow-x-hidden">
      {/* Ícone e Título */}
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-2 flex-shrink-0">
            <Label>Ícone</Label>
            <IconPicker
              value={formData.icon}
              onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Tomar remédio"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detalhes adicionais..."
            rows={2}
          />
        </div>
      </div>

      {/* Frequência */}
      <div className="space-y-3">
        <Label>Frequência</Label>
        <Select
          value={formData.frequency}
          onValueChange={(value: ReminderFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">Uma vez</SelectItem>
            <SelectItem value="daily">Diariamente</SelectItem>
            <SelectItem value="weekly">Semanalmente</SelectItem>
            <SelectItem value="custom">Dias específicos</SelectItem>
          </SelectContent>
        </Select>

        {/* Data do lembrete para frequência "Uma vez" */}
        {formData.frequency === 'once' && (
          <div className="space-y-2">
            <Label>Data do lembrete</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.reminderDate
                    ? format(new Date(formData.reminderDate + 'T00:00:00'), "d 'de' MMMM, yyyy", { locale: ptBR })
                    : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={formData.reminderDate ? new Date(formData.reminderDate + 'T00:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({
                        ...prev,
                        reminderDate: date.toISOString().split('T')[0]
                      }));
                    }
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Dias customizados */}
        {formData.frequency === 'custom' && (
          <div className="flex gap-1.5 flex-wrap">
            {weekDays.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formData.customDays.includes(day.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Horário */}
      <div className="space-y-2">
        <Label htmlFor="time">Horário</Label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
