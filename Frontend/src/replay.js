export function createReplay(typingState) {
    let currentlyReplaying = 0;
    const isReplayingObj = {};

    function getReplayKey(key) {
        if (key === 'LShift' || key === 'RShift') {
            return 'Shift';
        }

        return key;
    }

    async function showReplay(cr, replayEvents) {
        const startPerf = performance.now();
        let idx = 0;
        while (idx < replayEvents.length) {
            if (!isReplayingObj[cr]) return;
            const nowPerf = performance.now();
            const replayEvent = replayEvents[idx];

            if (nowPerf - startPerf > replayEvent.wait) {
                if (replayEvent.keyAction === 'Press') {
                    processKeyDown({ key: replayEvent.key });
                } else {
                    processKeyUp({ key: replayEvent.key });
                }

                idx++;
                continue;
            }

            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    function processKeyDown(event) {
        const perf = performance.now();
        const key = getKey(event);

        typingState.pressKey(key, perf);
    }

    function processKeyUp(event) {
        const perf = performance.now();
        const key = getKey(event);

        typingState.releaseKey(key, perf);
    }

    function getKey(event) {
        if (event.code === 'ShiftLeft') return 'LShift';
        if (event.code === 'ShiftRight') return 'RShift';

        if (event.key.length === 1 || event.key === 'Backspace') {
            return event.key;
        }

        return null;
    }

    return {
        replayTypingSession: async function(text, events) {
            // Stop current replay.
            isReplayingObj[currentlyReplaying] = false;

            // Start next simulation.
            currentlyReplaying++;
            isReplayingObj[currentlyReplaying] = true;
            typingState.prepareText(text);

            const firstPerf = events[0].perf;
            const replayEvents = events.map(event => {
                const result = {
                    key: getReplayKey(event.key),
                    wait: event.perf - firstPerf,
                    keyAction: event.keyAction
                };

                return result;
            });

            await showReplay(currentlyReplaying, replayEvents);
        },

        isReplaying: function() {
            return isReplayingObj[currentlyReplaying];
        },

        stop: function() {
            isReplayingObj[currentlyReplaying] = false;
            currentlyReplaying++;
        },

        processKeyDown: processKeyDown,
        processKeyUp: processKeyUp
    };
}
