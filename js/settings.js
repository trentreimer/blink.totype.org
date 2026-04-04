import { languages } from './languages.js';
import { setLanguage, initLanguage } from './set-language.js';

export const settings = {};
export const tw = {};

export function initSettings() {
    settings.longBlinkTime = parseInt(localStorage.getItem('longBlinkTime')) >= 250 ? parseInt(localStorage.getItem('longBlinkTime')) : 250;
    settings.charRotationPause = parseInt(localStorage.getItem('charRotationPause')) >= 750 ? parseInt(localStorage.getItem('charRotationPause')) : 1500;

    initLanguage();
}

export function updateSetting(settingName, settingValue) {
    settings[settingName] = settingValue;

    const localStorageSettings = ['longBlinkTime', 'charRotationPause'];

    if (localStorageSettings.includes(settingName)) {
        localStorage.setItem(settingName, settingValue);
    }

    if (settingName === 'language') {
        setLanguage(settingValue);
    }
}
