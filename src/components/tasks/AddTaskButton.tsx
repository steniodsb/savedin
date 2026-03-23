import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface AddTaskButtonProps {
  onClick?: () => void;
  label?: string;
}

export function AddTaskButton({ onClick, label = 'Nova tarefa' }: AddTaskButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
        <Plus className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
