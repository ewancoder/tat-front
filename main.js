const auth = {};

(async function main() {
})();

window.signin = function(response) {
    auth.token = response.credential;
    document.getElementById("authentication").style.display = "none";
};
