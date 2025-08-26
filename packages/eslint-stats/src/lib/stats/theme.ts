import ansis from 'ansis';
import { scaleLinear, scaleSequential } from 'd3-scale';
import {
  interpolateBlues,
  interpolateReds,
  interpolateYlOrBr,
} from 'd3-scale-chromatic';
import { RGBColor, color as d3color } from 'd3-color';
import { format } from 'd3-format';

export type ColorScale = (value: number, max: number) => RGBColor;

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

export function applyRgb(c: RGBColor, text: string): string {
  return ansis.rgb(c.r, c.g, c.b)(text);
}

function graded(
  value: number,
  max: number,
  text: string,
  zero: (s: string) => string,
  high: (s: string) => string,
  scale: ColorScale
): string {
  if (!value) return zero(text);
  if (value === max) return high(text);
  return applyRgb(scale(value, max), text);
}

const scales = {
  timeScale: clampedScale(interpolateBlues, [0.4, 0.9]),
  errorScale: clampedScale(interpolateReds, [0.4, 0.9]),
  warnScale: clampedScale(interpolateYlOrBr, [0.3, 0.7]),
};

const fmtSI = format('.1s'); // auto SI prefix (ms → s)

function fmtSIPrefix(v: number /* ms */) {
  return fmtSI(v / 1000) + 's';
}

const text = {
  secondary: ansis.dim.gray,
  bold: ansis.bold,
  file: ansis.green,
  rule: ansis.cyan,
  border: ansis.dim.gray,
  header: ansis.bold.dim.gray,
  sectionHeader: ansis.bold.gray,
  label: ansis.yellow,
  value: ansis.bold,
  error: ansis.red,
  warning: ansis.yellow,
  info: ansis.blue,
};

const icons = {
  stats: '📊',
  file: '📄',
  rule: '⚙️',
  time: '⏱',
  error: '🚨',
  warning: '⚠️',
  fixable: '🔧',
} as const;

// Single source of truth for all metrics
const metrics = {
  time: {
    icon: icons.time,
    unit: 's',
    scale: scales.timeScale,
    color: text.info,
    formatter: fmtSIPrefix,
  },
  errors: {
    icon: icons.error,
    unit: '',
    scale: scales.errorScale,
    color: text.error,
    formatter: (v: number) => v.toString(),
  },
  warnings: {
    icon: icons.warning,
    unit: '',
    scale: scales.warnScale,
    color: text.label,
    formatter: (v: number) => v.toString(),
  },
} as const;

// Generate formatters from metrics configuration
const formatters = Object.fromEntries(
  Object.entries(metrics).map(([key, { formatter, scale, color }]) => [
    key,
    (value: number, maxValue: number) => {
      const formattedText = formatter(value);
      return graded(
        value,
        maxValue,
        formattedText,
        text.secondary,
        (s: string) => text.bold(color(s)),
        scale
      );
    },
  ])
) as Record<keyof typeof metrics, (value: number, max: number) => string>;

// =============================================================================
// TYPE SAFETY
// =============================================================================

export interface Theme {
  text: typeof text;
  icons: typeof icons;
  formatters: typeof formatters;
  scales: typeof scales;
  metrics: typeof metrics;
}

// =============================================================================
// MAIN THEME EXPORT
// =============================================================================

export const theme: Theme = {
  text,
  icons,
  formatters,
  scales,
  metrics,
} as const;

export default theme;
