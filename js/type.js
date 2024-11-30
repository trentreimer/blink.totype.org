(async function() {
    // Message area
    const message = document.querySelector('#message');

    function showMessage(html = null) {
        if (html !== null) message.innerHTML = html;
        message.showModal();
    };

    function hideMessage() {
        message.close();
    };

    /////////////////////////////////////////////////////////////
    // You need a camera
    const cameras = await getCameras();

    if (cameras.length < 1) {
        window.location.href = 'index.html';
        return;
    }
    /////////////////////////////////////////////////////////////


    showMessage('<span class="blink">Loading face reader...</span>');

    // Load the necessary TensorFlow machine learning components
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection@0.0.1/dist/face-landmarks-detection.js');

    /////////////////////////////////////////////////////////////////////////////////////////////
    // Select the optimal TensorFlow backend
    let tfBackend = 'wasm';

    const testWebglBackend = async function() {
        if (!safari) {
            await loadScript('https://unpkg.com/detect-gpu@5.0.38/dist/detect-gpu.umd.js');

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
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.18.0/dist/tf-backend-wasm.min.js');
    }

    tf.setBackend(tfBackend);
    console.log(`TensorFlow backend: ${tf.getBackend()}`);
    /////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////
    // Set long blink length (milliseconds)
    let longBlinkTime = parseInt(localStorage.getItem('longBlinkTime')) >= 250 ? parseInt(localStorage.getItem('longBlinkTime')) : 250;
    ///////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////
    // Set character pause for rotation based typing (milliseconds)
    let charRotationPause = parseInt(localStorage.getItem('charRotationPause')) >= 750 ? parseInt(localStorage.getItem('charRotationPause')) : 1500;
    ///////////////////////////////////////////////////////////////

    const eyeAspectRatioThreshold = {default: 0.18};

    eyeAspectRatioThreshold.left = eyeAspectRatioThreshold.default;
    eyeAspectRatioThreshold.right = eyeAspectRatioThreshold.default;

    const eyes = {left: {minRatio: 100, maxRatio: null}, right: {minRatio: 100, maxRatio: null}};

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
            //if (eyes[side].minRatio > ratio[side]) eyes[side].minRatio = ratio[side];
        }

        // Check if either eye is closed
        return ratio.left <= eyeAspectRatioThreshold.left || ratio.right <= eyeAspectRatioThreshold.right;
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

    let tracking = true; // Let functions know when eye tracking is active

    // Calibrate the eye aspect ratio threshold
    let calibrated = true; // Set to "true" to skip live calibration and just use the default threshold
    let eyeAspectRatioCalibrationInterval;

    if (calibrated) {
        setTimeout(startEyeMsg, 0);
    } else {
        showMessage('Calibrating');

        trackEyes(); // Start the calibration

        eyeAspectRatioCalibrationInterval = setInterval(function() {
            let adjusted = false;

            for (const side of ['left', 'right']) {
                if (eyes[side].minRatio < 0.25) {
                    eyeAspectRatioThreshold[side] = eyes[side].minRatio + 0.08;
                    adjusted = true;

                    eyes[side].minRatio = 100;

                    if (!calibrated) {
                        calibrated = true;
                        hideMessage();
                        startEyeMsg();
                    }
                }
            }

            if (adjusted) console.log(`Threshold left: ${eyeAspectRatioThreshold.left}, right: ${eyeAspectRatioThreshold.right}`);
        }, 10000);
    }

    //////////////////////////////////////////////////////////////
    // Section based typing
    const highlightInterval = new IntervalTimer();

    let keysetIndex = 0;
    let keyIndex = 0;
    let keySelectMode = 'charset';
    let keyRotationNum = 0;
    let eyeMsgPaused = false;

    const keyboard = [
        [
            ['A', 'B', 'C', 'D', 'E', 'F'],
            ['G', 'H', 'I', 'J', 'K', 'L'],
            ['M', 'N', 'O', 'P', 'Q', 'R'],
            ['S', 'T', 'U', 'V', 'W', 'X'],
            ['Y', 'Z', '?', '.', ',', '\'', '!'],
            ['_', '⌫', '↵', '<i class="fas fa-pause" data-character="Pause"></i>', '<i class="fas fa-cut" data-character="Cut"></i>', '🛑'],
        ],
        /*[
            ['A', 'B', 'C', 'D', 'E', 'F'],
            ['G', 'H', 'I', 'J', 'K', 'L'],
            ['M', 'N', 'O', 'P', 'Q', 'R'],
            ['S', 'T', 'U', 'V', 'W', 'X'],
        ],
        [
            ['Y', 'Z', '.', '?', '!', ',', ':', ';'],
            ['_', '+', '-', '=', '"', '\'', '@', '#', '&'],
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['⌫', '↵', '<i class="fas fa-pause" data-character="Pause"></i>', '<i class="fas fa-trash" data-character="Cut"></i>', '🛑'],
        ],*/
    ];

    const keyboardCharsets = [];

    function windowHeight() {
        //return safari ? document.body.getBoundingClientRect().height : window.innerHeight;
        return window.innerHeight;
    }

    function windowWidth() {
        return safari ? document.body.getBoundingClientRect().width : window.innerWidth;
    }

    // Hard-set the height so contents can scroll
    function setEyeMsgTextBoxHeight() {
        const h = windowHeight() - document.getElementById('settings-row').getBoundingClientRect().height;

        document.getElementById('editor').style.height = `${h}px`;
    }

    window.addEventListener('resize', function() {
        setEyeMsgTextBoxHeight();
    });

    //setTimeout(startEyeMsg, 0);

    function setUpEyeMsg(proceed = true) {
        tracking = false;
        highlightInterval.stop();

        document.querySelector('#keyboard').classList.add('hidden');

        keysetIndex = 0;
        keyIndex = 0;
        keySelectMode = 'charset';
        keyRotationNum = 0;

        keyboardCharsets.length = 0;

        let html = '';
        const u = document.createElement('div');

        for (let i = 0; i < keyboard.length; i ++) {
            html += '<div class="eye-msg-charset-group">';

            for (let ii = 0; ii < keyboard[i].length; ii ++) {
                const charset = keyboard[i][ii];
                keyboardCharsets.push(charset);

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
            highlightInterval.setFunction(setEyeMsgFocus);
            highlightInterval.setInterval(charRotationPause);
            highlightInterval.start();
        }
    }

    ///////////////////////////////////////////
    // Menu listeners
    document.querySelector('#settings .interval').value = charRotationPause / 1000;
    document.querySelector('#settings .blink-length').value = (longBlinkTime / 1000);

    document.querySelector('#settings .interval').addEventListener('change', function() {
        charRotationPause = this.value * 1000;
        localStorage.setItem('charRotationPause', charRotationPause);

        // If the rotation is going make sure it uses the new setting.
        if (document.querySelector('#settings .start-stop[data-action="stop"]')) {
            startEyeMsg();
        } else {
            highlightInterval.setInterval(charRotationPause);
        }
    });

    document.querySelector('#settings .blink-length').addEventListener('change', function() {
        longBlinkTime = this.value * 1000;
        localStorage.setItem('longBlinkTime', longBlinkTime);
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

    /////////////////////////////////////////////////////////////////////////////////
    // Set the autocomplete library
    // wordFile can be any text file containing words separated by newline characters
    let autocompleteLibrary = {};

    const setAutocompleteLibrary = async function(wordFile) {
        autocompleteLibrary = {};
        let fileContents;

        try {
            fileContents = await fetch(wordFile).then(response => response.text());
        } catch (err) {
            console.error(err);
            autocompleteLibrary = {};
            return;
        }

        if (fileContents) {
            const lines = fileContents.split("\n");

            for (const line of lines) {
                const word = line.trim().toUpperCase().replaceAll('ʼ', '\'').replaceAll('’', '\'').replace(/[^\w|'|\-].*$/, '');

                if (word.length > 1) {
                    const firstLetter = word.charAt(0);

                    if (!autocompleteLibrary[firstLetter]) {
                        autocompleteLibrary[firstLetter] = [];
                    }

                    autocompleteLibrary[firstLetter].push(word);
                }
            }
        }
    }

    setAutocompleteLibrary('autocomplete/words.en.txt');
    /////////////////////////////////////////////////////////////////////////////////

    function startEyeMsg() {
        hideMessage();
        setUpEyeMsg();
        eyeMsgPaused = false;
        keysetIndex = 0;
        keyIndex = 0;
        keySelectMode = 'charset';
        keyRotationNum = 0;
        tracking = true;
        trackEyes();

        document.querySelectorAll('#settings .start-stop').forEach(e => { e.setAttribute('data-action', 'stop'); });
    }

    function hideEyeMsg() {
        highlightInterval.stop();
        tracking = false;
        document.querySelectorAll('#eye-msg-background, #eye-msg-select').forEach(e => { e.remove(); });
    }

    function stopEyeMsg() {
        try {
            eyeMsgPaused = true;
            tracking = false;
            highlightInterval.stop();

            document.querySelectorAll('#keyboard .highlight').forEach(ee => { ee.classList.remove('highlight'); });
            document.querySelectorAll('#settings .start-stop').forEach(e => { e.setAttribute('data-action', 'start'); });
            document.querySelectorAll('#keyboard [data-character="🛑"], #keyboard [data-character="Stop"], #keyboard [data-character="Done"]').forEach(e => { e.classList.add('highlight'); });

        } catch (error) {
            console.log(error);
        }
    }

    function setEyeMsgFocus() {
        document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

        const charsets = document.querySelectorAll('.eye-msg-charset');

        if (keysetIndex >= charsets.length) {
            keysetIndex = 0;
        } else if (keysetIndex === charsets.length - 1 && keySelectMode === 'charset') { // In the last row go straight to the characters
            keyIndex = 0;
            keyRotationNum = 0;
            keySelectMode = 'char';
        }

        if (keySelectMode === 'charset') {
            charsets[keysetIndex].classList.add('highlight');
            keysetIndex ++;

            keyIndex = 0;
            keyRotationNum = 0;
        } else { // character
            const chars = charsets[keysetIndex].querySelectorAll('span');

            if (keyIndex >= chars.length) {
                keyIndex = 0;
                keyRotationNum ++;

                if (keyRotationNum > 0) { // Revert to row selection
                    keySelectMode = 'charset';
                    keysetIndex = 0;
                    return;
                }
            }

            chars[keyIndex].classList.add('highlight');
            keyIndex ++;
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
            highlightInterval.stop();

            const c = highlighted.getAttribute('data-character');

            if (c) document.querySelectorAll('#keyboard .eye-msg-charset-group.autosuggest').forEach(e => e.remove());

            if (['Pause', '⏸', '⏯︎'].includes(c)) {
                lastSelectedValueIsWord = false;

                highlighted.classList.add('highlight');
                eyeMsgPaused = true;

                keySelectMode = 'charset';
                keysetIndex = 0;

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

            if (!c && keySelectMode === 'charset') {
                keySelectMode = 'char';
                keyIndex = 0;
                keysetIndex = keysetIndex - 1;
                if (keysetIndex < 0) keysetIndex = document.querySelectorAll('.eye-msg-charset').length - 1;
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
                                    if (autocompleteLibrary[firstLetter]) {
                                        const suggestions = [];

                                        for (const suggestion of autocompleteLibrary[firstLetter]) {
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

                keySelectMode = 'charset';
                keysetIndex = 0;
            }

        }

        highlightInterval.setFunction(setEyeMsgFocus);
        highlightInterval.setInterval(charRotationPause);
        highlightInterval.start();
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
            highlightInterval.stop();
            document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

            eyeDialogOptions = d.querySelectorAll('.eye-dialog-option');
            eyeDialogOptionIndex = 0;
            eyeDialogRotationNum = 1;
            eyeDialogDefaultAction = defaultAction;

            d.showModal();

            if (eyeDialogOptions.length > 0) {
                highlightInterval.setFunction(setEyeDialogFocus);
                highlightInterval.setInterval(charRotationPause);
                highlightInterval.start(charRotationPause + readingTimeout);
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
            clearText(); // Cutting to clipboard may fire a permissions prompt that the user cannot interact with
            startEyeMsg();
        } else { // The default action is 'resume'
            startEyeMsg();
        }
    }

    function closeEyeDialog() {
        eyeDialogOpen = false;
        highlightInterval.stop();

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
            face = faces[0];

            blinking = blinkCheck(face);
            //console.log(blinking);

            const time = Date.now();

            if (calibrated) {
                // Determine how long you blinked
                if (blinking) {
                    blinkEvent.shortBlink = false;
                    blinkEvent.longBlink = false;

                    if (!blinkStart) {
                        blinkStart = time;
                        //highlightInterval.pause();
                    } else if (time > blinkStart + longBlinkTime - 10) {
                        highlightInterval.stop();
                        document.body.classList.add('blinking');
                    }
                } else {
                    document.body.classList.remove('blinking');

                    const blinkTime = blinkStart ? (time - blinkStart) : 0;
                    blinkEvent.shortBlink = blinkStart && blinkTime < longBlinkTime;
                    blinkEvent.longBlink = blinkStart && blinkTime >= longBlinkTime;
                    blinkStart = null;

                    //if (highlightInterval.state == 'paused') highlightInterval.resume();
                    if (!eyeMsgPaused && highlightInterval.state == 'stopped') highlightInterval.start();
                }
            } else if (!blinking) {
                document.body.classList.remove('blinking');
            }

            if (blinkEvent.longBlink && calibrated) {
                if (eyeMsgPaused) {
                    eyeMsgPaused = false;
                    tracking = true;
                    document.querySelectorAll('#keyboard .highlight').forEach(e => { e.classList.remove('highlight'); });

                    highlightInterval.setFunction(setEyeMsgFocus);
                    highlightInterval.setInterval(charRotationPause);
                    highlightInterval.start();
                    //return;
                } else {
                    selectEyeMsgValue();
                }
            }
        }

        if (tracking) {
            //setTimeout(function() { requestAnimationFrame((timestamp) => { trackEyes(timestamp, trackEyesNum); }) }, 10);
            //requestAnimationFrame(function(timestamp) { trackEyes(timestamp, trackEyesNum); });
            requestAnimationFrame(trackEyes);
        }
    }
})();
