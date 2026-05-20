// --- telemetry_injector.js ---
// This script runs in the main world to hook native APIs

(function() {
    console.log("[WISE] Telemetry Injector Active in Main World");

    function sendEvent(type, data) {
        window.postMessage({ source: 'wise-telemetry', type, data }, '*');
    }

    // 1. Hook Canvas Fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
        sendEvent('FINGERPRINT_ATTEMPT', { method: 'canvas.toDataURL' });
        return originalToDataURL.apply(this, arguments);
    };

    // 2. Hook WebGL Fingerprinting
    if (window.WebGLRenderingContext) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(p) {
            if (p === 37445 || p === 37446) { // UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER_WEBGL
                sendEvent('FINGERPRINT_ATTEMPT', { method: 'WebGL.getParameter (vendor/renderer)' });
            }
            return originalGetParameter.apply(this, arguments);
        };
    }

    // 3. Hook Audio Fingerprinting
    if (window.AudioContext || window.webkitAudioContext) {
        const Context = window.AudioContext || window.webkitAudioContext;
        const originalCreateOscillator = Context.prototype.createOscillator;
        Context.prototype.createOscillator = function() {
            sendEvent('FINGERPRINT_ATTEMPT', { method: 'AudioContext.createOscillator' });
            return originalCreateOscillator.apply(this, arguments);
        };
    }

    // 4. Hook Device Access (Camera/Mic)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
            sendEvent('DEVICE_ACCESS', { constraints });
            return originalGetUserMedia.apply(this, arguments);
        };
    }

    // 5. Hook Popup Abuse
    const originalWindowOpen = window.open;
    window.open = function() {
        sendEvent('POPUP_ATTEMPT', { url: arguments[0] });
        return originalWindowOpen.apply(this, arguments);
    };

    // 6. Hook Fullscreen Abuse
    const originalRequestFullscreen = Element.prototype.requestFullscreen;
    if (originalRequestFullscreen) {
        Element.prototype.requestFullscreen = function() {
            sendEvent('FULLSCREEN_ATTEMPT', { target: this.tagName });
            return originalRequestFullscreen.apply(this, arguments);
        };
    }

    // 7. Track Clipboard Access
    document.addEventListener('copy', () => sendEvent('CLIPBOARD_ACCESS', { action: 'copy' }));
    document.addEventListener('paste', () => sendEvent('CLIPBOARD_ACCESS', { action: 'paste' }));

})();
