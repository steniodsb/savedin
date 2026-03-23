import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useMemo, useEffect, useState } from 'react';
import { getVisualEffectsEnabled } from '@/hooks/useVisualEffects';

interface GlowBackgroundProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  spotlight?: boolean;
  children?: React.ReactNode;
}

function parseGradientAngle(gradient: string): number {
  const angleMatch = gradient.match(/(\d+)deg/);
  if (angleMatch) {
    return parseInt(angleMatch[1], 10);
  }
  // Default to 135deg for radial effect
  return 135;
}

function extractColorsFromGradient(gradient: string): string[] {
  const colors: string[] = [];
  
  // Match hex colors
  const hexMatches = gradient.match(/#[0-9A-Fa-f]{6}/g);
  if (hexMatches) {
    colors.push(...hexMatches);
  }
  
  // Match rgb/rgba colors
  const rgbMatches = gradient.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) {
    colors.push(...rgbMatches);
  }
  
  // Match hsl/hsla colors  
  const hslMatches = gradient.match(/hsla?\([^)]+\)/g);
  if (hslMatches) {
    colors.push(...hslMatches);
  }
  
  // Default fallback
  if (colors.length === 0) {
    return ['#06B6D4', '#3B82F6'];
  }
  
  return colors;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #909090 0%, #ffffff 50%, #909090 100%)';

export function GlowBackground({
  className,
  intensity = 'medium',
  spotlight = true,
  children
}: GlowBackgroundProps) {
  // Get visual effects state first (doesn't depend on other hooks)
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(() => getVisualEffectsEnabled());
  
  // Theme hook - safe to call here
  const theme = useTheme();
  const accentGradient = theme?.accentGradient || DEFAULT_GRADIENT;
  const mode = theme?.mode || 'system';
  
  // Listen for visual effects changes
  useEffect(() => {
    const handleVisualEffectsChange = (e: CustomEvent<{ enabled: boolean }>) => {
      setVisualEffectsEnabled(e.detail.enabled);
    };

    window.addEventListener('savedin_visual_effects_change', handleVisualEffectsChange as EventListener);
    return () => {
      window.removeEventListener('savedin_visual_effects_change', handleVisualEffectsChange as EventListener);
    };
  }, []);
  
  const { colors, angle } = useMemo(() => ({
    colors: extractColorsFromGradient(accentGradient),
    angle: parseGradientAngle(accentGradient)
  }), [accentGradient]);
  
  // Reduce opacity: 15% less in dark mode, 30% less in light mode
  const opacityMultiplier = mode === 'light' ? 0.34 : 0.6;

  const intensityConfig = {
    low: { blur: 50, opacity: 0.35 * opacityMultiplier },
    medium: { blur: 60, opacity: 0.45 * opacityMultiplier },
    high: { blur: 70, opacity: 0.56 * opacityMultiplier },
  };
  
  const config = intensityConfig[intensity];

  // Create gradient string for glows
  const gradientColors = colors.join(', ');
  
  // Top glow gradient (angle adjusted for top-left position)
  const topGlowGradient = `linear-gradient(${angle + 45}deg, ${gradientColors}, transparent)`;
  
  // Bottom glow gradient (angle adjusted for bottom-right position, reversed colors)
  const bottomGlowGradient = `linear-gradient(${angle + 225}deg, ${[...colors].reverse().join(', ')}, transparent)`;

  // If there are children, wrap them with the glow effects
  if (children) {
    return (
      <div className={cn("relative min-h-screen overflow-hidden", className)}>
        {/* Glow effects - only render when visual effects are enabled */}
        {visualEffectsEnabled && (
          <>
            {spotlight ? (
              <>
                {/* Spotlight cone — top-left directional */}
                <div
                  className="fixed pointer-events-none animate-glow-float"
                  style={{
                    top: '-15%',
                    left: '5%',
                    width: '55%',
                    height: '70%',
                    background: `conic-gradient(from 200deg at 30% 20%, ${colors[0]}88 0deg, ${colors[1] || colors[0]}44 40deg, transparent 80deg)`,
                    filter: `blur(${config.blur + 20}px)`,
                    opacity: config.opacity * 1.2,
                    zIndex: 0,
                  }}
                />
                {/* Secondary spotlight — bottom-right softer */}
                <div
                  className="fixed pointer-events-none animate-glow-float-delayed"
                  style={{
                    bottom: '-10%',
                    right: '-5%',
                    width: '45%',
                    height: '55%',
                    background: `conic-gradient(from 30deg at 70% 80%, ${colors[colors.length - 1]}66 0deg, ${colors[0]}33 35deg, transparent 70deg)`,
                    filter: `blur(${config.blur + 30}px)`,
                    opacity: config.opacity * 0.8,
                    zIndex: 0,
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className="fixed pointer-events-none animate-glow-float"
                  style={{
                    top: '-10%',
                    left: '-10%',
                    width: '50%',
                    height: '50%',
                    background: topGlowGradient,
                    filter: `blur(${config.blur}px)`,
                    opacity: config.opacity,
                    zIndex: 0,
                  }}
                />
                <div
                  className="fixed pointer-events-none animate-glow-float-delayed"
                  style={{
                    bottom: '-5%',
                    right: '-10%',
                    width: '50%',
                    height: '50%',
                    background: bottomGlowGradient,
                    filter: `blur(${config.blur}px)`,
                    opacity: config.opacity,
                    zIndex: 0,
                  }}
                />
              </>
            )}
          </>
        )}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }

  // Standalone mode - just render glow effects as fixed positioned elements (no layout impact)
  if (!visualEffectsEnabled) {
    return null;
  }

  return (
    <>
      <div
        className="fixed pointer-events-none animate-glow-float"
        style={{
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: topGlowGradient,
          filter: `blur(${config.blur}px)`,
          opacity: config.opacity,
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none animate-glow-float-delayed"
        style={{
          bottom: '-5%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: bottomGlowGradient,
          filter: `blur(${config.blur}px)`,
          opacity: config.opacity,
          zIndex: 0,
        }}
      />
    </>
  );
}
