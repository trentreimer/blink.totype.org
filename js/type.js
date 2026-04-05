import { settings, tw, initSettings, updateSetting, setUpEyeMsg, setEyeMsgFocus } from './settings.js';
import { windowWidth, windowHeight, setEyeMsgTextBoxHeight } from './sizing.js';
import { showMessage, hideMessage } from './messages.js';

await initSettings();

/////////////////////////////////////////////////////////////
// You need a camera
const cameras = await getCameras();

if (cameras.length < 1) {
    window.location.href = 'index.html';
}
/////////////////////////////////////////////////////////////


showMessage('<span class="blink">Loading face reader...</span>');

// Load the necessary TensorFlow machine learning components
await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js');
await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js');

/////////////////////////////////////////////////////////////////////////////////////////////
// Select the optimal TensorFlow backend
let tfBackend = 'wasm';

const testWebglBackend = async function() {
    if (!safari) {
        await import('https://unpkg.com/detect-gpu@5.0.38/dist/detect-gpu.umd.js');

        let gpuTier;

        try {
            gpuTier = await DetectGPU.getGPUTier();
        } catch (err) {
        }

        if (gpuTier && gpuTier.tier) {
            console.log(`GPU tier: ${gpuTier.tier}`);
            if (gpuTier.tier >= 3) tfBackend = 'webgl';
        }
    }
}

await testWebglBackend();

if (tfBackend === 'wasm') {
    await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.18.0/dist/tf-backend-wasm.min.js');
    tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.18.0/dist/');
}

tf.setBackend(tfBackend);
console.log(`TensorFlow backend: ${tf.getBackend()}`);
/////////////////////////////////////////////////////////////////////////////////////////////


function euclideanDistance(a, b) {
    return Math.hypot(...Object.keys(a).map(i => b[i] - a[i]));
}

function getEyeAspectRatio(upper, lower) {
    return (euclideanDistance(lower[5], upper[4]) + euclideanDistance(lower[3], upper[2])) / (2 * euclideanDistance(lower[0], lower[8]));
}

function blinkCheck(face) {
    const ratio = {};

    for (const side of ['left', 'right']) {
        ratio[side] = getEyeAspectRatio(face.annotations[`${side}EyeUpper0`], face.annotations[`${side}EyeLower0`]);
        //if (tw.eyes[side].minRatio > ratio[side]) tw.eyes[side].minRatio = ratio[side];
    }

    // Check if either eye is closed
    return ratio.left <= tw.eyeAspectRatioThreshold.left || ratio.right <= tw.eyeAspectRatioThreshold.right;
}

const videoElm = document.createElement('video');

videoElm.id = 'video';
document.body.appendChild(videoElm);

async function setVideoStream() {
    try {
        videoElm.srcObject = await navigator.mediaDevices.getUserMedia({video: true});
        videoElm.play();
    } catch (err) {
        console.error(err);
        return false;
    }
}

await setVideoStream();

const faceModel = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);

hideMessage();

if (tw.calibrated) {
    setTimeout(startEyeMsg, 0);
} else {
    showMessage('Calibrating');

    trackEyes(); // Start the calibration

    eyeAspectRatioCalibrationInterval = setInterval(function() {
        let adjusted = false;

        for (const side of ['left', 'right']) {
            if (tw.eyes[side].minRatio < 0.25) {
                tw.eyeAspectRatioThreshold[side] = tw.eyes[side].minRatio + 0.08;
                adjusted = true;

                tw.eyes[side].minRatio = 100;

                if (!tw.calibrated) {
                    tw.calibrated = true;
                    hideMessage();
                    startEyeMsg();
                }
            }
        }

        if (adjusted) console.log(`Threshold left: ${tw.eyeAspectRatioThreshold.left}, right: ${tw.eyeAspectRatioThreshold.right}`);
    }, 10000);
}

window.addEventListener('resize', function() {
    setEyeMsgTextBoxHeight();
});

///////////////////////////////////////////
// Menu listeners
document.querySelector('#settings .interval').value = settings.charRotationPause / 1000;
document.querySelector('#settings .blink-length').value = (settings.longBlinkTime / 1000);

document.querySelector('#settings .interval').addEventListener('change', function() {
    updateSetting('charRotationPause', this.value * 1000);

    // If the rotation is going make sure it uses the new setting.
    if (document.querySelector('#settings .start-stop[data-action="stop"]')) {
        startEyeMsg();
    } else {
        tw.highlightInterval.setInterval(settings.charRotationPause);
    }
});

