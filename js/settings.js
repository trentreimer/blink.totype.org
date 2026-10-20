import { languages } from './languages.js';
import { setLanguage, initLanguage } from './language-settings.js';
import { setUpEyeMsg } from './eye-msg-functions.js';

export const settings = {};
export const tw = {}; // Typewriter properties

export const storagePrefix = 'blink.totype.org';

export function storageKey(name) {
    return `${storagePrefix}:${name}`;
}

const localStorageSettings = ['longBlinkTime', 'charRotationPause', 'language'];

export async function initSettings() {
    // Values written before storage keys were namespaced are dropped so a
    // stale key from another page on this origin can never influence the app.
    for (const key of ['longBlinkTime', 'charRotationPause', 'language']) {
        localStorage.removeItem(key);
    }

    const longBlinkTime = parseInt(localStorage.getItem(storageKey('longBlinkTime')));
    const charRotationPause = parseInt(localStorage.getItem(storageKey('charRotationPause')));

    settings.longBlinkTime = longBlinkTime >= 250 ? longBlinkTime : 250;
    settings.charRotationPause = charRotationPause >= 750 ? charRotationPause : 1500;

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
    tw.lastSelectedValueIsWord = false;

    tw.eyeDialogOpen = false;
    tw.eyeDialogOptions;
    tw.eyeDialogOptionIndex = 0;
    tw.eyeDialogRotationNum = 0;
    tw.eyeDialogDefaultAction;

    await initLanguage();
}

export function updateSetting(settingName, settingValue) {
    settings[settingName] = settingValue;

    if (localStorageSettings.includes(settingName)) {
        localStorage.setItem(storageKey(settingName), settingValue);
    }
}
