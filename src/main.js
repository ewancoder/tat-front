import { initializeTypingState } from './typing.js';
import { config } from './config.js';

// Authentication token is saved here after authenticating.
const auth = window.auth;

// Element where the text that you're typing is drawn.
const textElement = document.getElementById('text');
const inputAreaElement = document.getElementById('input-area');
const inputElement = document.getElementById('input');
const sessionsElement = document.getElementById('sessions');

window.onSignIn = async function() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');

    await reloadTypingSessions();
    sessionsElement.classList.remove('hidden');
}

async function reloadTypingSessions() {
    const sessions = await queryTypingSessions();
    sessionsElement.innerHTML = '';

    // TODO: Make sure new session is added to the list of sessions after a new text has been typed.
    for (const session of sessions) {
        const row = document.createElement('tr');

        const textCol = document.createElement('td');
        textCol.innerHTML = session.text;

        const lengthCol = document.createElement('td');
        lengthCol.innerHTML = `${session.lengthSeconds} seconds`;
        lengthCol.classList.add('length-col');

        const replayCol = document.createElement('td');
        replayCol.innerHTML = '▶';
        replayCol.classList.add('clickable');

        const onClick = function() {
            replayTypingSession(session.id);
        };
        replayCol.onclick = onClick;

        const deleteCol = document.createElement('td');
        const rollbackCol = document.createElement('td');

        deleteCol.innerHTML = '✖';
        deleteCol.classList.add('clickable');

        deleteCol.onclick = async function() {
            await deleteTypingSession(session.id);
            deleteCol.classList.add('hidden');
            rollbackCol.classList.remove('hidden');
            replayCol.onclick = undefined;
            replayCol.classList.remove('clickable');
            replayCol.classList.add('disabled');
        };

        rollbackCol.innerHTML = '⎌';
        rollbackCol.classList.add('clickable');
        rollbackCol.classList.add('hidden');

        rollbackCol.onclick = async function() {
            await rollbackDeletingTypingSession(session.id);
            rollbackCol.classList.add('hidden');
            deleteCol.classList.remove('hidden');
            replayCol.onclick = onClick;
            replayCol.classList.add('clickable');
            replayCol.classList.remove('disabled');
        }

        row.appendChild(textCol);
        row.appendChild(lengthCol);
        row.appendChild(replayCol);
        row.appendChild(deleteCol);
        row.appendChild(rollbackCol);

        sessionsElement.appendChild(row);
    }
}

async function deleteTypingSession(id) {
    // TODO: Add error handling.
    await fetch(`${config.typingApiUrl}/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${auth.token}`
        }
    });
}

async function rollbackDeletingTypingSession(id) {
    // TODO: Add error handling.
    await fetch(`${config.typingApiUrl}/${id}/rollback-archive`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${auth.token}`
        }
    });
}

async function replayTypingSession(typingSessionId) {
    const session = await queryTypingSession(typingSessionId);

    const text = session.text;

    // Stop current replay.
    isReplaying[currentlyReplaying] = false;

    // Start next simulation.
    currentlyReplaying++;
    isReplaying[currentlyReplaying] = true;
    typingState.prepareText(text, textElement);

    // TODO: This code is duplicated in 2 places.
    const firstPerf = session.events[0].perf;
    let prevPerf = 0;
    replayEvents = session.events.map(event => {
        const result = {
            key: getReplayKey(event.key),
            wait: event.perf - firstPerf - prevPerf,
            keyAction: event.keyAction
        };
        prevPerf = event.perf - firstPerf;

        return result;
    });

    await showReplay(currentlyReplaying);
}

async function queryTypingSessions() {
    try {
        const response = await fetch(config.typingApiUrl, {
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        });

        return await response.json();
    }
    catch {
        alertError("Could not get user typing sessions");
    }
}

async function queryTypingSession(id) {
    try {
        const response = await fetch(`${config.typingApiUrl}/${id}`, {
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        });

        return await response.json();
    }
    catch {
        alertError("Could not load user typing session");
    }
}

let currentlyReplaying = 0;
let isReplaying = {};
let replayEvents = undefined;
window.submitText = async function submitText() {
    if (inputElement.value === '') return;

    // If text is too long.
    if (inputElement.value.length > 10000) {
        alertError('Text is too long.');
        return;
    }

    const text = await getNextText();
    inputAreaElement.classList.add('hidden');
    sessionsElement.classList.add('hidden');
    typingState.prepareText(text, textElement);

    isReplaying[currentlyReplaying] = false;
    currentlyReplaying++;

    replayEvents = undefined;
    document.addEventListener('keydown', processKeyDown);
    document.addEventListener('keyup', processKeyUp);
}

async function uploadResults(results) {
    try {
        await fetch(config.typingApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(results)
        });

        alertSuccess("Typing statistics have been saved");
    }
    catch {
        alertError("Failed to upload typing statistics");
        return;
    }

    await reloadTypingSessions();
}

function showControls() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');
    sessionsElement.classList.remove('hidden');
}

function alertSuccess(text) {
    toast(text, 3000, "#7db");
}

function alertError(text) {
    toast(text, 5000, "#d77");
}

function toast(text, duration, background) {
    Toastify({
        text: text,
        duration: duration,
        gravity: "bottom", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        avatar: 'logo.png',
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: background,
            color: "#000",
            fontSize: "1.3rem"
        }
    }).showToast();
}

const typingState = initializeTypingState(textElement, async data => {
    if (!isReplaying[currentlyReplaying]) {
        uploadResults(data); // Intentionally not awaited for faster UI experience.
        showControls();
    }

    currentlyReplaying++;
    isReplaying[currentlyReplaying] = true;
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

    await showReplay(currentlyReplaying);
});

async function showReplay(cr) {
    for (const replayEvent of replayEvents) {
        await new Promise(resolve => setTimeout(resolve, replayEvent.wait));
        if (!isReplaying[cr]) return;

        if (replayEvent.keyAction === 'Press') {
            processKeyDown({ key: replayEvent.key });
        } else {
            processKeyUp({ key: replayEvent.key });
        }
    }
}

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
