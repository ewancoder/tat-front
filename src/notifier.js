function toast(text, duration, background) {
    Toastify({
        text: text,
        duration: duration,
        gravity: "bottom", // `top` or `bottom`
        position: "center", // `left`, `center` or `right`
        avatar: 'logo.png',
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: background,
            color: "#000",
            fontSize: "1.3rem"
        }
    }).showToast();
}

export const notifier = {
    alertError: function(text) {
        toast(text, 5000, "#d77");
    },

    alertSuccess: function(text) {
        toast(text, 3000, "#7db");
    }
};
