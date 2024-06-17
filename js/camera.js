// Check for a video camera
async function hasCam() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        for (const device of devices) {
            if (device.kind === 'videoinput') {
                return true;
            }
        }
    } catch (err) {
        console.log('Unable to list media devices');
        console.log(err);

        return false;
    }

    return false;
}

// Return an array of video cameras
async function getCameras() {
    const cameras = [];

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        for (const device of devices) {
            if (device.kind === 'videoinput') {
                cameras.push(device);
            }
        }
    } catch (err) {
        console.log('Unable to list media devices');
        console.log(err);
    }

    return cameras;
}
