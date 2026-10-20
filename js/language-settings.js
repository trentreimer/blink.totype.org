import { SuggestEngine } from 'https://cdn.jsdelivr.net/gh/trentreimer/suggest-engine@v0.12.0/dist/suggest-engine.esm.js';
import { languages } from './languages.js';
import { settings, tw, updateSetting, storageKey, storagePrefix } from './settings.js';
import { setUpEyeMsg } from './eye-msg-functions.js';

export async function setLanguage(lang) {
    const currentLanguage = typeof settings.language === 'string' ? settings.language : null;
    let l = lang.toLowerCase();

    if (languages.includes(l)) {
        updateSetting('language', l);
    } else if (l.indexOf('-') > 0 && languages.includes(l.substring(0, l.indexOf('-')))) {
        l = l.substring(0, l.indexOf('-'));
        updateSetting('language', l);
    } else {
        initLanguage();
        return;
    }

    document.querySelector('#selected-language-stylesheet')?.setAttribute('href', `languages/${settings.language}/${settings.language}.css`);

    settings.keyboard = (await import(`../languages/${settings.language}/keyboard.js`)).keyboard;
    settings.translations = (await import(`../languages/${settings.language}/translations.js`)).translations;

    document.querySelectorAll('.translate[data-translate]').forEach(e => {
        const key = e.getAttribute('data-translate');
        if (settings.translations[key]) e.textContent = settings.translations[key];
    });

    setSuggestEngine();

    if (currentLanguage && l && currentLanguage !== 1) {
        setUpEyeMsg(true);
    }
}

export async function initLanguage() {
    const stored = localStorage.getItem(storageKey('language'));

    if (stored && languages.includes(stored)) {
        await setLanguage(stored);
        return true;
    }

    for (const lang of navigator.languages) {
        if (languages.includes(lang.toLowerCase())) {
            await setLanguage(lang);
            return true;
        }
    }

    for (const lang of navigator.languages) {
        const l = lang.substring(0, lang.indexOf('-')).toLowerCase();
        if (languages.includes(l)) {
            await setLanguage(l);
            return true;
        }
    }

    await setLanguage(languages[0]);
    return true;
}

export function setSuggestEngine() {
    settings.suggestEngine = new SuggestEngine({
        language: settings.language,
        maxSuggestions: 6,
        userWords: { storagePrefix },
    });

    settings.suggestEngine.loadWordList()
        .then(() => settings.suggestEngine.loadSuggestionContext())
        .catch(err => console.error(err));
}
