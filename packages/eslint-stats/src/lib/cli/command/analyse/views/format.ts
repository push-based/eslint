import ansis from 'ansis';
import path from 'path';
import { scaleSequential } from 'd3-scale';
import {
  interpolateBlues,
  interpolateReds
} from 'd3-scale-chromatic';

const blueScale = scaleSequential(interpolateBlues);
const redScale = scaleSequential(interpolateReds);
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
  const [plugin, rule] = ruleId.split('/');
  if (plugin) {
    return `${ansis.dim.gray(plugin + '/')}${ansis.cyan(rule)}`;
  }
  return ansis.cyan(rule);
}

export function formatTimeColored(time: number, maxTime: number): string {
  const formattedTime = `${time.toFixed(2)} ms`;
  if (time === 0) {
    return ansis.dim.gray(formattedTime);
  }
  if (time === maxTime) {
    return ansis.bold.blue(formattedTime);
  }
  blueScale.domain([0, maxTime]);
  const color = blueScale(time) as string;
  const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return ansis.rgb(rgb[0], rgb[1], rgb[2])(formattedTime);
}

export function formatPercentageColored(
  percentage: number,
  maxPercentage: number
): string {
  const formattedPercentage = `${percentage.toFixed(1)}%`;
  if (percentage === 0) {
    return ansis.dim.gray(formattedPercentage);
  }
  if (percentage === maxPercentage) {
    return ansis.bold.blue(formattedPercentage);
  }
  blueScale.domain([0, maxPercentage]);
  const color = blueScale(percentage) as string;
  const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return ansis.rgb(rgb[0], rgb[1], rgb[2])(formattedPercentage);
}

export function formatErrorCount(errors: number, maxErrors: number): string {
  if (errors === 0) {
    return ansis.dim.gray(errors.toString());
  }
  if (errors === maxErrors) {
    return ansis.bold.red(errors.toString());
  }
  redScale.domain([0, maxErrors]);
  const color = redScale(errors) as string;
  const rgb = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return ansis.rgb(rgb[0], rgb[1], rgb[2])(errors.toString());
}

export function formatWarningCount(
  warnings: number,
  maxWarnings: number
): string {
  if (warnings === 0) {
    return ansis.dim.gray(warnings.toString());
  }
  if (warnings === maxWarnings) {
    return ansis.bold.yellow(warnings.toString());
  }
  const intensity = Math.floor((warnings / maxWarnings) * 255);
  return ansis.rgb(intensity, intensity, 0)(warnings.toString());
}
