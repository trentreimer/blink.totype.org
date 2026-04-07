import { languages } from './languages.js';
import { settings, tw, updateSetting } from './settings.js';
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

    setAutocompleteLibrary();

    if (currentLanguage && l && currentLanguage !== 1) {
        setUpEyeMsg(true);
    }
}

export async function initLanguage() {
    if (localStorage.getItem('language') && languages.includes(localStorage.getItem('language'))) {
        await setLanuage(localStorage.getItem('language'));
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

export async function setAutocompleteLibrary() {
    settings.autocompleteLibrary = {};
    // word files are just text files containing words separated by newline characters
    const wordFile = `../languages/${settings.language}/autocomplete.txt`;
    let fileContents;

    try {
        const response = await fetch(wordFile);

        if (response.ok) {
            fileContents = await response.text();
        } else {
            throw new Error(`Unable to fetch ${wordFile}`);
        }
    } catch (err) {
        console.error(err);
        return;
    }

    if (fileContents) {
        const lines = fileContents.split("\n");

        for (const line of lines) {
            const word = line.trim().toUpperCase().replaceAll('ʼ', '\'').replaceAll('’', '\'').replace(/[^\w|'|\-].*$/, '');

            if (word.length > 1) {
                const firstLetter = word.charAt(0).toUpperCase();

                if (!settings.autocompleteLibrary[firstLetter]) {
                    settings.autocompleteLibrary[firstLetter] = [];
                }

                settings.autocompleteLibrary[firstLetter].push(word);
            }
        }
    }
}
