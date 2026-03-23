
# Plano de Correção: Bugs e Melhorias

## Resumo dos Problemas Identificados

### 1. Ícones não aparecem em alguns dropdowns
**Arquivos afetados:**
- `src/components/views/HabitsView.tsx` (linha 334) - Filtro de categoria usa `{cat.icon}` direto
- `src/components/views/TasksView.tsx` - Seletor de metas no filtro

**Causa:** Alguns componentes renderizam `.icon` diretamente em vez de usar o componente `Icon3D` que converte chaves legadas (ex: "dollar", "chart") para emojis.

---

### 2. Melhorias no Modal de Lembretes

**Arquivo:** `src/components/reminders/CreateReminderForm.tsx`

**Problemas:**
- Seletor de ícones usa lista simples de emojis em vez do `IconPicker` padrão do sistema
- Falta campo de data quando frequência é "Uma vez"

**Solução:**
- Substituir a seleção de ícones pelo componente `IconPicker` usado no resto do sistema
- Adicionar campo de data condicional para frequência "once"

---

### 3. Gráfico/Histórico no Modal de Detalhes do Hábito

**Arquivo:** `src/components/habits/HabitDetailView.tsx`

**Análise:** O gráfico usa `getHabitCompletionForDate` que busca dados de `habitLogs`. Se não há logs salvos no banco de dados, o gráfico aparece vazio.

**Investigação necessária:** Verificar se os `habitLogs` estão sendo carregados corretamente e se existem dados no banco.

---

### 4. Seleção de Cor não mostra cor personalizada do sistema

**Problema:** Ao abrir o seletor de cor em hábitos/tarefas, a opção "cor do sistema" não mostra visualmente qual é a cor atual do tema.

**Solução:** Mostrar um preview da cor accent atual do sistema na opção "Cor do sistema".

---

### 5. Ícone no Modal de Detalhes só deve aparecer se existir

**Arquivo:** `src/components/habits/HabitDetailView.tsx`

**Solução:** Adicionar verificação condicional para renderizar o ícone apenas se `habit.icon` existir e não for vazio.

---

### 6. Remover ícone de fogo dos Lembretes

**Arquivo:** `src/components/views/RemindersView.tsx` (linha 249-252)

**Solução:** Remover a seção que exibe streak com ícone de fogo dos cards de lembrete.

---

### 7. Sincronização de Toggle de Tema

**Arquivos afetados:**
- `src/components/layout/DesktopSidebar.tsx`
- `src/components/views/SettingsView.tsx`

**Problema:** O toggle de tema na sidebar e nas configurações podem ficar dessincronizados.

**Análise:** Ambos usam o hook `useTheme` que já dispara eventos `theme-changed`. A sincronização já deveria funcionar, mas precisamos verificar se o evento está sendo escutado corretamente em ambos os lugares.

---

## Tarefas de Implementação

### Tarefa 1: Corrigir ícones nos filtros
- Adicionar import de `Icon3D` em `HabitsView.tsx`
- Substituir `{cat.icon}` por `<Icon3D icon={cat.icon} size="xs" />` no filtro de categoria

### Tarefa 2: Melhorar CreateReminderForm
- Importar `IconPicker` de `@/components/ui/icon-picker`
- Substituir seletor de ícones simples pelo `IconPicker`
- Adicionar campo de data (DatePicker) condicional para `frequency === 'once'`

### Tarefa 3: Investigar e corrigir gráfico de hábitos
- Verificar se `habitLogs` está sendo populado corretamente
- Se necessário, ajustar a query ou a lógica de cálculo do `chartData`

### Tarefa 4: Adicionar preview de cor do sistema
- No seletor de cor, mostrar a cor accent atual quando "Cor do sistema" estiver selecionado

### Tarefa 5: Condicionar exibição de ícone
- Adicionar `{habit.icon && <Icon3D ... />}` no HabitDetailView

### Tarefa 6: Remover streak dos lembretes
- Deletar as linhas 249-252 em RemindersView.tsx que mostram o foguinho

### Tarefa 7: Verificar sincronização de tema
- Revisar se o evento `theme-changed` está sendo escutado em ambos os componentes
- Ajustar se necessário para garantir sincronização

---

## Detalhes Técnicos

### Mudanças em HabitsView.tsx
```typescript
// Linha 334: Substituir
<span>{cat.icon}</span>

// Por
<Icon3D icon={cat.icon} size="xs" />
```

### Mudanças em CreateReminderForm.tsx
```typescript
// Adicionar import
import { IconPicker } from '@/components/ui/icon-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Substituir seletor de ícones pelo IconPicker padrão
<IconPicker
  value={formData.icon}
  onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
/>

// Adicionar campo de data para "Uma vez"
{formData.frequency === 'once' && (
  <div className="space-y-2">
    <Label>Data do lembrete</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {formData.reminderDate || 'Selecionar data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={formData.reminderDate ? new Date(formData.reminderDate) : undefined}
          onSelect={(date) => setFormData(prev => ({ 
            ...prev, 
            reminderDate: date?.toISOString().split('T')[0] 
          }))}
        />
      </PopoverContent>
    </Popover>
  </div>
)}
```

### Mudanças em RemindersView.tsx
```typescript
// Remover linhas 249-252:
<span className="flex items-center gap-1">
  <Flame className="h-3 w-3 text-orange-500" />
  {reminder.currentStreak} dias
</span>
```

---

## Discussão Pendente

**Conclusão de hábito deve adicionar marco automático na meta vinculada?**

Esta é uma decisão de design que requer input do usuário. Atualmente, a conclusão de hábitos pode contribuir para o progresso de metas mensuráveis, mas não cria marcos automaticamente.

Opções:
1. Não fazer nada automático (comportamento atual)
2. Criar marco automático ao atingir streak específico (ex: 7 dias, 30 dias)
3. Contribuir com incremento de progresso na meta ao completar hábito

**Recomendação:** Manter comportamento atual e implementar apenas se o usuário solicitar especificamente.
