let _getToken = undefined;
let _token = undefined;
let _authenticatedCallback = undefined;

export function addAuthCallback(callback) {
    _authenticatedCallback = callback;
}

export function setupAuth(getToken) {
    _getToken = getToken;
}

export const auth = {
    getToken: async function() {
        if (this.isLoggedIn) {
            return _token;
        } else {
            _token = await _getToken();
            this.isLoggedIn = true;
            if (_authenticatedCallback) {
                _authenticatedCallback();
            }

            setTimeout(() => {
                this.isLoggedIn = false;
            }, getMsTillReAuthenticate(_token));

            return _token;
        }
    },
    isLoggedIn: false
};

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
