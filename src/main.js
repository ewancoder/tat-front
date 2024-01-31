import { initializeTypingState } from './typing.js';
import { createReplay } from './replay.js';
import { notifier } from './notifier.js';
import { initializeSessions } from './typing-sessions.js';
import { addAuthCallback } from './auth.js';
import './google-auth.js';

let loggingInFirstTime = true;
const inputAreaElement = document.getElementById('input-area');
// Authentication token is saved here after authenticating.

addAuthCallback(async () => {
    if (loggingInFirstTime) {
        sessions = await initializeSessions(replay, sessionsElement);
        loggingInFirstTime = false;
    }

    // Hacky way to check if typing atm.
    if (!typingState.canType('a')) {
        showControls();
    }
})

// Sessions manager for reviewing and deleting previous sessions.
let sessions = undefined;

// Element where the text that you're typing is drawn.
const textElement = document.getElementById('text');
const inputElement = document.getElementById('input');
const sessionsElement = document.getElementById('sessions');

window.submitText = async function submitText() {
    if (inputElement.value.trim() === '') {
        notifier.alertError('Please enter non-empty text to start.');
        return;
    }

    // If text is too long.
    if (inputElement.value.length > 10000) {
        notifier.alertError('Text is too long.');
        return;
    }

    const text = await getNextText();


    typingState.prepareText(text);

    replay.stop();

    hideControls();
}

function hideControls() {
    inputAreaElement.classList.add('hidden');
    sessions.hide();

    document.addEventListener('keydown', replay.processKeyDown);
    document.addEventListener('keyup', replay.processKeyUp);
}

function showControls() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');
    sessions.show();

    document.removeEventListener('keydown', replay.processKeyDown);
    document.removeEventListener('keyup', replay.processKeyUp);
}

const typingState = initializeTypingState(textElement, async data => {
    if (!replay.isReplaying()) {
        sessions.uploadResults(data); // Intentionally not awaited for faster UI experience.

        showControls();

        replay.replayTypingSession(data.text, data.events);
    }
});

const replay = createReplay(typingState);

function getNextText() {
    return inputElement.value;
}

function getMsTillReAuthenticate(token) {
    return (getExpiration(token) * 1000) - Date.now() - (60 * 5 * 1000);
}

function getExpiration(token) {
    return parseJwt(token).exp;
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
