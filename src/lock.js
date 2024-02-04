export function createLock() {
    let nextLock = undefined;
    let resolves = [];

    return {
        wait: async function() {
            const lock = new Promise(resolve => resolves.push(resolve));

            // TODO: These operations should be atomic.
            const thisLock = nextLock;
            nextLock = lock;
            await thisLock;
        },

        release: function() {
            const resolve = resolves.shift();
            if (resolve !== undefined) {
                resolve();
            }
        }
    }
}
