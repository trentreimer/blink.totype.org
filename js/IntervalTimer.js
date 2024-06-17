class IntervalTimer {
    constructor(callbackFunction, intervalMilliseconds, startOnCreate = true) {
        if (typeof callbackFunction !== 'undefined') {
            if (typeof callbackFunction === 'function') {
                this.setFunction(callbackFunction);
            } else {
                throw new Error('The first argument to IntervalTimer needs to be a callback function');
            }
        }

        if (typeof intervalMilliseconds !== 'undefined') {
            if (!isNaN(intervalMilliseconds)) {
                this.setInterval(intervalMilliseconds);
            } else {
                throw new Error('The second argument to IntervalTimer needs to be the interval time in milliseconds');
            }
        }

        this.state = 'stopped';
        this.remainingMilliseconds = 0;

        if (callbackFunction && intervalMilliseconds && startOnCreate) {
            // Mimic default setInterval() behaviour
            this.start(this.intervalMilliseconds);
        }
    }

    clearTimers() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    start(delayMilliseconds = null) {
        delayMilliseconds = typeof delayMilliseconds !== 'number' || delayMilliseconds < 0 ? null : parseInt(delayMilliseconds);

        this.clearTimers();
        this.state = 'starting';

        if (!this.intervalMilliseconds) {
            throw new Error('IntervalTimer.start() first requires the interval time in milliseconds. e.g. IntervalTimer.setInterval(500)');
        }

        if (delayMilliseconds === null || delayMilliseconds === this.intervalMilliseconds) {
            this.interval = setInterval(() => {
                this.state = 'running';
                this.intervalStart = Date.now();
                this.remainingMilliseconds = this.intervalMilliseconds;
                if (this.callbackFunction && this.state === 'running') this.callbackFunction();
            }, this.intervalMilliseconds);
        } else {
            if (delayMilliseconds > 0) {
                this.timeout = setTimeout(() => {
                    this.start(0);
                }, delayMilliseconds);
            } else {
                this.state = 'running';

                if (this.callbackFunction) this.callbackFunction();

                this.intervalStart = Date.now();
                this.remainingMilliseconds = this.intervalMilliseconds;

                this.interval = setInterval(() => {
                    this.intervalStart = Date.now();
                    this.remainingMilliseconds = this.intervalMilliseconds;
                    if (this.callbackFunction && this.state === 'running') this.callbackFunction();
                }, this.intervalMilliseconds);
            }
        }
    }

    stop() {
        this.clearTimers();
        this.remainingMilliseconds = 0;
        this.intervalStart = 0;
        this.state = 'stopped';
    }

    pause(pauseMilliseconds = 0) { // 0 = indefinite pause
        if (this.state !== 'running') return;

        this.clearTimers();
        this.remainingMilliseconds = this.intervalMilliseconds - (Date.now() - this.intervalStart);

        pauseMilliseconds = !isNaN(pauseMilliseconds) && pauseMilliseconds > 0 ? parseInt(pauseMilliseconds) : 0;

        if (pauseMilliseconds > 0) {
            this.timeout = setTimeout(() => { this.resume() }, pauseMilliseconds);
        }

        this.state = 'paused';
    }

    resume(delayMilliseconds = 0) {
        if (this.state !== 'paused') return;

        this.state = 'running';

        delayMilliseconds = !isNaN(delayMilliseconds) && delayMilliseconds > 0 ? parseInt(delayMilliseconds) : 0;

        this.clearTimers();

        if (delayMilliseconds > 0) {
            this.timeout = setTimeout(this.resume, delayMilliseconds);
        } else {
            this.start(this.remainingMilliseconds);
        }
    }

    setFunction(callbackFunction) {
        if (typeof callbackFunction === 'function') {
            this.callbackFunction = callbackFunction;
        } else {
            throw new Error('IntervalTimer.setFunction() requires a callback function');
        }
    }

    setCallbackFunction(callbackFunction) {
        return this.setFunction(callbackFunction);
    }

    setInterval(intervalMilliseconds) {
        if (!isNaN(intervalMilliseconds)) {
            this.intervalMilliseconds = parseInt(intervalMilliseconds);
        } else {
            throw new Error('IntervalTimer.setInterval requires the interval time in milliseconds');
        }
    }
}
