// Message area
const message = document.querySelector('#message');

export function showMessage(html = null) {
    if (html !== null) message.innerHTML = html;
    message.showModal();
};

export function hideMessage() {
    message.close();
};

