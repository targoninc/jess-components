const debounceMap: Record<any, NodeJS.Timeout> = {};

export function debounce(identifier: any, func: () => void, delay = 500) {
    if (debounceMap[identifier]) {
        clearTimeout(debounceMap[identifier]);
    }

    debounceMap[identifier] = setTimeout(() => {
        func();
        delete debounceMap[identifier];
    }, delay);
}