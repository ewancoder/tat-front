import { initializeTypingState } from "./typing.js";

document.addEventListener('keydown', processKeyDown);
document.addEventListener('keyup', processKeyUp);

window.signin = async function(response) {
    auth.token = response.credential;
    document.getElementById('authentication').classList.add('hidden');
    showTextInputArea();
};

window.submitText = async function submitText() {
    if (inputElement.value === '') return;

    const text = await getNextText();
    inputAreaElement.classList.add('hidden');
    typingState.prepareText(text, textElement);
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

const typingState = initializeTypingState(textElement, data => {
    uploadResults(data);
    showTextInputArea();
});

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
