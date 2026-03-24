import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useMemo, useEffect, useState, useRef } from 'react';
import { getVisualEffectsEnabled } from '@/hooks/useVisualEffects';

interface GlowBackgroundProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  children?: React.ReactNode;
}

function extractColorsFromGradient(gradient: string): string[] {
  const colors: string[] = [];
  const hexMatches = gradient.match(/#[0-9A-Fa-f]{6}/g);
  if (hexMatches) colors.push(...hexMatches);
  const rgbMatches = gradient.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) colors.push(...rgbMatches);
  if (colors.length === 0) return ['#3B82F6', '#06B6D4'];
  return colors;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #909090 0%, #ffffff 50%, #909090 100%)';

// Generate stable particle positions (deterministic, not random on every render)
function generateParticles(count: number, seed: number = 42) {
  const particles = [];
  let s = seed;
  const next = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    particles.push({
      x: next() * 100,
      y: next() * 100,
      size: 1 + next() * 2.5,
      opacity: 0.15 + next() * 0.4,
      delay: next() * 8,
      duration: 4 + next() * 6,
    });
  }
  return particles;
}

const PARTICLES = generateParticles(30);

export function GlowBackground({
  className,
  intensity = 'medium',
  children
}: GlowBackgroundProps) {
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(() => getVisualEffectsEnabled());
  const theme = useTheme();
  const accentGradient = theme?.accentGradient || DEFAULT_GRADIENT;
  const mode = theme?.mode || 'system';

  useEffect(() => {
    const handler = (e: CustomEvent<{ enabled: boolean }>) => setVisualEffectsEnabled(e.detail.enabled);
    window.addEventListener('savedin_visual_effects_change', handler as EventListener);
    return () => window.removeEventListener('savedin_visual_effects_change', handler as EventListener);
  }, []);

  const colors = useMemo(() => extractColorsFromGradient(accentGradient), [accentGradient]);
  const primaryColor = colors[0] || '#3B82F6';
  const secondaryColor = colors[1] || colors[0] || '#06B6D4';

  const isDark = mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const opacityScale = {
    low: isDark ? 0.08 : 0.04,
    medium: isDark ? 0.12 : 0.06,
    high: isDark ? 0.18 : 0.09,
  }[intensity];

  const particleOpacity = isDark ? 0.5 : 0.25;

  const renderEffects = () => {
    if (!visualEffectsEnabled) return null;

    return (
      <>
        {/* ═══ Main Spotlight — Top center, casting downward ═══ */}
        <div
          className="fixed pointer-events-none"
          style={{
            top: '-30%',
            left: '10%',
            width: '80%',
            height: '80%',
            background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${hexToRgba(primaryColor, opacityScale * 2.5)}, ${hexToRgba(primaryColor, opacityScale * 0.5)} 50%, transparent 80%)`,
            zIndex: 0,
          }}
        />

        {/* ═══ Light Rays — Diagonal beams from top-right ═══ */}
        <div
          className="fixed pointer-events-none animate-glow-float-slow"
          style={{
            top: '-20%',
            right: '-10%',
            width: '70%',
            height: '70%',
            background: `conic-gradient(from 220deg at 80% 10%, ${hexToRgba(secondaryColor, opacityScale * 1.8)} 0deg, transparent 25deg, ${hexToRgba(primaryColor, opacityScale * 1.2)} 35deg, transparent 55deg, ${hexToRgba(secondaryColor, opacityScale * 0.8)} 70deg, transparent 90deg)`,
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />

        {/* ═══ Ground Reflection — Subtle bottom glow ═══ */}
        <div
          className="fixed pointer-events-none"
          style={{
            bottom: '-5%',
            left: '15%',
            width: '70%',
            height: '25%',
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${hexToRgba(primaryColor, opacityScale * 1.2)}, transparent 70%)`,
            filter: 'blur(30px)',
            zIndex: 0,
          }}
        />

        {/* ═══ Ambient Haze — Very subtle overall atmosphere ═══ */}
        <div
          className="fixed pointer-events-none animate-glow-float"
          style={{
            top: '20%',
            left: '-10%',
            width: '50%',
            height: '60%',
            background: `radial-gradient(circle at 30% 40%, ${hexToRgba(secondaryColor, opacityScale * 0.6)}, transparent 60%)`,
            filter: 'blur(80px)',
            zIndex: 0,
          }}
        />

        {/* ═══ Floating Particles ═══ */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {PARTICLES.map((p, i) => (
            <circle
              key={i}
              cx={`${p.x}%`}
              cy={`${p.y}%`}
              r={p.size}
              fill={i % 3 === 0 ? primaryColor : secondaryColor}
              opacity={p.opacity * particleOpacity}
            >
              <animate
                attributeName="opacity"
                values={`${p.opacity * particleOpacity * 0.3};${p.opacity * particleOpacity};${p.opacity * particleOpacity * 0.3}`}
                dur={`${p.duration}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${p.y}%;${p.y - 1.5}%;${p.y}%`}
                dur={`${p.duration * 1.3}s`}
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </>
    );
  };

  if (children) {
    return (
      <div className={cn("relative min-h-screen overflow-hidden", className)}>
        {renderEffects()}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return renderEffects();
}
