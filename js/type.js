import { settings, tw, initSettings, updateSetting } from './settings.js';
import { setEyeMsgTextBoxHeight } from './sizing.js';
import { showMessage, hideMessage } from './messages.js';
import { startEyeMsg, stopEyeMsg } from './eye-msg-functions.js';
import { trackEyes } from './eye-tracking.js';
import { copyText, clearText, cutText } from './text-functions.js';

await initSettings();

/////////////////////////////////////////////////////////////
// You need a camera
const cameras = await getCameras();

if (cameras.length < 1) {
    window.location.href = 'index.html';
}
/////////////////////////////////////////////////////////////


showMessage(settings.translations['loading-face-reader']);

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

tw.videoElm = document.createElement('video');
tw.videoElm.id = 'video';
document.body.appendChild(tw.videoElm);

async function setVideoStream() {
    try {
        tw.videoElm.srcObject = await navigator.mediaDevices.getUserMedia({video: true});
        tw.videoElm.play();
    } catch (err) {
        console.error(err);
        return false;
    }
}

await setVideoStream();

tw.faceModel = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);

hideMessage();

if (tw.calibrated) {
    setTimeout(startEyeMsg, 0);
} else {
    showMessage(settings.translations['calibrating-face-reader']);

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

document.querySelectorAll('#settings .copy-text').forEach(e => {
    e.addEventListener('click', copyText);
});

document.querySelectorAll('#settings .cut-text').forEach(e => {
    //e.addEventListener('click', cutText);
    e.addEventListener('click', clearText);
});
