import { setupAuth } from "./auth.js";

const authElement = document.getElementById('authentication');
const authModalElement = document.getElementById('authentication-modal');

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

        // Notify that google library is initialized.
        initializedPromiseResolve();
    }
}

setupAuth(getToken);

let acquiredTokenResolves = [];
async function getToken() {
    await initializedPromise; // Wait until google library is initialized.

    // Show FedCM / OneTap.
    google.accounts.id.prompt();

    // TODO: Try to figure out how to delay showing the button until FedCM window is closed.
    // Prompt method hangs for a long time if disabled,
    // so we can't use its notification to display the button.
    // Show button straight away.
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
    const token = response.credential;
    for (let resolve of acquiredTokenResolvesCopy) {
        // Resolve the same for anyone who used getToken() method and is waiting for it.
        resolve(token);
    }

    // Hide button.
    authModalElement.classList.add('hidden');
    authModalElement.classList.remove('showup');
}
