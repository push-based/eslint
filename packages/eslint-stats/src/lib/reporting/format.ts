import { ProcessedFile, ProcessedRule } from '../parse/eslint-result-visitor';
import ansis from 'ansis';

// Make all primitive values strings
// do not turn arrays into strings
export type Stringify<T> = {
  [K in keyof T]: T[K] extends (infer U)[]
    ? T[K]
    : T[K] extends object
    ? T[K]
    : string;
};

// String versions of the input types
export type StringifiedProcessedFileResult = Stringify<ProcessedFile>;
export type StringifiedProcessedRuleResult = Stringify<ProcessedRule>;

// Color utilities
export const colors = {
  blue: ansis.blue,
  yellow: ansis.yellow,
  gray: ansis.blue,
  magenta: ansis.magenta,
  red: ansis.red,
  dim: ansis.dim,
  bold: ansis.bold,
};

function getTimeColor(timeRatio: number) {
  if (timeRatio > 0.5) {
    return ansis.hex('#FFFFFF'); // Bright white for highest usage
  } else if (timeRatio > 0.1) {
    return ansis.hex('#BBBBBB'); // Light gray
  } else if (timeRatio > 0.01) {
    return ansis.hex('#777777'); // Medium gray
  } else if (timeRatio > 0) {
    return ansis.hex('#444444'); // Dark gray for low usage
  } else {
    return ansis.dim.hex('#222222'); // Very dim very dark gray for zero values
  }
}

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
  const common = firstPath.substring(0, i);
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
  processedEntries: (ProcessedFile | ProcessedRule)[]
) {
  const fileIdentifiers: string[] = [];

  const isFileIdentifier = (identifier: string): boolean =>
    identifier.includes('/') && identifier.includes('.');

  function collectFileIdentifiers(entries: (ProcessedFile | ProcessedRule)[]) {
    for (const entry of entries) {
      const identifier = 'filePath' in entry ? entry.filePath : entry.ruleId;
      if (isFileIdentifier(identifier)) {
        fileIdentifiers.push(identifier);
      }
      if ('rules' in entry && entry.rules) {
        collectFileIdentifiers(entry.rules);
      }
    }
  }

  collectFileIdentifiers(processedEntries);
  const commonBasePath = findCommonBasePath(fileIdentifiers);

  return (entry: ProcessedFile | ProcessedRule): string => {
    const identifier = 'filePath' in entry ? entry.filePath : entry.ruleId;
    const isFileLike = isFileIdentifier(identifier) || 'rules' in entry;

    if (isFileLike) {
      return shortenPath(identifier, commonBasePath);
    }
    return identifier;
  };
}
