import { setupAuth, auth } from "./auth.js";

const authElement = document.getElementById('authentication');
const authModalElement = document.getElementById('authentication-modal');

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

    google.accounts.id.renderButton(authElement, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'filled_black',
        text: 'signin',
        size: 'large',
        logo_alignment: 'left'
    });

    setTimeout(() => {
        authModalElement.classList.add('showup');
    }, 1000); // A hack so the google button doesn't look ugly.

    auth.getToken();
}

setupAuth(getToken);

let acquiredTokenResolves = [];
function getToken() {
    google.accounts.id.prompt();

    // TODO: Show the button instantly if onetap was rejected.
    setTimeout(() => {
        if (!auth.isLoggedIn) {
            console.log(auth);
            authModalElement.classList.remove('hidden');
            // TODO: Reset typing state (stop typing session).
        }
    }, 10000);

    return new Promise(resolve => {
        acquiredTokenResolves.push(resolve);
    });
}

async function authCallback(response) {
    const acquiredTokenResolvesCopy = acquiredTokenResolves;
    acquiredTokenResolves = [];
    for (let resolve of acquiredTokenResolvesCopy) {
        resolve(response.credential);
    }

    authModalElement.classList.add('hidden');
    document.body.classList.remove('non-scrollable');
}
