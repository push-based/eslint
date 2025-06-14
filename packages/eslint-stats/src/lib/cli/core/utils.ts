export function filterCliOptions(
  commandOptions: Record<string, any>
): Record<string, any> {
  const filteredCommandOptions: Record<string, any> = {};
  for (const key in commandOptions) {
    if (Object.prototype.hasOwnProperty.call(commandOptions, key)) {
      // If the key is camelCase and its kebab-case version also exists, skip the camelCase version.
      // This prevents duplicate arguments like --foo-bar and --fooBar when yargs provides both.
      const kebabKey = key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      if (key !== kebabKey && commandOptions[kebabKey] !== undefined) {
        continue;
      }
      filteredCommandOptions[key] = commandOptions[key];
    }
  }
  return filteredCommandOptions;
}

export function getOption<T>(
  argv: Record<string, any>,
  name: string
): T | undefined {
  // when 'name' is in camelCase, it's converted to its kebab-case equivalent for the lookup.
  return argv[name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)];
}
