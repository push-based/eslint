import { extent } from 'd3-array';
import { scaleQuantize } from 'd3-scale';

const TICKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
type ColorFn = (s: string) => string;

export interface SparkOptions {
  min?: number;
  max?: number;
  colors?: ColorFn[];
}

/**
 * A "D3-style" sparkline: uses a quantize scale
 * to map each datum into one of our tick characters.
 */
export function asciiSparkline(
  data: number[],
  { min: explicitMin, max: explicitMax, colors = [] }: SparkOptions = {}
): string {
  if (data.length === 0) return '';

  const [dmin, dmax] = extent(data) as [number, number];
  const lo = explicitMin ?? dmin;
  const hi = explicitMax ?? dmax;
  const domain = lo === hi ? [lo - 1, hi + 1] : [lo, hi];

  const tickScale = scaleQuantize<string>().domain(domain).range(TICKS);

  return data
    .map((v, i) => {
      const tick = tickScale(v);
      if (colors[i]) return colors[i](tick);
      // if you passed fewer colors than data, reuse last one
      if (colors.length > 0) {
        const fn = colors[Math.min(i, colors.length - 1)];
        return fn(tick);
      }
      return tick;
    })
    .join('');
}
