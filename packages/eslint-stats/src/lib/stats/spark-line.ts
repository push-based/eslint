
/**
 * Generates a sparkline from an array of numbers.
 * Inspired by https://github.com/holman/spark
 *
 * Example:
 *   sparkline([1, 5, 22, 13, 53]) => '▁▁▃▂█'
 *   sparkline([1, 5, 22, 13, 53], {
 *   min: 0,
 *   max: 100,
 *   colors: [
 *   (str) => `\x1b[32m${str}\x1b[0m`, // green
 *   (str) => ansis.yellow(str), // yellow
 *   (str) => myYellow(str), // red
 *   ],
 *   // }) => '▁▁▃▂█'
 */
const ticks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(
    data: number[],
    options: {
        min?: number;
        max?: number;
        colors?: ((str: string) => string)[];
    } = {}
): string {
    if (!data.length) return '';

    const { min = Math.min(...data), max = Math.max(...data), colors } = options;

    // If all values are equal, return mid-high ticks
    const tickSet = min === max ? [ticks.at(4), ticks.at(5)] : ticks;

    const scale = max - min || 1;
    const steps = tickSet.length - 1;

    return data
        .map((n, dataIndex) => {
            const index = Math.floor(((n - min) / scale) * steps);
            const tick = tickSet[index];

            if (colors && colors.length > 0) {
                const colorIndex = Math.min(dataIndex, colors.length - 1);
                const colorFn = colors[colorIndex];
                return tick ? colorFn(tick) : tick;
            }

            return tick;
        })
        .join('');
}
