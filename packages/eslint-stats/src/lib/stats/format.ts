import ansis from 'ansis';
import path from 'path';
import { scaleLinear, scaleSequential } from 'd3-scale';
import {
  interpolateBlues,
  interpolateOranges,
  interpolateReds,
} from 'd3-scale-chromatic';
import { color, RGBColor } from 'd3-color';
import { format } from 'd3-format';

function hexToRgb(hex: string): [number, number, number] {
  const c = color(hex) as RGBColor;
  return [c.r, c.g, c.b];
}

// build our "mid-tone" scales by clamping the domain to [0.3, 0.8]
function makeMidToneScale(
  interpolator: (t: number) => string,
  range: [number, number] = [0.3, 0.8]
) {
  // map [0–1] → [0.3–0.8] then feed into your interpolator
  const clampStep = scaleLinear().domain([0, 1]).range(range).clamp(true);
  const seq = scaleSequential(interpolator);
  return (value: number, max: number) => {
    const ratio = max > 0 ? value / max : 0;
    return seq(clampStep(ratio)) as string;
  };
}

const blueSolid = makeMidToneScale(interpolateBlues);
const redSolid = makeMidToneScale(interpolateReds);
const yellowSolid = makeMidToneScale(interpolateOranges, [0.2, 0.6]);

type ColorScale = (v: number, m: number) => string;

function makeFormatter(
  textFmt: (v: number) => string,
  zeroFmt: (s: string) => string,
  maxFmt: (s: string) => string,
  colorScale: ColorScale
) {
  return (value: number, max: number) => {
    const txt = textFmt(value);
    if (value === 0) return zeroFmt(txt);
    if (value === max) return maxFmt(txt);
    const hex = colorScale(value, max);
    const [r, g, b] = hexToRgb(hex);
    return ansis.rgb(r, g, b)(txt);
  };
}

const fmt2 = format('.2f'); // e.g. "123.45"
const fmt1p = format('.1%'); // e.g. "12.3%"

const fmtTime = makeFormatter(
  (v) => `${fmt2(v)} ms`,
  ansis.dim.gray,
  ansis.bold.blue,
  blueSolid
);
const fmtPercent = makeFormatter(
  (v) => fmt1p(v / 100),
  ansis.dim.gray,
  ansis.bold.blue,
  blueSolid
);
const fmtErrors = makeFormatter(
  (v) => v.toString(),
  ansis.dim.gray,
  ansis.bold.red,
  redSolid
);
const fmtWarnings = makeFormatter(
  (v) => v.toString(),
  ansis.dim.gray,
  ansis.bold.yellow,
  yellowSolid
);

/**
 * Formats a file path with colored directory and filename
 * @param filePath The full file path to format
 * @returns Formatted string with gray directory and green filename
 */
export function formatFilePath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);
  const dirname = path.dirname(relativePath);
  const basename = path.basename(relativePath);

  const maxDirLength = 20;
  let truncatedDir = dirname;

  if (dirname.length > maxDirLength) {
    const segments = dirname.split(path.sep);
    if (segments.length > 1) {
      truncatedDir = '...' + path.sep + segments[segments.length - 1];
    } else {
      truncatedDir = '...' + dirname.slice(-maxDirLength);
    }
  }

  return dirname === '.'
    ? ansis.green(basename)
    : `${ansis.dim.gray(truncatedDir)}${path.sep}${ansis.green(basename)}`;
}

/**
 * Formats a rule ID with colored stats
 * @param ruleId The rule ID to format
 * @returns Formatted string with colored rule ID and stats
 */
export function formatRuleId(ruleId: string): string {
  if (!ruleId.includes('/')) {
    return ansis.cyan(ruleId);
  }
  const [plugin, rule] = ruleId.split('/');
  return `${ansis.dim.gray(plugin + '/')}${ansis.cyan(rule)}`;
}

export function formatTimeColored(time: number, maxTime: number): string {
  return fmtTime(time, maxTime);
}

export function formatPercentageColored(
  percentage: number,
  maxPercentage: number
): string {
  return fmtPercent(percentage, maxPercentage);
}

export function formatErrorCount(errors: number, maxErrors: number): string {
  return fmtErrors(errors, maxErrors);
}

export function formatWarningCount(
  warnings: number,
  maxWarnings: number
): string {
  return fmtWarnings(warnings, maxWarnings);
}
