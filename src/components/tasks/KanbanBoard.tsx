import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard } from './KanbanTaskCard';
import { useTasksData } from '@/hooks/useTasksData';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';

interface KanbanBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const statusConfig: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Pendente', color: 'bg-status-pending' },
  { id: 'in_progress', label: 'Em Progresso', color: 'bg-status-progress' },
  { id: 'blocked', label: 'Bloqueado', color: 'bg-status-blocked' },
  { id: 'completed', label: 'Concluído', color: 'bg-status-completed' },
];

const triggerConfetti = () => {
  // Burst from the center-right area
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.7, y: 0.6 },
    colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
    ticks: 200,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
  });

  // Second burst slightly delayed
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      origin: { x: 0.8, y: 0.5 },
      colors: ['#22c55e', '#16a34a', '#4ade80', '#fbbf24'],
      ticks: 150,
      gravity: 1,
      decay: 0.92,
      startVelocity: 25,
    });
  }, 150);
};

export function KanbanBoard({ tasks, onEditTask }: KanbanBoardProps) {
  const { updateTask } = useTasksData();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Add visual feedback during drag
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) return;

    // Determine the target status from the droppable ID
    let newStatus: TaskStatus | null = null;

    // Check if dropped on a column
    if (statusConfig.some((s) => s.id === over.id)) {
      newStatus = over.id as TaskStatus;
    } else {
      // Dropped on another task - find which column it belongs to
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && newStatus !== task.status) {
      try {
        await updateTask({
          id: taskId,
          updates: { 
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          },
        });
        
        const statusLabels = {
          pending: 'Pendente',
          in_progress: 'Em Progresso',
          blocked: 'Bloqueado',
          completed: 'Concluído',
        };
        
        // Trigger confetti when moved to completed
        if (newStatus === 'completed') {
          triggerConfetti();
          toast.success('🎉 Tarefa concluída!');
        } else {
          toast.success(`Tarefa movida para "${statusLabels[newStatus]}"`);
        }
      } catch (error) {
        toast.error('Erro ao mover tarefa');
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full" style={{ width: 'max-content' }}>
        {statusConfig.map((status) => {
          const columnTasks = getTasksByStatus(status.id);
          return (
            <KanbanColumn
              key={status.id}
              id={status.id}
              title={status.label}
              color={status.color}
              count={columnTasks.length}
            >
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                    />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-3 scale-105">
            <KanbanTaskCard task={activeTask} onEdit={() => {}} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
