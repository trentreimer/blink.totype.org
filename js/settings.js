import { languages } from './languages.js';
import { setLanguage, initLanguage } from './set-language.js';
import { setEyeMsgTextBoxHeight } from './sizing.js';

export const settings = {};
export const tw = {};

export async function initSettings() {
    settings.longBlinkTime = parseInt(localStorage.getItem('longBlinkTime')) >= 250 ? parseInt(localStorage.getItem('longBlinkTime')) : 250;
    settings.charRotationPause = parseInt(localStorage.getItem('charRotationPause')) >= 750 ? parseInt(localStorage.getItem('charRotationPause')) : 1500;

    tw.tracking = true; // Let functions know when eye tracking is active
    tw.eyes = {left: {minRatio: 100, maxRatio: null}, right: {minRatio: 100, maxRatio: null}};
    tw.eyeAspectRatioThreshold = {default: 0.18, left: 0.18, right: 0.18};
    tw.calibrated = true; // Set to "true" to skip live calibration and just use the default threshold

    tw.highlightInterval = new IntervalTimer();

    tw.keyboardCharsets = [];
    tw.keysetIndex = 0;
    tw.keyIndex = 0;
    tw.keySelectMode = 'charset';
    tw.keyRotationNum = 0;
    tw.eyeMsgPaused = false;

    await initLanguage();
}

export function updateSetting(settingName, settingValue) {
    settings[settingName] = settingValue;

    const localStorageSettings = ['longBlinkTime', 'charRotationPause'];

    if (localStorageSettings.includes(settingName)) {
        localStorage.setItem(settingName, settingValue);
    }
}

export function setUpEyeMsg(proceed = true) {
    tw.tracking = false;
    tw.highlightInterval.stop();

    document.querySelector('#keyboard').classList.add('hidden');

    tw.keysetIndex = 0;
    tw.keyIndex = 0;
    tw.keySelectMode = 'charset';
    tw.keyRotationNum = 0;

    tw.keyboardCharsets.length = 0;

    let html = '';
    const u = document.createElement('div');

    for (let i = 0; i < settings.keyboard.length; i ++) {
        html += '<div class="eye-msg-charset-group">';

        for (let ii = 0; ii < settings.keyboard[i].length; ii ++) {
            const charset = settings.keyboard[i][ii];
            tw.keyboardCharsets.push(charset);

            html += '<div class="eye-msg-charset">';
            charset.forEach(val => {
                u.innerHTML = val;
                const e = u.firstChild;
                html += '<span data-character="' + (typeof e.getAttribute === 'function' && e.getAttribute('data-character') ? e.getAttribute('data-character') : val) + '">' + val + '</span>';
            });
            html += '</div>';
        }

        html += '</div>';
    }

    document.querySelector('#keyboard').innerHTML = html;
    u.remove();
    document.querySelector('#keyboard').classList.remove('hidden');
    //console.log(html);

    setEyeMsgTextBoxHeight();

    if (proceed) {
        tw.highlightInterval.setFunction(setEyeMsgFocus);
        tw.highlightInterval.setInterval(settings.charRotationPause);
        tw.highlightInterval.start();
    }
}

export function setEyeMsgFocus() {
    document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

    const charsets = document.querySelectorAll('.eye-msg-charset');

    if (tw.keysetIndex >= charsets.length) {
        tw.keysetIndex = 0;
    } else if (tw.keysetIndex === charsets.length - 1 && tw.keySelectMode === 'charset') { // In the last row go straight to the characters
        tw.keyIndex = 0;
        tw.keyRotationNum = 0;
        tw.keySelectMode = 'char';
    }

    if (tw.keySelectMode === 'charset') {
        charsets[tw.keysetIndex].classList.add('highlight');
        tw.keysetIndex ++;

        tw.keyIndex = 0;
        tw.keyRotationNum = 0;
    } else { // character
        const chars = charsets[tw.keysetIndex].querySelectorAll('span');

        if (tw.keyIndex >= chars.length) {
            tw.keyIndex = 0;
            tw.keyRotationNum ++;

            if (tw.keyRotationNum > 0) { // Revert to row selection
                tw.keySelectMode = 'charset';
                tw.keysetIndex = 0;
                return;
            }
        }

        chars[tw.keyIndex].classList.add('highlight');
        tw.keyIndex ++;
    }
}
