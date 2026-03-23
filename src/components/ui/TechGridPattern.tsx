import { useGradientColors } from '@/hooks/useGradientColors';

interface TechGridPatternProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: number;
  opacity?: number;
}

/**
 * Decorative tech grid pattern overlay for cards.
 * Uses the accent/gradient color. Place inside a card with `relative overflow-hidden`.
 */
export function TechGridPattern({
  className = '',
  position = 'top-right',
  size = 120,
  opacity = 0.15,
}: TechGridPatternProps) {
  const { color1, color2 } = useGradientColors();
  const color = color1;

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: -size * 0.15, right: -size * 0.15 },
    'top-left': { top: -size * 0.15, left: -size * 0.15 },
    'bottom-right': { bottom: -size * 0.15, right: -size * 0.15 },
    'bottom-left': { bottom: -size * 0.15, left: -size * 0.15 },
  };

  const gridSize = 16;
  const dotSize = 1.5;
  const lines = Math.floor(size / gridSize);

  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{
        ...positionStyles[position],
        width: size,
        height: size,
        opacity,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid dots */}
        {Array.from({ length: lines + 1 }, (_, row) =>
          Array.from({ length: lines + 1 }, (_, col) => {
            const x = col * gridSize;
            const y = row * gridSize;
            // Fade out towards the inner corner based on position
            let distanceFactor = 1;
            if (position === 'top-right') distanceFactor = (x + (size - y)) / (size * 2);
            if (position === 'top-left') distanceFactor = ((size - x) + (size - y)) / (size * 2);
            if (position === 'bottom-right') distanceFactor = (x + y) / (size * 2);
            if (position === 'bottom-left') distanceFactor = ((size - x) + y) / (size * 2);

            return (
              <circle
                key={`dot-${row}-${col}`}
                cx={x}
                cy={y}
                r={dotSize}
                fill={color}
                opacity={Math.max(0, distanceFactor * 0.8)}
              />
            );
          })
        )}

        {/* Grid lines - horizontal */}
        {Array.from({ length: lines + 1 }, (_, i) => {
          const y = i * gridSize;
          return (
            <line
              key={`h-${i}`}
              x1={0}
              y1={y}
              x2={size}
              y2={y}
              stroke={color}
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Grid lines - vertical */}
        {Array.from({ length: lines + 1 }, (_, i) => {
          const x = i * gridSize;
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={size}
              stroke={color}
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Accent corner bracket lines */}
        {position === 'top-right' && (
          <>
            <line x1={size - 40} y1={2} x2={size - 2} y2={2} stroke={color} strokeWidth={2} opacity={0.6} />
            <line x1={size - 2} y1={2} x2={size - 2} y2={40} stroke={color} strokeWidth={2} opacity={0.6} />
          </>
        )}
        {position === 'top-left' && (
          <>
            <line x1={2} y1={2} x2={40} y2={2} stroke={color} strokeWidth={2} opacity={0.6} />
            <line x1={2} y1={2} x2={2} y2={40} stroke={color} strokeWidth={2} opacity={0.6} />
          </>
        )}
        {position === 'bottom-right' && (
          <>
            <line x1={size - 40} y1={size - 2} x2={size - 2} y2={size - 2} stroke={color} strokeWidth={2} opacity={0.6} />
            <line x1={size - 2} y1={size - 40} x2={size - 2} y2={size - 2} stroke={color} strokeWidth={2} opacity={0.6} />
          </>
        )}
        {position === 'bottom-left' && (
          <>
            <line x1={2} y1={size - 2} x2={40} y2={size - 2} stroke={color} strokeWidth={2} opacity={0.6} />
            <line x1={2} y1={size - 40} x2={2} y2={size - 2} stroke={color} strokeWidth={2} opacity={0.6} />
          </>
        )}

        {/* Radial fade mask */}
        <defs>
          <radialGradient id={`fade-${position}`} cx={position.includes('right') ? '100%' : '0%'} cy={position.includes('bottom') ? '100%' : '0%'} r="100%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={`mask-${position}`}>
            <rect width={size} height={size} fill={`url(#fade-${position})`} />
          </mask>
        </defs>
      </svg>
    </div>
  );
}
