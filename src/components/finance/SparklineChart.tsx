import { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
  className?: string;
}

/**
 * Minimal sparkline chart — no axes, no labels, just a trend line.
 * Pass an array of numbers and it renders an SVG line chart.
 */
export function SparklineChart({
  data,
  width = 80,
  height = 30,
  color = 'currentColor',
  strokeWidth = 1.5,
  showArea = true,
  className = '',
}: SparklineChartProps) {
  const path = useMemo(() => {
    if (!data.length) return { line: '', area: '' };

    const values = data.length === 1 ? [data[0], data[0]] : data;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = values.map((v, i) => ({
      x: padding + (i / (values.length - 1)) * w,
      y: padding + h - ((v - min) / range) * h,
    }));

    // Smooth curve using cubic bezier
    let line = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      line += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }

    // Area path (close to bottom)
    const area = `${line} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

    return { line, area };
  }, [data, width, height]);

  if (!data.length) return null;

  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0;
  const trendColor = color !== 'currentColor' ? color : trend >= 0 ? '#22c55e' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
    >
      {showArea && path.area && (
        <path
          d={path.area}
          fill={trendColor}
          opacity={0.1}
        />
      )}
      {path.line && (
        <path
          d={path.line}
          stroke={trendColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
}
