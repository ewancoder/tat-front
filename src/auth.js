let _getToken = undefined;
let _token = undefined;
let _lock = Promise.resolve();
let _lockResolve = undefined;

/** Sets up the function that is getting the token from authentication provider.
 * This function will be called every time when we need a fresh token, which
 * is then being cached until its expiration time. */
export function setupAuth(getToken) {
    _getToken = getToken;
}

/** Use getToken method to get token, and isLoggedIn field to check whether
 * user is logged in. */
export const auth = {
    /** Gets authentication token either from cache or from authentication
     * provider, and then caches it. */
    getToken: async function() {
        if (this.isLoggedIn) {
            return _token;
        } else {
            // Make sure this function actually gets the token only once,
            // even if called multiple times in a row.
            await _lock;

            if (this.isLoggedIn) return _token;

            _lock = new Promise(resolve => _lockResolve = resolve);

            _token = await _getToken(); // Get token using authentication provider.
            this.isLoggedIn = true;

            setTimeout(() => {
                this.isLoggedIn = false; // Reset authenticated state when token is about to expire.
            }, getMsTillAuthenticationIsRequired(_token));

            _lockResolve();
            _lockResolve = undefined;

            return _token;
        }
    },
    isLoggedIn: false
};

// Functions below calculate the time when token expires.

function getMsTillAuthenticationIsRequired(token) {
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
