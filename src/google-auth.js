import { setupAuth, auth } from "./auth.js";

const authElement = document.getElementById('authentication');
const authModalElement = document.getElementById('authentication-modal');
let _initialized = false;

let initializedPromiseResolve = undefined;
const initializedPromise = new Promise(resolve => initializedPromiseResolve = resolve);

window.onload = function() {
    if (document.readyState === 'complete') {
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

        _initialized = true;
        initializedPromiseResolve();
    }
}

setupAuth(getToken);

let acquiredTokenResolves = [];
async function getToken() {
    if (!_initialized) {
        await initializedPromise;
    }

    google.accounts.id.prompt();

    // TODO: Delay showing the button until user rejects FedCM window.
    authModalElement.classList.remove('hidden');
    setTimeout(() => {
        authModalElement.classList.add('showup');
    }, 1000); // Hacky way to prevent ugly google button construction from showing up.

    return await new Promise(resolve => {
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
    authModalElement.classList.remove('showup');
    document.body.classList.remove('non-scrollable');
}
