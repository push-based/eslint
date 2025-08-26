import { dirname } from 'node:path';

function buildEslintCommand({
                                eslintVersion,
                                maxWarnings = 0,
                                patterns,
                                config,
                            }) {
    const eslintCmd = eslintVersion
        ? `npx -y eslint@${eslintVersion}`
        : 'npx eslint';

    return [
        eslintCmd,
        `--config ${config}`,
        ...(maxWarnings ? [`--max-warnings ${maxWarnings}`] : []),
        '--no-error-on-unmatched-pattern',
        '--no-warn-ignored',
        patterns.join(' '),
    ]
        .filter(Boolean)
        .join(' ');
}

const createNodesV2 = [
    '**/project.json',
    async (projectConfigurationFiles, opts = {}, context) => {

        if (!Array.isArray(projectConfigurationFiles) || projectConfigurationFiles.length === 0) {
            return [];
        }

        const {
            patterns = ['.'],
            targetName = 'lint',
            maxWarnings = 0,
            config = 'eslint.config.ts',
            eslintVersion = undefined,
        } = opts;

        const versionedTargetName = eslintVersion
            ? `${targetName}-${eslintVersion.replace(/\./g, '')}`
            : targetName;

        return await Promise.all(
            projectConfigurationFiles.map(async (projectConfigFile) => {
                const projectRoot = dirname(projectConfigFile);
                const result = {
                    projects: {
                        [projectRoot]: {
                            targets: {
                                [versionedTargetName]: {
                                    executor: 'nx:run-commands',
                                    options: {
                                        command: buildEslintCommand({
                                            eslintVersion,
                                            maxWarnings,
                                            config,
                                            patterns
                                        }),
                                    },
                                    metadata: {
                                        description: `Run eslint${eslintVersion ? `@${eslintVersion}` : ''}`,
                                        technologies: ['eslint'],
                                    },
                                    cache: false,
                                },
                            },
                        },
                    },
                };

                return [projectConfigFile, result];
            })
        );
    },
];

const plugin = {
    createNodesV2,
    name: 'eslint-benchmark-target',
}

export default plugin;
