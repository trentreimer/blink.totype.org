export function windowWidth() {
    return safari ? document.body.getBoundingClientRect().width : window.innerWidth;
}

export function windowHeight() {
    //return safari ? document.body.getBoundingClientRect().height : window.innerHeight;
    return window.innerHeight;
}

export function setEyeMsgTextBoxHeight() {
    const h = windowHeight() - document.getElementById('settings-row').getBoundingClientRect().height;

    document.getElementById('editor').style.height = `${h}px`;
}
