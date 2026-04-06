import { settings, tw } from './settings.js';
import { startEyeMsg, stopEyeMsg } from './eye-msg-functions.js';
import { copyText, clearText, cutText } from './text-functions.js';

let eyeDialogOptions;
let eyeDialogOptionIndex = 0;
let eyeDialogRotationNum = 0;
let eyeDialogDefaultAction;

export function eyeDialog(dialogId, readingTimeout = 1000, defaultAction = 'resume') {
    const d = document.getElementById(dialogId);

    if (d && !tw.eyeDialogOpen) {
        tw.eyeDialogOpen = true;
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

export function setEyeDialogFocus() {
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

export function selectEyeDialogValue() {
    const highlighted = document.querySelector('.eye-dialog[open] .eye-dialog-option.highlight');

    if (highlighted) {
        const action = typeof highlighted.getAttribute === 'function' && highlighted.getAttribute('data-action') ? highlighted.getAttribute('data-action') : null;
        eyeDialogAction(action);
    }
}

export function eyeDialogAction(action = 'resume') {
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

export function closeEyeDialog() {
    tw.eyeDialogOpen = false;
    tw.highlightInterval.stop();

    document.querySelectorAll('.eye-dialog[open]').forEach(e => {
        e.close();
        e.querySelectorAll('.highlight').forEach(ee => {
            ee.classList.remove('highlight');
        });
    });
}
