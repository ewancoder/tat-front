import { initializeTypingState } from './typing.js';
import { createReplay } from './replay.js';
import { notifier } from './notifier.js';
import { initializeSessions } from './typing-sessions.js';

// Authentication token is saved here after authenticating.
const auth = {};

// Element where the text that you're typing is drawn.
const textElement = document.getElementById('text');
const inputAreaElement = document.getElementById('input-area');
const inputElement = document.getElementById('input');
const sessionsElement = document.getElementById('sessions');

let sessions = undefined;
window.onSignIn = async function(token) {
    auth.token = token;

    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');

    // TODO: Consider initializing on startup, and having a separate method to get the data here.
    // Or after authentication is done, on async background callback.
    sessions = await initializeSessions(auth, notifier, replay, sessionsElement);
}

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
    inputAreaElement.classList.add('hidden');
    sessions.hide();
    typingState.prepareText(text);

    replay.stop();
    document.addEventListener('keydown', replay.processKeyDown);
    document.addEventListener('keyup', replay.processKeyUp);
}

function showControls() {
    inputElement.value = '';
    inputAreaElement.classList.remove('hidden');
    sessions.show();
}

const typingState = initializeTypingState(textElement, async data => {
    if (!replay.isReplaying()) {
        sessions.uploadResults(data); // Intentionally not awaited for faster UI experience.
        showControls();

        document.removeEventListener('keydown', replay.processKeyDown);
        document.removeEventListener('keyup', replay.processKeyUp);
        replay.replayTypingSession(data.text, data.events);
    }
});

const replay = createReplay(typingState);

function getNextText() {
    return inputElement.value;
}
