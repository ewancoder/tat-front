import { config } from './config.js';
import { notifier } from './notifier.js';
import { http } from './http.js';

// TODO: Consider incorporating raceGhostFunc.
export async function initializeSessions(replay, domElement, raceGhostFunc) {
    let infos = await queryTypingSessions();
    let sessionsCache = {};

    for (const info of infos) {
        appendInfoToDom(info);
    }

    domElement.classList.remove('hidden');

    async function queryTypingSessions() {
        try {
            const response = await http.get(config.typingApiUrl);
            return await response.json();
        }
        catch {
            notifier.alertError("Could not get user typing sessions");
        }
    }

    async function queryTypingSession(id) {
        if (sessionsCache[id]) return sessionsCache[id];

        try {
            const response = await http.get(`${config.typingApiUrl}/${id}`);

            const session = await response.json();
            sessionsCache[id] = session;
            return session;
        }
        catch {
            notifier.alertError("Could not load user typing session");
        }
    }

    async function uploadResults(results) {
        try {
            const response = await http.post(config.typingApiUrl, results);

            // TODO: Move outside of this try block.
            const info = await response.json();

            notifier.alertSuccess("Typing statistics have been saved");

            appendInfoToDom(info, true);
            return info;
        }
        catch {
            notifier.alertError("Failed to upload typing statistics");
        }
    }

    function getTypingSpeed(text, lengthSeconds) {
        return ((text.length / lengthSeconds) * 60 / 5).toFixed(2);
    }

    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    function appendInfoToDom(info, insertAsFirst) {
        const row = document.createElement('tr');

        const dateCol = document.createElement('td');
        dateCol.innerHTML = `${formatDate(info.startedTypingAt)}`;
        dateCol.classList.add('date-col');

        const textCol = document.createElement('td');
        textCol.innerHTML = info.text;
        textCol.classList.add('text-col');

        const lengthCol = document.createElement('td');
        lengthCol.innerHTML = `${info.lengthSeconds} seconds`;
        lengthCol.classList.add('length-col');

        const speedCol = document.createElement('td');
        speedCol.innerHTML = `${getTypingSpeed(info.text, info.lengthSeconds)} wpm`;
        speedCol.classList.add('speed-col');

        const replayCol = document.createElement('td');
        replayCol.innerHTML = '▶';
        replayCol.classList.add('clickable');

        const raceCol = document.createElement('td');
        raceCol.innerHTML = '🚗';
        raceCol.classList.add('clickable');

        raceCol.onclick = async function() {
            const loadedSession = await queryTypingSession(info.id);

            await raceGhostFunc(loadedSession);
        };

        const onClick = async function() {
            const loadedSession = await queryTypingSession(info.id);

            replay.replayTypingSession(loadedSession.text, loadedSession.events);
        };
        replayCol.onclick = onClick;

        const deleteCol = document.createElement('td');
        const rollbackCol = document.createElement('td');

        deleteCol.innerHTML = '✖';
        deleteCol.classList.add('clickable');

        deleteCol.onclick = async function() {
            await deleteTypingSession(info.id);
            deleteCol.classList.add('hidden');
            rollbackCol.classList.remove('hidden');
            replayCol.onclick = undefined;
            replayCol.classList.remove('clickable');
            replayCol.classList.add('disabled');

            confirmDeleteCol.classList.remove('hidden');
        };

        const confirmDeleteCol = document.createElement('td');
        confirmDeleteCol.innerHTML = '✖';
        confirmDeleteCol.classList.add('hidden');
        confirmDeleteCol.style = 'color: #f00';
        confirmDeleteCol.classList.add('clickable');
        confirmDeleteCol.onclick = function() {
            domElement.removeChild(row);
        };

        rollbackCol.innerHTML = '⎌';
        rollbackCol.classList.add('clickable');
        rollbackCol.classList.add('hidden');

        rollbackCol.onclick = async function() {
            await rollbackDeletingTypingSession(info.id);
            rollbackCol.classList.add('hidden');
            deleteCol.classList.remove('hidden');
            replayCol.onclick = onClick;
            replayCol.classList.add('clickable');
            replayCol.classList.remove('disabled');
            confirmDeleteCol.classList.add('hidden');
        }

        row.appendChild(dateCol);
        row.appendChild(textCol);
        row.appendChild(lengthCol);
        row.appendChild(speedCol);
        row.appendChild(replayCol);
        row.appendChild(raceCol);
        row.appendChild(deleteCol);
        row.appendChild(rollbackCol);
        row.appendChild(confirmDeleteCol);

        if (insertAsFirst) {
            domElement.insertBefore(row, domElement.firstChild);
        } else {
            domElement.appendChild(row);
        }
    }

    async function deleteTypingSession(id) {
        // TODO: Add error handling.
        await http.delete(`${config.typingApiUrl}/${id}`);
    }

    async function rollbackDeletingTypingSession(id) {
        // TODO: Add error handling.
        await http.post(`${config.typingApiUrl}/${id}/rollback-archive`);
    }

    return {
        hide() {
            domElement.classList.add('hidden');
        },

        show() {
            domElement.classList.remove('hidden');
        },

        uploadResults: uploadResults
    };
}