document.querySelector('#settings .blink-length').addEventListener('change', function() {
    updateSetting('longBlinkTime', this.value * 1000);
});

document.querySelectorAll('#settings .quit').forEach(e => { e.addEventListener('click', function() {
    window.location.href = 'index.html';
})});

document.querySelectorAll('#settings .start-stop').forEach(e => {
    e.addEventListener('click', function() {
        const a = this.getAttribute('data-action');

        if (a === 'stop') {
            stopEyeMsg();
        } else {
            startEyeMsg();
        }
    });
});

function copyText() {
    const m = document.getElementById('text');
    const r = document.createRange();
    const s = window.getSelection();

    r.selectNodeContents(m);
    s.removeAllRanges();
    s.addRange(r);

    navigator.clipboard.writeText(m.textContent.trim());
}

function clearText() {
    document.getElementById('text').textContent = '';
}

function cutText() {
    copyText();
    clearText();
}

document.querySelectorAll('#settings .copy-text').forEach(e => {
    e.addEventListener('click', copyText);
});

document.querySelectorAll('#settings .cut-text').forEach(e => {
    //e.addEventListener('click', cutText);
    e.addEventListener('click', clearText);
});
///////////////////////////////////////////

function startEyeMsg() {
    hideMessage();
    setUpEyeMsg(true);
    tw.eyeMsgPaused = false;
    tw.keysetIndex = 0;
    tw.keyIndex = 0;
    tw.keySelectMode = 'charset';
    tw.keyRotationNum = 0;
    tw.tracking = true;
    trackEyes();

    document.querySelectorAll('#settings .start-stop').forEach(e => { e.setAttribute('data-action', 'stop'); });
}

function hideEyeMsg() {
    tw.highlightInterval.stop();
    tw.tracking = false;
    document.querySelectorAll('#eye-msg-background, #eye-msg-select').forEach(e => { e.remove(); });
}

function stopEyeMsg() {
    try {
        tw.eyeMsgPaused = true;
        tw.tracking = false;
        tw.highlightInterval.stop();

        document.querySelectorAll('#keyboard .highlight').forEach(ee => { ee.classList.remove('highlight'); });
        document.querySelectorAll('#settings .start-stop').forEach(e => { e.setAttribute('data-action', 'start'); });
        document.querySelectorAll('#keyboard [data-character="🛑"], #keyboard [data-character="Stop"], #keyboard [data-character="Done"]').forEach(e => { e.classList.add('highlight'); });

    } catch (error) {
        console.log(error);
    }
}



let lastSelectedValueIsWord = false;

