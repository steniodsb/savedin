import { useState, useEffect, useMemo } from 'react';

interface GradientColors {
  color1: string;
  color2: string;
  color3: string | null;
  allColors: string[];
  contrastColor: 'white' | 'black';
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Calculate relative luminance (WCAG formula)
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Determine if white or black provides better contrast
function getContrastColor(colors: string[]): 'white' | 'black' {
  let totalLuminance = 0;
  let validColors = 0;

  for (const color of colors) {
    const rgb = hexToRgb(color);
    if (rgb) {
      totalLuminance += getLuminance(rgb.r, rgb.g, rgb.b);
      validColors++;
    }
  }

  if (validColors === 0) return 'white';
  
  const avgLuminance = totalLuminance / validColors;
  // If average luminance > 0.4, background is light enough to need dark text
  // Otherwise, background is dark, use white text
  return avgLuminance > 0.4 ? 'black' : 'white';
}

// Extract colors from CSS gradient variable or dedicated color variables
export function useGradientColors(): GradientColors {
  const [colors, setColors] = useState<{ color1: string; color2: string; color3: string | null }>({
    color1: '#909090',
    color2: '#ffffff',
    color3: '#909090',
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      
      // Try inline style first (most reliable for dynamically set variables)
      let gradientStart = root.style.getPropertyValue('--gradient-start').trim();
      let gradientMiddle = root.style.getPropertyValue('--gradient-middle').trim();
      let gradientEnd = root.style.getPropertyValue('--gradient-end').trim();
      
      // If not in inline style, try computed style
      if (!gradientStart || !gradientEnd) {
        const computedStyle = getComputedStyle(root);
        gradientStart = computedStyle.getPropertyValue('--gradient-start').trim();
        gradientMiddle = computedStyle.getPropertyValue('--gradient-middle').trim();
        gradientEnd = computedStyle.getPropertyValue('--gradient-end').trim();
      }
      
      if (gradientStart && gradientEnd) {
        setColors({ 
          color1: gradientStart, 
          color2: gradientMiddle || gradientEnd,
          color3: gradientMiddle ? gradientEnd : null 
        });
        return;
      }
      
      // Fallback: parse the gradient string from inline style
      let gradient = root.style.getPropertyValue('--gradient-primary').trim();
      
      // If not in inline, try computed
      if (!gradient) {
        const computedStyle = getComputedStyle(root);
        gradient = computedStyle.getPropertyValue('--gradient-primary').trim();
      }
      
      if (gradient) {
        const colorMatches = gradient.match(/#[0-9A-Fa-f]{6}/g);
        if (colorMatches && colorMatches.length >= 3) {
          setColors({ 
            color1: colorMatches[0], 
            color2: colorMatches[1],
            color3: colorMatches[colorMatches.length - 1] 
          });
        } else if (colorMatches && colorMatches.length === 2) {
          setColors({ color1: colorMatches[0], color2: colorMatches[1], color3: null });
        } else if (colorMatches && colorMatches.length === 1) {
          setColors({ color1: colorMatches[0], color2: colorMatches[0], color3: null });
        }
      }
    };

    // Initial update - use timeout to ensure CSS is loaded
    const timeoutId = setTimeout(updateColors, 50);
    updateColors();

    // Watch for changes to the CSS variables
    const observer = new MutationObserver(() => {
      updateColors();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    // Also listen for custom theme-changed event
    const handleThemeChanged = () => {
      // Small delay to ensure CSS variables are updated
      setTimeout(updateColors, 10);
    };
    window.addEventListener('theme-changed', handleThemeChanged);
    
    // Listen for storage changes (for gradient updates from settings)
    const handleStorageChange = () => {
      setTimeout(updateColors, 10);
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('theme-changed', handleThemeChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const contrastColor = useMemo(() => {
    const allColorsArray = [colors.color1, colors.color2];
    if (colors.color3) allColorsArray.push(colors.color3);
    return getContrastColor(allColorsArray);
  }, [colors.color1, colors.color2, colors.color3]);

  const allColors = useMemo(() => {
    const arr = [colors.color1, colors.color2];
    if (colors.color3) arr.push(colors.color3);
    return arr;
  }, [colors.color1, colors.color2, colors.color3]);

  return { ...colors, allColors, contrastColor };
}
