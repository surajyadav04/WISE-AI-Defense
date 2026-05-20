// content.js - WISE Visual Interface (Cleaned for CSP redirect)

let blockData = null;

console.log("[WISE] Core Content Scanner Active.");

function neutralizeInlineScripts() {
    // Find elements that try to run JavaScript directly on click or hover
    const riskyElements = document.querySelectorAll('[onclick], [onmouseover], a[href^="javascript:"]');
    
    let neutralizedCount = 0;

    riskyElements.forEach(el => {
        el.classList.add('wise-xss-warning'); 
        
        // Neutralize the malicious href trigger
        if (el.hasAttribute('href') && el.getAttribute('href').toLowerCase().startsWith('javascript:')) {
            el.setAttribute('data-wise-blocked-href', el.getAttribute('href'));
            el.setAttribute('href', '#'); // Kill the link
            el.title = "WISE Alert: Malicious inline script neutralized.";
            neutralizedCount++;
        }
    });
    
    if (neutralizedCount > 0) {
        console.warn(`[WISE] Neutralized ${neutralizedCount} inline scripts on this page.`);
    }
}

// Run the scan when the script loads
neutralizeInlineScripts();

// Watch the DOM for any new scripts loaded dynamically
const domObserver = new MutationObserver(() => neutralizeInlineScripts());
domObserver.observe(document.body, { childList: true, subtree: true });

// LISTEN FOR BLOCK COMMANDS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "BLOCK_PAGE") {
        blockData = request.data;
        showBlockScreen(blockData);
    }
});

// REDIRECT TO SAFE BLOCK SCREEN
function showBlockScreen(data) {
    if (document.getElementById('wise-block-screen')) return;
    
    // Pass the target URL and Threat Type as URL parameters so blocked.js can use them
    const targetUrl = encodeURIComponent(window.location.href);
    const threatType = encodeURIComponent(data.threat_type || "MALICIOUS THREAT DETECTED");
    
    // Redirect to the internal extension block page to bypass CSP restrictions
    window.location.href = chrome.runtime.getURL(`blocked.html?target=${targetUrl}&reason=${threatType}`);
}