function selectEyeMsgValue() {
    if (eyeDialogOpen) {
        lastSelectedValueIsWord = false;
        return selectEyeDialogValue();
    }

    const highlighted = document.querySelector('#keyboard .highlight');

    if (highlighted) {
        highlighted.classList.remove('highlight');
        tw.highlightInterval.stop();

        const c = highlighted.getAttribute('data-character');

        if (c) document.querySelectorAll('#keyboard .eye-msg-charset-group.autosuggest').forEach(e => e.remove());

        if (['Pause', '⏸', '⏯︎'].includes(c)) {
            lastSelectedValueIsWord = false;

            highlighted.classList.add('highlight');
            tw.eyeMsgPaused = true;

            tw.keySelectMode = 'charset';
            tw.keysetIndex = 0;

            return;
        } else if (['Stop', 'Done', '🛑'].includes(c)) {
            lastSelectedValueIsWord = false;
            //highlighted.classList.add('highlight');

            // Fire the dialog
            eyeDialog('stop-dialog');
            return;
        } else if (['Clear', 'Reset', 'Cut', 'Empty', 'NewMsg', '🗑'].includes(c)) {
            lastSelectedValueIsWord = false;
            //eyeDialog('empty-dialog');
            eyeDialog('cut-dialog');
            return;
        }

        if (!c && tw.keySelectMode === 'charset') {
            tw.keySelectMode = 'char';
            tw.keyIndex = 0;
            tw.keysetIndex = tw.keysetIndex - 1;
            if (tw.keysetIndex < 0) tw.keysetIndex = document.querySelectorAll('.eye-msg-charset').length - 1;
        } else if (c) { // Character select mode
            const m = document.getElementById('text');
            const scrollable = document.getElementById('editor');
            const text = m.textContent;

            if (['⌫', '«', '<'].includes(c)) {
                lastSelectedValueIsWord = false;

                if (/\W$/.test(text)) {
                    m.textContent = text.replace(/\W$/, '');
                } else {
                    m.textContent = text.replace(/.$/, '');
                }
            } else if (['_', '␣', 'Space'].includes(c)) {
                lastSelectedValueIsWord = false;
                m.textContent = text + ' ';
            } else if (['Clear', 'Reset', 'Cut', 'Empty', 'NewMsg', '🗑'].includes(c)) {
                lastSelectedValueIsWord = false;
                //cutText();
                clearText();
            } else if (['↵'].includes(c)) {
                lastSelectedValueIsWord = false;
                m.textContent = text + "\n\n";
            } else {
                if (c.length > 1) { // This is an autocompletion selection
                    lastSelectedValueIsWord = true;

                    let partWordLength = c.length;
                    let wordMatch = false;

                    while (partWordLength > 0) {
                        const matchString = c.substring(0, partWordLength);

                        if (text.substring(text.length - partWordLength) == matchString) {
                            wordMatch = true;
                            m.textContent = text + c.substring(partWordLength) + ' ';
                            break;
                        } else {
                            partWordLength --;
                        }
                    }

                    if (!wordMatch) {
                        m.textContent = text + c + ' ';
                    }
                } else {
                    if (['.', '?', ',', '!', ':', ';'].includes(c)) {
                        if (lastSelectedValueIsWord && text.substring(text.length - 1) == ' ') {
                            // Automatically remove the trailing space
                            m.textContent = text.substring(0, text.length - 1) + c + ' ';
                        } else {
                            m.textContent = text + c + ' ';
                        }
                    } else {
                        const newText = text + c;
                        m.textContent = newText;

                        if (/[A-Z|']/.test(c)) { // Show suggestions
                            const lastWord = newText.match(/[A-Z|']+$/);

                            if (lastWord) {
                                //console.log(lastWord[0]);
                                const firstLetter = lastWord[0].charAt(0);
                                //console.log(firstLetter);
                                if (settings.autocompleteLibrary[firstLetter]) {
                                    const suggestions = [];

                                    for (const suggestion of settings.autocompleteLibrary[firstLetter]) {
                                        if (suggestion.substring(0, lastWord[0].length) == lastWord && suggestions.length < 6) {
                                            suggestions.push(suggestion);
                                        }
                                    }

                                    if (suggestions.length > 0) {
                                        let html = '<div class="eye-msg-charset-group autosuggest">';

                                        for (const suggestion of suggestions) {
                                            html += `<div class="eye-msg-charset autosuggest" data-character="${suggestion}"><span data-character="${suggestion}">${suggestion}</span></div>`;
                                        }

                                        html += '</div>';

                                        document.querySelector('#keyboard').insertAdjacentHTML('beforeend', html);
                                    }
                                }
                            }
                        }
                    }

                    lastSelectedValueIsWord = false;
                }
            }

            //m.scrollTop = m.scrollHeight;
            scrollable.scrollTop = scrollable.scrollHeight;

            tw.keySelectMode = 'charset';
            tw.keysetIndex = 0;
        }

    }

    tw.highlightInterval.setFunction(setEyeMsgFocus);
    tw.highlightInterval.setInterval(settings.charRotationPause);
    tw.highlightInterval.start();
}

///////////////////////////////////////////////////////////////
// Eye controlled dialogs
let eyeDialogOpen = false;
let eyeDialogOptions;
let eyeDialogOptionIndex = 0;
let eyeDialogRotationNum = 0;
let eyeDialogDefaultAction;

function eyeDialog(dialogId, readingTimeout = 1000, defaultAction = 'resume') {
    const d = document.getElementById(dialogId);

    if (d && !eyeDialogOpen) {
        eyeDialogOpen = true;
        tw.highlightInterval.stop();
        document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

        eyeDialogOptions = d.querySelectorAll('.eye-dialog-option');
        eyeDialogOptionIndex = 0;
        eyeDialogRotationNum = 1;
        eyeDialogDefaultAction = defaultAction;

        d.showModal();

        if (eyeDialogOptions.length > 0) {
            tw.highlightInterval.setFunction(setEyeDialogFocus);
            tw.highlightInterval.setInterval(settings.charRotationPause);
            tw.highlightInterval.start(settings.charRotationPause + readingTimeout);
        }
    }

    return null;
}

function setEyeDialogFocus() {
    eyeDialogOptions.forEach(e => {
        e.classList.remove('highlight');
    });

    if (eyeDialogOptionIndex >= eyeDialogOptions.length) {
        eyeDialogRotationNum ++;
        eyeDialogOptionIndex = 0;

        if (eyeDialogRotationNum > 2) { // After two rotations through the options just fire the default action.
            eyeDialogAction(eyeDialogDefaultAction);
            return;
        }
    }

    eyeDialogOptions[eyeDialogOptionIndex].classList.add('highlight');
    eyeDialogOptionIndex ++;
}

function selectEyeDialogValue() {
    const highlighted = document.querySelector('.eye-dialog[open] .eye-dialog-option.highlight');

    if (highlighted) {
        const action = typeof highlighted.getAttribute === 'function' && highlighted.getAttribute('data-action') ? highlighted.getAttribute('data-action') : null;
        eyeDialogAction(action);
    }
}

function eyeDialogAction(action = 'resume') {
    closeEyeDialog();

    if (action === 'stop') {
        stopEyeMsg();
    } else if (['empty', 'cut'].includes(action)) {
        //cutText();
        clearText(); // Cutting to clipboard can potentially fire a browser permissions prompt that the user cannot interact with
        startEyeMsg();
    } else { // The default action is 'resume'
        startEyeMsg();
    }
}

function closeEyeDialog() {
    eyeDialogOpen = false;
    tw.highlightInterval.stop();

    document.querySelectorAll('.eye-dialog[open]').forEach(e => {
        e.close();
        e.querySelectorAll('.highlight').forEach(ee => {
            ee.classList.remove('highlight');
        });
    });
}

let blinking;
let blinkStart;
let blinkEvent = {shortBlink: false, longBlink: false};
let trackEyesNum = 0;

async function trackEyes(timestamp, num) {
    /*if (typeof num === 'number' && num < trackEyesNum) {
        console.log('out of sequence');
        return;
    }

    trackEyesNum ++;*/

    const faces = await faceModel.estimateFaces({input: videoElm});

    if (faces.length) {
        const face = faces[0];

        blinking = blinkCheck(face);
        //console.log(blinking);

        const time = Date.now();

        if (tw.calibrated) {
            // Determine how long you blinked
            if (blinking) {
                blinkEvent.shortBlink = false;
                blinkEvent.longBlink = false;

                if (!blinkStart) {
                    blinkStart = time;
                    //tw.highlightInterval.pause();
                } else if (time > blinkStart + settings.longBlinkTime - 10) {
                    tw.highlightInterval.stop();
                    document.body.classList.add('blinking');
                }
            } else {
                document.body.classList.remove('blinking');

                const blinkTime = blinkStart ? (time - blinkStart) : 0;
                blinkEvent.shortBlink = blinkStart && blinkTime < settings.longBlinkTime;
                blinkEvent.longBlink = blinkStart && blinkTime >= settings.longBlinkTime;
                blinkStart = null;

                //if (tw.highlightInterval.state == 'paused') tw.highlightInterval.resume();
                if (!tw.eyeMsgPaused && tw.highlightInterval.state == 'stopped') tw.highlightInterval.start();
            }
        } else if (!blinking) {
            document.body.classList.remove('blinking');
        }

        if (blinkEvent.longBlink && tw.calibrated) {
            if (tw.eyeMsgPaused) {
                tw.eyeMsgPaused = false;
                tw.tracking = true;
                document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

                tw.highlightInterval.setFunction(setEyeMsgFocus);
                tw.highlightInterval.setInterval(settings.charRotationPause);
                tw.highlightInterval.start();
                //return;
            } else {
                selectEyeMsgValue();
            }
        }
    }

    if (tw.tracking) {
        //setTimeout(function() { requestAnimationFrame((timestamp) => { trackEyes(timestamp, trackEyesNum); }) }, 10);
        //requestAnimationFrame(function(timestamp) { trackEyes(timestamp, trackEyesNum); });
        requestAnimationFrame(trackEyes);
    }
}
