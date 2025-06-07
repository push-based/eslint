import { ProcessedTimeEntry } from '../models/eslint-stats.schema';

export type FormattedDisplayEntry = {
  identifier: string;
  timeMs: string;
  rawTimeMs: number;
  relativePercent: string;
  warningCount: string;
  errorCount: string;
  fixable: boolean;
  manuallyFixable: boolean;
  children?: FormattedDisplayEntry[];
};

function findCommonBasePath(paths: string[]): string {
  if (!paths || paths.length <= 1) {
    return '';
  }
  const sortedPaths = [...paths].sort();
  const firstPath = sortedPaths[0];
  const lastPath = sortedPaths[sortedPaths.length - 1];
  let i = 0;
  while (
    i < firstPath.length &&
    i < lastPath.length &&
    firstPath[i] === lastPath[i]
  ) {
    i++;
  }
  let common = firstPath.substring(0, i);
  const lastSlash = common.lastIndexOf('/');
  if (lastSlash > -1) {
    // Includes the slash
    return common.substring(0, lastSlash + 1);
  }
  return '';
}

export function shortenPath(
  fullPath: string,
  commonBasePath: string,
  maxLength = 50
): string {
  const path = fullPath.startsWith(commonBasePath)
    ? fullPath.substring(commonBasePath.length)
    : fullPath;

  if (path.length <= maxLength) {
    return path;
  }

  const separator = '/';
  const parts = path.split(separator);
  if (parts.length === 1) {
    // It's just a long filename, so truncate it
    return '...' + path.slice(path.length - maxLength + 3);
  }

  const fileName = parts.pop() || '';

  if (fileName.length >= maxLength) {
    return '...' + fileName.slice(fileName.length - maxLength + 3);
  }

  let shortPath = fileName;

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (shortPath.length + part.length + 2 > maxLength) {
      // +2 for '/...'
      shortPath = '...' + separator + shortPath;
      return shortPath;
    }
    shortPath = part + separator + shortPath;
  }

  return shortPath;
}

export function createIdentifierFormatter(
  processedEntries: ProcessedTimeEntry[]
) {
  const fileIdentifiers: string[] = [];

  const isFileIdentifier = (identifier: string): boolean =>
    identifier.includes('/') && identifier.includes('.');

  function collectFileIdentifiers(entries: ProcessedTimeEntry[]) {
    for (const entry of entries) {
      if (isFileIdentifier(entry.identifier)) {
        fileIdentifiers.push(entry.identifier);
      }
      if (entry.children) {
        collectFileIdentifiers(entry.children);
      }
    }
  }

  collectFileIdentifiers(processedEntries);
  const commonBasePath = findCommonBasePath(fileIdentifiers);

  return (entry: ProcessedTimeEntry): string => {
    // from user edit
    const isFileLike = isFileIdentifier(entry.identifier) || !!entry.children;

    if (isFileLike) {
      return shortenPath(entry.identifier, commonBasePath);
    }
    return entry.identifier;
  };
}

export function formatDuration(duration: number, granularity = 2): string {
  if (duration < 1000) {
    return `${duration.toFixed(granularity)} ms`;
  }
  return `${(duration / 1000).toFixed(2)} s`;
}

export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

function formatWarningError(entry: ProcessedTimeEntry) {
  const {
    warningCount,
    errorCount,
    fixable = false,
    manuallyFixable = false,
  } = entry;
  const fixableIcon = fixable ? ' 🔧' : '';
  const manuallyFixableIcon = manuallyFixable ? ' 💡' : '';
  const icons = `${fixableIcon}${manuallyFixableIcon}`;

  const formattedWarningCount =
    warningCount && warningCount !== 0 ? `${warningCount}${icons}` : '';
  const formattedErrorCount =
    errorCount && errorCount !== 0 ? `${errorCount}${icons}` : '';

  return {
    warningCount: formattedWarningCount,
    errorCount: formattedErrorCount,
  };
}

export function formatAggregatedTimesForDisplay(
  processedEntries: ProcessedTimeEntry[]
): FormattedDisplayEntry[] {
  function findMaxDigits(entries: ProcessedTimeEntry[]) {
    for (const entry of entries) {
      if (entry.children) {
        findMaxDigits(entry.children);
      }
    }
  }
  findMaxDigits(processedEntries);

  const formatIdentifier = createIdentifierFormatter(processedEntries);

  function formatEntryRecursive(
    entry: ProcessedTimeEntry
  ): FormattedDisplayEntry {
    if (entry.identifier === '...') {
      return {
        identifier: '...',
        timeMs: '',
        rawTimeMs: 0,
        relativePercent: '',
        warningCount: '',
        errorCount: '',
        fixable: false,
        manuallyFixable: false,
      };
    }

    const formattedChildren = entry.children
      ? (entry.children as ProcessedTimeEntry[]).map(formatEntryRecursive)
      : undefined;

    const identifier = formatIdentifier(entry);

    const { warningCount, errorCount } = formatWarningError(entry);

    return {
      identifier,
      timeMs: formatDuration(entry.timeMs),
      rawTimeMs: entry.timeMs,
      relativePercent:
        entry.relativePercent === -1
          ? 'N/A'
          : formatPercentage(entry.relativePercent),
      warningCount,
      errorCount,
      fixable: entry.fixable || false,
      manuallyFixable: entry.manuallyFixable || false,
      ...(formattedChildren && { children: formattedChildren }),
    };
  }

  return processedEntries.map(formatEntryRecursive);
}
