export const auth = {};

// This is the function that is being used by authentication callback to store the token.
window.onSignIn = async function(token) {
    auth.token = token;

    if (auth.callback) {
        auth.callback();
    }
}

export function setupAuthCallback(callback) {
    auth.callback = callback;
}
