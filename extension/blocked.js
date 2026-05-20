// blocked.js - Handles logic for the WADE block screen

document.addEventListener('DOMContentLoaded', () => {
    // 1. Extract the URL parameters passed from content.js
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('target');
    const threatType = urlParams.get('reason');

    // 2. Update the UI with the specific threat reason
    if (threatType) {
        document.getElementById('verdict-text').innerText = threatType;
    }

    // 3. Handle "Go Back" (Primary Defense)
    document.getElementById('btn-back').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If opened in a new tab with no history, default to Google
            window.location.href = "https://www.google.com";
        }
    });

    // 4. Handle "View Threat Report" (Secondary Analysis)
    document.getElementById('btn-report').addEventListener('click', () => {
        if (targetUrl) {
            // Open dashboard and pass the specific URL we want to inspect
            window.open(chrome.runtime.getURL(`dashboard.html?inspect=${encodeURIComponent(targetUrl)}`), "_blank");
        } else {
            // Fallback if no target URL is found
            window.open(chrome.runtime.getURL("dashboard.html"), "_blank");
        }
    });

    // 5. Handle "Proceed Anyway" (The Bypass)
    document.getElementById('btn-proceed').addEventListener('click', () => {
        if (targetUrl) {
            // Tell background.js to add a strike to the user trust counter
            chrome.runtime.sendMessage({ action: "USER_BYPASS", url: targetUrl });
            
            // Allow a tiny delay for the message to send, then redirect back to the site
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 100);
        }
    });
});