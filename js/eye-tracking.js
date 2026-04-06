import { settings, tw } from './settings.js';
import { setEyeMsgFocus, selectEyeMsgValue } from './eye-msg-functions.js';

let blinking;
let blinkStart;
let blinkEvent = {shortBlink: false, longBlink: false};
let trackEyesNum = 0;

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

export async function trackEyes(timestamp, num) {
    /*if (typeof num === 'number' && num < trackEyesNum) {
        console.log('out of sequence');
        return;
    }

    trackEyesNum ++;*/

    const faces = await tw.faceModel.estimateFaces({input: tw.videoElm});

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
