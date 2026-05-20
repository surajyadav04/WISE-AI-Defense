// --- background.js ---
const API_URL = "https://reaper1909-wade-ips.hf.space"; 

// ==========================================
// 1. DYNAMIC THREAT INTEL SYNC
// ==========================================
chrome.runtime.onStartup.addListener(syncTrustedDomains);
chrome.runtime.onInstalled.addListener(syncTrustedDomains);

chrome.alarms.create("dailySync", { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailySync") syncTrustedDomains();
});

function syncTrustedDomains() {
    console.log("🛡️ WISE: Syncing Global Trusted Domains (Tranco Top 10k)...");
    fetch(`${API_URL}/trusted-domains`)
        .then(res => {
            if (!res.ok) throw new Error("Server asleep or unavailable");
            return res.json();
        })
        .then(data => {
            if (data.success && data.domains) {
                chrome.storage.local.set({ globalTrusted: data.domains }, () => {
                    console.log(`✅ WISE: Successfully memorized ${data.domains.length} safe domains.`);
                });
            }
        })
        .catch(err => console.error("❌ WISE: Failed to sync Tranco domains", err));
}

// ==========================================
// 2. LOGGING HELPER & UI UPDATES
// ==========================================
function saveToHistory(url, score, reason) {
    chrome.storage.local.get({ scanHistory: [] }, (result) => {
        let history = result.scanHistory;
        if (history.length > 0 && history[history.length - 1].url === url) return;

        history.push({
            url: url,
            score: score,
            reason: reason,
            date: new Date().toLocaleTimeString()
        });

        if (history.length > 20) history.shift();
        chrome.storage.local.set({ scanHistory: history });
    });
}

function updateBadge(score) {
    chrome.action.setBadgeText({text: score.toString()});
    let color = score > 75 ? "#FF0000" : (score > 30 ? "#FFA500" : "#00FF00");
    chrome.action.setBadgeBackgroundColor({color: color});
}

function markSafe(tabId, reason, url) {
    chrome.action.setBadgeText({text: "SAFE"});
    chrome.action.setBadgeBackgroundColor({color: "#00FF00"});
    saveToHistory(url, 0, reason);

    chrome.tabs.sendMessage(tabId, { 
        action: "SCAN_RESULT", 
        data: { risk_score: 0, threat_type: reason, harm: "None" } 
    }).catch(() => {});
}

// ==========================================
// 3. SYSTEM BOUNDARY FILTER
// ==========================================
function isUrlInScope(url) {
    const outOfScopeProtocols = [
        "file://", "chrome://", "chrome-extension://", "mailto:", "javascript:"
    ];
    for (let protocol of outOfScopeProtocols) {
        if (url.toLowerCase().startsWith(protocol)) return false; 
    }
    return true; 
}

// ==========================================
// 4. NETWORK INTERCEPTOR (Routing Logic)
// ==========================================
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (details.frameId !== 0) return; // Only scan main frame, not iframes
    if (!isUrlInScope(details.url)) return; 
    
    handleUrl(details.tabId, details.url);
});

function handleUrl(tabId, url) {
    try {
        const hostname = new URL(url).hostname;

        chrome.storage.local.get({ globalTrusted: [], userTrust: {}, userBlacklist: [] }, (result) => {
            const isBlacklisted = result.userBlacklist.some(d => hostname === d || hostname.endsWith("." + d));
            
            // A. Check Custom Blacklist FIRST (Wildcard Override)
            if (isBlacklisted) {
                chrome.action.setBadgeText({text: "BLK"});
                chrome.action.setBadgeBackgroundColor({color: "#ff003c"});
                saveToHistory(url, 100, "Admin Force Blacklist");
                
                chrome.tabs.sendMessage(tabId, { action: "BLOCK_PAGE", data: { threat_type: "Admin Force Blacklist", harm: "High Risk Detected" } }).catch(() => {});
                return;
            }

            // B. Check Global Tranco List
            const isGlobal = result.globalTrusted.some(d => hostname === d || hostname.endsWith("." + d));
            if (isGlobal || hostname === "localhost") {
                markSafe(tabId, "Global Trusted", url);
                return;
            }

            // C. Check User Learned Trust
            const bypassCount = result.userTrust[hostname] || 0;
            if (bypassCount >= 2) {
                markSafe(tabId, "User Trusted", url);
                return;
            }

            // D. If unknown, trigger the AI API Scan
            performScan(tabId, url);
        });
    } catch (e) { performScan(tabId, url); }
}

