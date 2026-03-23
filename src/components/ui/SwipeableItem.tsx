import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
}

export function SwipeableItem({ children, onDelete, disabled = false, className }: SwipeableItemProps) {
  const x = useMotionValue(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device supports touch
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const deleteButtonOpacity = useTransform(x, [-100, -50, 0], [1, 0.7, 0]);
  const deleteButtonScale = useTransform(x, [-100, -50, 0], [1, 0.9, 0.6]);
  const deleteButtonX = useTransform(x, [-100, 0], [0, 50]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged more than 70px to the left, reveal delete button
    if (info.offset.x < -70) {
      x.set(-100);
      setIsRevealed(true);
    } else {
      x.set(0);
      setIsRevealed(false);
    }
  }, [x]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    // Animate exit before deleting
    x.set(-400);
    setTimeout(() => {
      onDelete();
    }, 200);
  }, [onDelete, x]);

  const handleTapOutside = useCallback(() => {
    if (isRevealed) {
      x.set(0);
      setIsRevealed(false);
    }
  }, [isRevealed, x]);

  // If disabled or not mobile, just render children
  if (disabled || !isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence>
      {!isDeleting && (
        <motion.div 
          className={cn("relative overflow-hidden rounded-xl", className)}
          initial={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* Delete button (behind the item) */}
          <motion.div 
            className="absolute right-0 top-0 bottom-0 w-24 bg-destructive flex items-center justify-center rounded-r-xl"
            style={{ 
              opacity: deleteButtonOpacity, 
              scale: deleteButtonScale,
              x: deleteButtonX 
            }}
          >
            <motion.button
              onClick={handleDelete}
              className="w-full h-full flex flex-col items-center justify-center gap-1"
              aria-label="Excluir"
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="h-5 w-5 text-white" />
              <span className="text-[10px] text-white/90 font-medium">Excluir</span>
            </motion.button>
          </motion.div>

          {/* Draggable item */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -100, right: 0 }}
            dragElastic={0.1}
            dragMomentum={false}
            style={{ x }}
            onDragEnd={handleDragEnd}
            onTap={handleTapOutside}
            className="relative bg-background cursor-grab active:cursor-grabbing touch-pan-y"
            whileTap={{ cursor: 'grabbing' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
