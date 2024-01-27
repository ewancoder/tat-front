import { initializeTypingState } from './typing.js';
import { createReplay } from './replay.js';
import { notifier } from './notifier.js';
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
            replay.replayTypingSession(session.id);
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
        notifier.alertError("Could not get user typing sessions");
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
        notifier.alertError("Could not load user typing session");
    }
}

window.submitText = async function submitText() {
    if (inputElement.value === '') return;

    // If text is too long.
    if (inputElement.value.length > 10000) {
        notifier.alertError('Text is too long.');
        return;
    }

    const text = await getNextText();
    inputAreaElement.classList.add('hidden');
    sessionsElement.classList.add('hidden');
    typingState.prepareText(text);

    replay.stop();
    document.addEventListener('keydown', replay.processKeyDown);
    document.addEventListener('keyup', replay.processKeyUp);
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

        notifier.alertSuccess("Typing statistics have been saved");
    }
    catch {
        notifier.alertError("Failed to upload typing statistics");
        return;
    }

    await reloadTypingSessions();
}

function showControls() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');
    sessionsElement.classList.remove('hidden');
}

const typingState = initializeTypingState(textElement, async data => {
    if (!replay.isReplaying()) {
        uploadResults(data); // Intentionally not awaited for faster UI experience.
        showControls();

        document.removeEventListener('keydown', replay.processKeyDown);
        document.removeEventListener('keyup', replay.processKeyUp);
        replay.replayText(data.text, data.events);
    }
});

const replay = createReplay(config, notifier, typingState);

function getNextText() {
    return inputElement.value;
}
