import confetti from 'canvas-confetti';
import { useCallback } from 'react';

export function useCelebration() {
  const celebrateCompletion = useCallback((event?: React.MouseEvent | { clientX: number; clientY: number }) => {
    // Get origin from click event or use center of screen
    const x = event ? event.clientX / window.innerWidth : 0.5;
    const y = event ? event.clientY / window.innerHeight : 0.5;

    // Fire confetti from the click position
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x, y },
      colors: ['#8b5cf6', '#6366f1', '#22c55e', '#f59e0b', '#ec4899'],
      disableForReducedMotion: true,
      scalar: 0.8,
      gravity: 1.2,
      ticks: 150,
    });
  }, []);

  const celebrateStreak = useCallback((streak: number) => {
    // Special celebrations for milestone streaks
    const isMilestone = [7, 14, 21, 30, 50, 100, 365].includes(streak);
    
    if (isMilestone) {
      // Big celebration for milestones
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff6b35', '#f7931e', '#ffcc02', '#ef4444'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ff6b35', '#f7931e', '#ffcc02', '#ef4444'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, []);

  const celebrateRoutineComplete = useCallback(() => {
    // Special celebration for completing a routine
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      disableForReducedMotion: true,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#8b5cf6', '#6366f1'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#22c55e', '#10b981'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#f59e0b', '#fbbf24'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#ec4899', '#f472b6'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#06b6d4', '#22d3ee'],
    });
  }, []);

  return {
    celebrateCompletion,
    celebrateStreak,
    celebrateRoutineComplete,
  };
}
