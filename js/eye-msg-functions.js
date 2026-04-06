import { settings, tw } from './settings.js';
import { setEyeMsgTextBoxHeight } from './sizing.js';
import { showMessage, hideMessage } from './messages.js';
import { eyeDialog, selectEyeDialogValue } from './eye-dialogs.js';
import { copyText, clearText, cutText } from './text-functions.js';
import { trackEyes } from './eye-tracking.js';

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

export function startEyeMsg() {
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

export function stopEyeMsg() {
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

export function hideEyeMsg() {
    tw.highlightInterval.stop();
    tw.tracking = false;
    document.querySelectorAll('#eye-msg-background, #eye-msg-select').forEach(e => { e.remove(); });
}

export function selectEyeMsgValue() {
    if (tw.eyeDialogOpen) {
        tw.lastSelectedValueIsWord = false;
        return selectEyeDialogValue();
    }

    const highlighted = document.querySelector('#keyboard .highlight');

    if (highlighted) {
        highlighted.classList.remove('highlight');
        tw.highlightInterval.stop();

        const c = highlighted.getAttribute('data-character');

        if (c) document.querySelectorAll('#keyboard .eye-msg-charset-group.autosuggest').forEach(e => e.remove());

        if (['Pause', '⏸', '⏯︎'].includes(c)) {
            tw.lastSelectedValueIsWord = false;

            highlighted.classList.add('highlight');
            tw.eyeMsgPaused = true;

            tw.keySelectMode = 'charset';
            tw.keysetIndex = 0;

            return;
        } else if (['Stop', 'Done', '🛑'].includes(c)) {
            tw.lastSelectedValueIsWord = false;
            //highlighted.classList.add('highlight');

            // Fire the dialog
            eyeDialog('stop-dialog');
            return;
        } else if (['Clear', 'Reset', 'Cut', 'Empty', 'NewMsg', '🗑'].includes(c)) {
            tw.lastSelectedValueIsWord = false;
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
                tw.lastSelectedValueIsWord = false;

                if (/\W$/.test(text)) {
                    m.textContent = text.replace(/\W$/, '');
                } else {
                    m.textContent = text.replace(/.$/, '');
                }
            } else if (['_', '␣', 'Space'].includes(c)) {
                tw.lastSelectedValueIsWord = false;
                m.textContent = text + ' ';
            } else if (['Clear', 'Reset', 'Cut', 'Empty', 'NewMsg', '🗑'].includes(c)) {
                tw.lastSelectedValueIsWord = false;
                //cutText();
                clearText();
            } else if (['↵'].includes(c)) {
                tw.lastSelectedValueIsWord = false;
                m.textContent = text + "\n\n";
            } else {
                if (c.length > 1) { // This is an autocompletion selection
                    tw.lastSelectedValueIsWord = true;

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
                        if (tw.lastSelectedValueIsWord && text.substring(text.length - 1) == ' ') {
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

                    tw.lastSelectedValueIsWord = false;
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
