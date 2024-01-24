import { initializeTypingState } from "./typing.js";

window.signin = async function(response) {
    auth.token = response.credential;
    document.getElementById('authentication').classList.add('hidden');
    showTextInputArea();
};

let isReplaying = false;
let replayEvents = undefined;
window.submitText = async function submitText() {
    if (inputElement.value === '') return;

    const text = await getNextText();
    inputAreaElement.classList.add('hidden');
    typingState.prepareText(text, textElement);

    isReplaying = false;
    replayEvents = undefined;
    document.addEventListener('keydown', processKeyDown);
    document.addEventListener('keyup', processKeyUp);
}

async function uploadResults(results) {
    await fetch('http://localhost:5000/api/typing', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(results)
    });
}

function showTextInputArea() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');
}

// Authentication token is saved here after authenticating.
const auth = {};

// Element where the text that you're typing is drawn.
const textElement = document.getElementById('text');
const inputAreaElement = document.getElementById('input-area');
const inputElement = document.getElementById('input');

const typingState = initializeTypingState(textElement, async data => {
    if (!isReplaying) {
        uploadResults(data)
        showTextInputArea();
    }

    isReplaying = true;
    document.removeEventListener('keydown', processKeyDown);
    document.removeEventListener('keyup', processKeyUp);
    typingState.prepareText(data.text);

    if (replayEvents === undefined) {
        const firstPerf = data.events[0].perf;
        let prevPerf = 0;
        replayEvents = data.events.map(event => {
            const result = {
                key: getReplayKey(event.key),
                wait: event.perf - firstPerf - prevPerf,
                keyAction: event.keyAction
            };
            prevPerf = event.perf - firstPerf;

            return result;
        });
    }

    // Show replay.
    for (const replayEvent of replayEvents) {
        await new Promise(resolve => setTimeout(resolve, replayEvent.wait));
        if (!isReplaying) return;

        if (replayEvent.keyAction === 'Press') {
            processKeyDown({ key: replayEvent.key });
        } else {
            processKeyUp({ key: replayEvent.key });
        }
    }
});

function getReplayKey(key) {
    if (key === 'LShift' || key === 'RShift') {
        return 'Shift';
    }

    return key;
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

function getNextText() {
    //return 'Sample text that you need to type.';

    return inputElement.value;
}