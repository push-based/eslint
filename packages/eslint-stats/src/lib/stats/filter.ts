export function takeFirst<T extends object>(
  entries: T | T[],
  count: [number, number?] = [10]
): T[] {
  const array = Array.isArray(entries) ? entries : [entries];
  const [limit, childLimit] = count;

  // If this is a file with rules or ruleGroups, also slice the rules
  if ('rules' in array[0] || 'ruleGroups' in array[0]) {
    return array.slice(0, limit).map((entry) => {
      if ('rules' in entry && Array.isArray(entry.rules)) {
        return {
          ...entry,
          rules: childLimit ? entry.rules.slice(0, childLimit) : entry.rules,
        };
      }
      if ('ruleGroups' in entry && entry.ruleGroups instanceof Map) {
        const entries = Array.from(entry.ruleGroups.entries());
        const limitedEntries = childLimit
          ? entries.slice(0, childLimit)
          : entries;
        return {
          ...entry,
          ruleGroups: new Map(limitedEntries),
        };
      }
      return entry;
    });
  }

  return array.slice(0, limit);
}
