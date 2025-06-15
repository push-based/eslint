import ansis from 'ansis';
import { scaleLinear, scaleSequential } from 'd3-scale';
import {
  interpolateBlues,
  interpolateOranges,
  interpolateReds,
} from 'd3-scale-chromatic';
import { RGBColor, color as d3color } from 'd3-color';
import { format } from 'd3-format';

// =============================================================================
// TYPES
// =============================================================================

export type ColorScale = (value: number, max: number) => RGBColor;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build "mid-tone" scales by clamping the domain to avoid extreme light/dark colors
 * Returns RGBColor directly to avoid redundant hex parsing
 */
function clampedScale(
  interpolator: (t: number) => string,
  range: [number, number] = [0.3, 0.8]
): ColorScale {
  const clamp = scaleLinear().domain([0, 1]).range(range).clamp(true);
  const seq = scaleSequential(interpolator);
  return (value, max) => {
    const ratio = max > 0 ? value / max : 0;
    const hex = seq(clamp(ratio));
    return d3color(hex) as RGBColor;
  };
}

/**
 * Apply RGB color directly from RGBColor object
 */
export function applyRgb(c: RGBColor, text: string): string {
  return ansis.rgb(c.r, c.g, c.b)(text);
}

// =============================================================================
// SCALES - Built once and reused
// =============================================================================

const scales = {
  timeScale: clampedScale(interpolateBlues),
  errorScale: clampedScale(interpolateReds),
  warnScale: clampedScale(interpolateOranges, [0.2, 0.6]),
};

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

const fmt2 = format('.2f'); // e.g. "123.45"
const fmt1p = format('.1%'); // e.g. "12.3%"

// General text formatters
const text = {
  dim: ansis.dim.gray,
  file: ansis.green,
  rule: ansis.cyan,
  border: ansis.dim.gray,
};

// Icons used throughout the application
const icons = {
  total: '📊',
  file: '📁',
  rule: '⚙️',
  time: '⚡',
  error: '🚨',
  warning: '⚠️',
  fixable: '🔧',
} as const;

// Metric formatters configuration
const metricConfig = {
  timeFmt: {
    text: (v: number) => `${fmt2(v)} ms`,
    zero: text.dim,
    max: ansis.bold.blue,
    scale: scales.timeScale,
  },
  pctFmt: {
    text: (v: number) => fmt1p(v / 100),
    zero: text.dim,
    max: ansis.bold.blue,
    scale: scales.timeScale,
  },
  errFmt: {
    text: (v: number) => v.toString(),
    zero: text.dim,
    max: ansis.bold.red,
    scale: scales.errorScale,
  },
  warnFmt: {
    text: (v: number) => v.toString(),
    zero: text.dim,
    max: ansis.bold.yellow,
    scale: scales.warnScale,
  },
} as const;

// Generate all metric formatters in one pass
const fmt = Object.fromEntries(
  (Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((key) => {
    const { text: textFn, zero, max, scale } = metricConfig[key];
    return [
      key,
      (value: number, maxValue: number) => {
        const formattedText = textFn(value);
        if (value === 0) return zero(formattedText);
        if (value === maxValue) return max(formattedText);
        const rgbColor = scale(value, maxValue);
        return applyRgb(rgbColor, formattedText);
      },
    ];
  })
) as Record<keyof typeof metricConfig, (value: number, max: number) => string>;

// =============================================================================
// MAIN THEME EXPORT
// =============================================================================

export const theme = {
  text,
  icons,
  fmt,
  scales,
} as const;

export default theme;
