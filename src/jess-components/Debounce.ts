/**
 * Small utility to debounce function execution within this package.
 *
 * Maintains an internal map of timers by `identifier` so successive calls
 * within the given `delay` reset the timer and only the last invocation runs.
 *
 * @module jess-components/debounce
 */
const debounceMap: Record<any, NodeJS.Timeout> = {};

/**
 * Debounces the provided `func` by the specified `delay` using the unique
 * `identifier`. If `delay` is `0` or falsy, `func` runs immediately.
 *
 * @param identifier - Unique key for the debounced action.
 * @param func - Callback to execute after the delay.
 * @param delay - Delay in milliseconds (default: `0`).
 */
export function debounce(identifier: any, func: () => void, delay: number = 0) {
    if (!delay) {
        func();
        return;
    }

    if (debounceMap[identifier]) {
        clearTimeout(debounceMap[identifier]);
    }

    debounceMap[identifier] = setTimeout(() => {
        func();
        delete debounceMap[identifier];
    }, delay);
}