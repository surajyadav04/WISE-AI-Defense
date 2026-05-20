// --- content_scanner.js ---
console.log("[WISE] DOM Scanner Active.");

// 1. SCAN FOR INLINE MALICIOUS SCRIPTS (XSS / Payload Execution)
function scanForInlineScripts() {
    // Find elements that try to run JavaScript directly on click or hover
    const riskyElements = document.querySelectorAll('[onclick], [onmouseover], a[href^="javascript:"]');
    
    riskyElements.forEach(el => {
        // Option A: Highlight the risky element for the user
        el.style.outline = "2px dashed #ff4c4c"; 
        
        // Option B: Neutralize it (Remove the malicious script trigger)
        if (el.hasAttribute('href') && el.getAttribute('href').toLowerCase().startsWith('javascript:')) {
            el.setAttribute('data-wise-blocked-href', el.getAttribute('href'));
            el.setAttribute('href', '#'); // Neutralize the link
            el.title = "WISE Alert: Malicious inline script neutralized.";
        }
    });
    
    if (riskyElements.length > 0) {
        console.warn(`[WISE] Found and neutralized ${riskyElements.length} inline scripts.`);
    }
}

// 2. GMAIL / WEBMAIL LINK SCANNER
function scanEmailLinks() {
    // Grab all hyperlinks on the page (highly effective in webmail DOMs)
    const links = document.querySelectorAll('a[href^="http"]');
    
    links.forEach(link => {
        // Skip links we have already scanned
        if (link.hasAttribute('data-wise-scanned')) return;
        link.setAttribute('data-wise-scanned', 'true');

        // Ask the background.js to evaluate this specific URL
        chrome.runtime.sendMessage({ action: "scan_link_heuristic", url: link.href }, (response) => {
            if (response && response.risk_score > 75) {
                // Modify the DOM to warn the user BEFORE they click
                link.style.backgroundColor = "#ff4c4c";
                link.style.color = "#ffffff";
                link.style.fontWeight = "bold";
                link.innerText = `[🚨 WISE BLOCKED: PHISHING] ${link.innerText}`;
                
                // Disable the link so it cannot be clicked
                link.style.pointerEvents = "none";
                link.onclick = function(e) { e.preventDefault(); };
            }
        });
    });
}

// 3. OBSERVER (Watch for new emails opening or DOM changes)
// Since Gmail is a dynamic Single Page App (SPA), we must watch for new elements loading.
const observer = new MutationObserver((mutations) => {
    scanForInlineScripts();
    scanEmailLinks();
});

// Start observing the page for changes
observer.observe(document.body, { childList: true, subtree: true });

// Run initial scan
scanForInlineScripts();
scanEmailLinks();