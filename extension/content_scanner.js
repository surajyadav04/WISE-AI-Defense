// --- content_scanner.js ---
console.log("[WISE] Content Scanner & Telemetry Active.");

// 1. INJECT TELEMETRY SCRIPT
const script = document.createElement('script');
script.src = chrome.runtime.getURL('telemetry_injector.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// 2. LISTEN FOR MESSAGES FROM INJECTED SCRIPT
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'wise-telemetry') return;
    
    // Forward the telemetry to the background service worker
    chrome.runtime.sendMessage({
        action: 'telemetry_event',
        payload: {
            domain: window.location.hostname,
            type: event.data.type,
            data: event.data.data,
            timestamp: Date.now()
        }
    });
});

// 3. MONITOR BROWSER PERMISSIONS
async function checkPermissions() {
    const perms = ['camera', 'microphone', 'geolocation', 'notifications', 'clipboard-read'];
    for (let p of perms) {
        try {
            const status = await navigator.permissions.query({ name: p });
            if (status.state !== 'prompt') {
                chrome.runtime.sendMessage({
                    action: 'telemetry_event',
                    payload: {
                        domain: window.location.hostname,
                        type: 'PERMISSION_STATUS',
                        data: { permission: p, state: status.state },
                        timestamp: Date.now()
                    }
                });
            }
        } catch (e) {
            // Some permissions might not be supported in all browsers
        }
    }
}
// Check on load
checkPermissions();

// 4. SCAN FOR INLINE MALICIOUS SCRIPTS (Existing)
function scanForInlineScripts() {
    const riskyElements = document.querySelectorAll('[onclick], [onmouseover], a[href^="javascript:"]');
    
    riskyElements.forEach(el => {
        if (el.hasAttribute('href') && el.getAttribute('href').toLowerCase().startsWith('javascript:')) {
            el.setAttribute('data-wise-blocked-href', el.getAttribute('href'));
            el.setAttribute('href', '#');
            el.title = "WISE Alert: Malicious inline script neutralized.";
        }
    });
}

// 5. GMAIL / WEBMAIL LINK SCANNER (Existing)
function scanEmailLinks() {
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
        if (link.hasAttribute('data-wise-scanned')) return;
        link.setAttribute('data-wise-scanned', 'true');

        chrome.runtime.sendMessage({ action: "scan_link_heuristic", url: link.href }, (response) => {
            if (response && response.risk_score > 75) {
                link.style.backgroundColor = "#ff4c4c";
                link.style.color = "#ffffff";
                link.style.fontWeight = "bold";
                link.innerText = `[🚨 WISE BLOCKED: PHISHING] ${link.innerText}`;
                link.style.pointerEvents = "none";
                link.onclick = function(e) { e.preventDefault(); };
            }
        });
    });
}

const observer = new MutationObserver((mutations) => {
    scanForInlineScripts();
    scanEmailLinks();
});
observer.observe(document.body, { childList: true, subtree: true });

scanForInlineScripts();
scanEmailLinks();