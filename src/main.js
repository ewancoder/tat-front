import { initializeTypingState } from './typing.js';
import { createReplay } from './replay.js';
import { notifier } from './notifier.js';
import { initializeSessions } from './typing-sessions.js';
import { auth } from './auth.js';
import './google-auth.js'; // Sets up google auth.

// Initialize authentication.
await auth.getToken();
document.body.classList.remove('non-scrollable');

let replay = undefined;
let sessions = undefined;

// Typing manager that manager how the text is being typed.
const textElement = document.getElementById('text');
const typingState = initializeTypingState(textElement, async data => {
    if (!replay.isReplaying()) {
        sessions.uploadResults(data); // Intentionally not awaited for faster UI experience.

        showControls();

        replay.replayTypingSession(data.text, data.events);
    }
});

// Replay manager for processing controls (key presses).
replay = createReplay(typingState);

// Sessions manager for reviewing and deleting previous sessions.
const sessionsElement = document.getElementById('sessions');
sessions = await initializeSessions(replay, sessionsElement);

// Input area for creating custom text to type.
const inputAreaElement = document.getElementById('input-area');
const inputElement = document.getElementById('input');
showControls();

/* Function that is being called on submit button click, when you submit
 * the text that you want to type. */
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

    // In future we might generate texts on the server side.
    const text = await getNextText();

    typingState.prepareText(text);

    replay.stop();

    hideControls();
}

// Hides input field and sessions table, leaving only text to type.
function hideControls() {
    inputAreaElement.classList.add('hidden');
    sessions.hide();

    document.addEventListener('keydown', replay.processKeyDown);
    document.addEventListener('keyup', replay.processKeyUp);
}

// Shows input field and sessions table.
function showControls() {
    inputAreaElement.classList.remove('hidden');
    sessions.show();

    document.removeEventListener('keydown', replay.processKeyDown);
    document.removeEventListener('keyup', replay.processKeyUp);
}

// Gets next text. Currently reads input field, we'll generate texts on the
// server side in future.
function getNextText() {
    const text = inputElement.value;
    inputElement.value = '';
    return text;
}
