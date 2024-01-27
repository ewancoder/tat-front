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
        for (const replayEvent of replayEvents) {
            await new Promise(resolve => setTimeout(resolve, replayEvent.wait));
            if (!isReplayingObj[cr]) return;

            if (replayEvent.keyAction === 'Press') {
                processKeyDown({ key: replayEvent.key });
            } else {
                processKeyUp({ key: replayEvent.key });
            }
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
            let prevPerf = 0;
            const replayEvents = events.map(event => {
                const result = {
                    key: getReplayKey(event.key),
                    wait: event.perf - firstPerf - prevPerf,
                    keyAction: event.keyAction
                };
                prevPerf = event.perf - firstPerf;

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
