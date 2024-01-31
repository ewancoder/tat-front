import { initializeTypingState } from './typing.js';
import { createReplay } from './replay.js';
import { notifier } from './notifier.js';
import { initializeSessions } from './typing-sessions.js';
import { auth } from './auth.js';

const authElement = document.getElementById('authentication');
window.onload = function() {
    google.accounts.id.initialize({
        client_id: '400839590162-24pngke3ov8rbi2f3forabpaufaosldg.apps.googleusercontent.com',
        context: 'signin',
        ux_mode: 'popup',
        callback: authCallback,
        auto_select: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: false
    });
    google.accounts.id.prompt();

    google.accounts.id.renderButton(authElement, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'filled_black',
        text: 'signin',
        size: 'large',
        logo_alignment: 'left'
    });

    setTimeout(() => {
        authElement.classList.add('showup');
    }, 1000); // A hack so the google button doesn't look ugly.
}

function triggerSilentAuth() {
    google.accounts.id.prompt();
}

let isLoggedIn = false;
const inputAreaElement = document.getElementById('input-area');
// Authentication token is saved here after authenticating.
async function authCallback(response) {
    auth.token = response.credential;
    isLoggedIn = true;

    const msTillReAuthenticate = getMsTillReAuthenticate(auth.token);
    setTimeout(() => {
        isLoggedIn = false;
        triggerSilentAuth();

        setTimeout(() => {
            if (!isLoggedIn) {
                authElement.classList.remove('hidden');
            }
        }, 60000);
    }, msTillReAuthenticate);

    authElement.classList.add('hidden');
    inputAreaElement.classList.remove('hidden');
    sessions = await initializeSessions(replay, sessionsElement);
}

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

    hideControls();

    typingState.prepareText(text);

    replay.stop();
    document.addEventListener('keydown', replay.processKeyDown);
    document.addEventListener('keyup', replay.processKeyUp);
}

function hideControls() {
    inputAreaElement.classList.add('hidden');
    sessions.hide();
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
