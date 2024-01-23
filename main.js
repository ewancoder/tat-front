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

// Current typing state object.
const typingState = {
    /* This indicates whether input should be handled. */
    allowInput: false,

    /* This indicates what index is the caret currently on.
     * When Index is 0, it means we need to type the first symbol of the text. */
    index: 0,

    /* Source text value. */
    sourceText: undefined,

    /* Contains complete data of every character of the text, in the format:
     - character (text)
     - currentlyFailed (boolean) - indicates whether this character is currently typed incorrectly
     - failed (boolean) - indicates that this character has been typed incorrectly before
     - span (DOM) - points to the HTML span element that holds this character */
    textToType: [],

    /* Time when the typing has begun. */
    startedTypingAt: undefined,

    /* Performance.now() result when the typing has begun. */
    startedTypingPerf: undefined,

    /* Time when text has been successfully typed to the end. */
    finishedTypingAt: undefined,

    /* All events that occurred during typing.
     * This is what is being sent to the server to record for statistics, with the following format:
     - key (text) - either a character or a command key like LeftShift, RightShift, Space, Backspace
     - perf (number) - performance.now() result to measure timing of key presses in the most accurate way
     - index (number) - index of the position of the caret during that key press
     - keyAction (text) - can be 'Press' or 'Release' depending on action */
    events: [],

    // Resets the state to default values.
    reset() {
        textElement.innerHTML = '';
        this.allowInput = false;
        this.index = 0;
        this.sourceText = undefined;
        this.textToType = [];
        this.startedTypingAt = undefined;
        this.startedTypingPerf = undefined;
        this.finishedTypingAt = undefined;
        this.events = [];
    },

    // Prepares the text and draws it in the textElement field, and allows input.
    prepareText(text) {
        this.reset();
        this.sourceText = text;

        text.split('').forEach(character => {
            const characterSpan = document.createElement('span');
            characterSpan.innerText = character;
            textElement.appendChild(characterSpan);
            this.textToType.push({
                character: character,
                currentlyFailed: false,
                failed: false,
                span: characterSpan
            });
        });

        // Indicates that everything has been set up and now user input can start to be processed.
        this.allowInput = true;
    },

    startTypingIfNotStarted(key, perf) {
        if (this.startedTypingAt !== undefined || (key.length > 1 && key !== 'LShift' && key !== 'RShift')) return;

        this.startedTypingAt = Date.now();
        this.startedTypingPerf = perf;

        // Place the caret on the first character.
        this.textToType[this.index].span.classList.add('cursor');
    },

    pressKey(key, perf) {
        if (!this.canType(key)) return;
        this.startTypingIfNotStarted(key, perf);

        this.logCharacterAction(key, perf, 'Press');
    },

    releaseKey(key, perf) {
        if (!this.canType(key)) return;
        this.startTypingIfNotStarted(key, perf);

        this.logCharacterAction(key, perf, 'Release');
    },

    canType(key) {
        // Do not log any character presses once the text has been typed in full.
        // Also do not log it if key is null or undefined.
        return this.allowInput && key !== undefined && key !== null;
    },

    logCharacterAction(key, perf, keyAction) {
        this.events.push({
            key: key,
            perf: perf,
            index: this.index,
            keyAction: keyAction
        });

        if (keyAction === 'Release' || (key.length > 1 && key !== 'Backspace')) return;

        let currentKey = null;
        let currentSpan = null;

        if (this.index !== this.textToType.length) {
            currentKey = this.textToType[this.index];
            currentSpan = currentKey.span;
        }

        if (key === 'Backspace') {
            if (this.index === 0) return;

            if (currentKey !== null) {
                // Move caret away.
                currentSpan.classList.remove('cursor');
            }

            this.index--;

            currentKey = this.textToType[this.index];
            currentSpan = currentKey.span;

            currentKey.currentlyFailed = false;
            currentSpan.classList.remove('typed');
            currentSpan.classList.remove('wrong');
            currentSpan.classList.remove('corrected');
            if (currentKey.failed) {
                if (currentKey.character === ' ') {
                    //currentSpan.classList.add('space-was-wrong');
                } else {
                    currentSpan.classList.add('was-wrong');
                }
            }

            currentSpan.classList.add('cursor');
            return;
        }

        if (currentKey === null) return;

        // Move caret away.
        currentSpan.classList.remove('cursor');

        if (currentKey.character !== key) {
            currentKey.failed = true;
            currentKey.currentlyFailed = true;
            currentSpan.classList.remove('typed');
            currentSpan.classList.add('wrong');
        } else {
            currentSpan.classList.remove('wrong');
            currentSpan.classList.remove('was-wrong');
            //currentSpan.classList.remove('space-was-wrong');

            if (currentKey.failed) {
                currentSpan.classList.add('corrected');
            } else {
                currentSpan.classList.add('typed');
            }
        }

        this.index++;
        if (this.textToType.length === this.index) {
            this.finishTyping();
            return;
        }

        currentKey = this.textToType[this.index];
        currentSpan = currentKey.span;

        currentSpan.classList.add('cursor');
    },

    finishTyping() {
        if (this.textToType.some(x => x.currentlyFailed)) return;

        this.allowInput = false;
        this.finishedTypingAt = Date.now();

        this.uploadResults({
            text: this.sourceText,
            startedTypingAt: new Date(this.startedTypingAt).toISOString(),
            startedTypingPerf: this.startedTypingPerf,
            finishedTypingAt: new Date(this.finishedTypingAt).toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: -new Date(this.startedTypingAt).getTimezoneOffset(),
            events: this.events
        });

        this.reset();
        showTextInputArea();
    },

    async uploadResults(results) {
        await fetch('http://localhost:5000/api/typing', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(results)
        });
    }
};

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

    if (event.key.length === 1 || isAllowedControlKey(event.key)) {
        return event.key;
    }

    return null;
}

function isAllowedControlKey(key) {
    return key === 'Backspace';
}

function getNextText() {
    //return 'Sample text that you need to type.';

    return inputElement.value;
}