function performScan(tabId, url) {
    chrome.action.setBadgeText({text: "..."});
    chrome.action.setBadgeBackgroundColor({color: "#888"});

    fetch(`${API_URL}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url })
    })
    .then(res => res.json())
    .then(data => {
        updateBadge(data.risk_score);
        saveToHistory(url, data.risk_score, data.threat_type || "AI Analysis");
        chrome.tabs.sendMessage(tabId, { action: "SCAN_RESULT", data: data }).catch(() => {});

        if (data.risk_score > 75) {
            chrome.tabs.sendMessage(tabId, { action: "BLOCK_PAGE", data: data }).catch(() => {});
        }
    })
    .catch(() => chrome.action.setBadgeText({text: "ERR"}));
}

// ==========================================
// 5. DOWNLOAD WARNING
// ==========================================
chrome.downloads.onCreated.addListener(function(downloadItem) {
    const fileUrl = downloadItem.url || "";
    const fileName = downloadItem.filename ? downloadItem.filename.toLowerCase() : "";

    // 1. Ignore invisible background downloads from other Chrome Extensions (like AdBlock)
    if (fileUrl.startsWith("chrome-extension://")) return;

    // 2. Alert only on highly dangerous executable and macro formats (Removed .zip)
    if (fileName.endsWith(".exe") || fileName.endsWith(".docm") || fileName.endsWith(".vbs") || fileName.endsWith(".scr")) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon.png", 
            title: "WISE Security Notice",
            message: "Dangerous file type detected. WISE does not scan local files. Do not enable macros or run blindly!"
        });
    }
});

// ==========================================
// 6. MESSAGE HANDLERS (Popups & Content Scripts)
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // Handle User Bypass Trust
    if (request.action === "USER_BYPASS") {
        try {
            const hostname = new URL(request.url).hostname;
            chrome.storage.local.get({ userTrust: {} }, (result) => {
                const trustData = result.userTrust;
                trustData[hostname] = (trustData[hostname] || 0) + 1;
                chrome.storage.local.set({ userTrust: trustData });
            });
        } catch (e) {}
    }
    
    // Handle Memory Reset
    if (request.action === "RESET_MEMORY") {
        chrome.storage.local.set({ userTrust: {}, scanHistory: [] }, () => {
            sendResponse({ success: true });
        });
        return true; 
    }

    // Handle DOM Link Scanning (From hover_script.js / Webmail)
    if (request.action === "scan_link_heuristic" || request.action === "ANALYZE_URL" || request.action === "HOVER_SCAN") {
        try {
            const hostname = new URL(request.url).hostname;
            
            chrome.storage.local.get({ globalTrusted: [], userTrust: {}, userBlacklist: [] }, (result) => {
                // Check if blacklisted
                const isBlacklisted = result.userBlacklist.some(d => hostname === d || hostname.endsWith("." + d));
                if (isBlacklisted) {
                    sendResponse({ 
                        success: true, risk_score: 100, 
                        data: { risk_score: 100, verdict: "MALICIOUS", threat_type: "Admin Force Blacklist" } 
                    });
                    return;
                }

                // Check if trusted
                const isGlobal = result.globalTrusted.some(d => hostname === d || hostname.endsWith("." + d));
                const bypassCount = result.userTrust[hostname] || 0;
                if (isGlobal || bypassCount >= 2 || hostname === "localhost") {
                    sendResponse({ 
                        success: true, risk_score: 0, 
                        data: { risk_score: 0, verdict: "SAFE", threat_type: "Trusted Database" } 
                    });
                    return;
                }

                // Fallback to API
                fetch(`${API_URL}/analyze`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: request.url })
                })
                .then(res => res.json())
                .then(data => {
                    sendResponse({ success: true, risk_score: data.risk_score, data: data });
                })
                .catch(err => sendResponse({ success: false, error: "API_FAILED" }));
            });
            return true; // Keeps the message channel open for the async fetch
        } catch (e) {
            sendResponse({ success: false });
        }
    }

    // --- FIX: Handle Counter Attack Junk Data ---
    if (request.action === "FETCH_JUNK_DATA") {
        sendResponse({
            success: true,
            data: {
                name: "Admin User",
                email: "admin@localhost.local",
                credit_card: "4532-XXXX-XXXX-XXXX"
            }
        });
        return true;
    }

    // ==========================================
    // 7. REAL-TIME TELEMETRY (NEW SOC ARCHITECTURE)
    // ==========================================
    if (request.action === "telemetry_event") {
        handleTelemetryEvent(request.payload);
        return true;
    }
    
    // Serve latest telemetry to popup
    if (request.action === "GET_LATEST_TELEMETRY") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.url) {
                const domain = new URL(tabs[0].url).hostname;
                sendResponse({ data: activeTelemetry[domain] || {} });
            } else {
                sendResponse({ data: {} });
            }
        });
        return true;
    }
});

// --- Telemetry WebSocket Streaming ---
let ws = null;
const activeTelemetry = {};

function connectTelemetryWS() {
    try {
        ws = new WebSocket("ws://localhost:8000/ws/telemetry");
        ws.onopen = () => console.log("✅ WISE: Telemetry Stream Connected");
        ws.onclose = () => {
            console.log("⚠️ WISE: Telemetry Stream Disconnected. Retrying...");
            setTimeout(connectTelemetryWS, 5000);
        };
        ws.onerror = (e) => console.log("WebSocket Error", e);
    } catch (e) {
        console.error("WS init failed", e);
    }
}
connectTelemetryWS();

function handleTelemetryEvent(payload) {
    const { domain, type, data } = payload;
    
    // Store locally for Popup UI
    if (!activeTelemetry[domain]) {
        activeTelemetry[domain] = { permissions: {}, trackers: [], fingerprinting: [], events: [] };
    }
    
    if (type === "PERMISSION_STATUS") {
        activeTelemetry[domain].permissions[data.permission] = data.state;
    } else if (type === "FINGERPRINT_ATTEMPT") {
        activeTelemetry[domain].fingerprinting.push(data.method);
    } else if (type === "POPUP_ATTEMPT" || type === "FULLSCREEN_ATTEMPT" || type === "DEVICE_ACCESS" || type === "CLIPBOARD_ACCESS") {
        activeTelemetry[domain].events.push({ type, data, time: Date.now() });
    }

    // Stream to Backend
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}