// Attach a script to the document body and return a Promise
function loadScript(src) {
    return new Promise(function(resolve, reject) {
        // Check if this script is already loaded
        if (typeof src === 'string') {
            const scripts = Array.from(document.querySelectorAll('script'));
            let srcMatch = false;

            for (const e of scripts) {
                if (e.src == src) {
                    srcMatch = true;
                    resolve();
                    break;
                }
            }

            if (!srcMatch) {
                const e = document.createElement('script');
                e.src = src;
                e.addEventListener('load', function() {
                    resolve();
                });
                document.body.appendChild(e);
            }
        } else {
            console.error('loadScript() requires the src value');
            reject();
        }
    });
}
