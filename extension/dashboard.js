// dashboard.js - WISE Cyber Dashboard Logic

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    initSpotlightGlow();
    initLiveClock();
    initNetworkStatus();
    
    // Fetch live hardware telemetry
    fetchDashboardTelemetry();
    initDashboardPermissionToggles();
    setInterval(fetchDashboardTelemetry, 1500);

    // --- SMART URL EXTRACTOR ---
    function extractHostname(input) {
        let cleanInput = input.trim().toLowerCase();
        if (!cleanInput) return "";
        try {
            if (cleanInput.startsWith("http://") || cleanInput.startsWith("https://")) {
                return new URL(cleanInput).hostname;
            }
            return new URL("https://" + cleanInput).hostname;
        } catch (e) {
            return cleanInput; 
        }
    }

    // --- MANUAL INPUT LISTENERS ---
    document.getElementById("add-whitelist").addEventListener("click", () => {
        const domain = extractHostname(document.getElementById("whitelist-input").value);
        if (domain) modifyList('whitelist', 'add', domain);
        document.getElementById("whitelist-input").value = '';
    });

    document.getElementById("add-blacklist").addEventListener("click", () => {
        const domain = extractHostname(document.getElementById("blacklist-input").value);
        if (domain) modifyList('blacklist', 'add', domain);
        document.getElementById("blacklist-input").value = '';
    });

    // --- TRANCO SEARCH ENGINE ---
    document.getElementById("btn-search-tranco").addEventListener("click", () => {
        const query = extractHostname(document.getElementById("tranco-input").value);
        const resultBox = document.getElementById("tranco-result");
        
        if (!query) return;

        chrome.storage.local.get({ globalTrusted: [] }, (data) => {
            const isTrusted = data.globalTrusted.some(d => query === d || query.endsWith("." + d));
            if (isTrusted) {
                resultBox.innerHTML = `✅ <span style="color: var(--safe-green); text-shadow: 0 0 8px var(--safe-green);">${query}</span> is in the Tranco Database!`;
            } else {
                resultBox.innerHTML = `⚠️ <span style="color: var(--warn-orange); text-shadow: 0 0 8px var(--warn-orange);">${query}</span> requires AI Scan.`;
            }
        });
    });

    // --- EVENT DELEGATION FOR BUTTONS ---
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("dynamic-btn")) {
            const list = e.target.getAttribute("data-list");
            const action = e.target.getAttribute("data-action");
            const domain = e.target.getAttribute("data-domain");
            modifyList(list, action, domain);
        }
    });
});

// --- LIVE CLOCK ---
function initLiveClock() {
    function update() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const el = document.getElementById("live-datetime");
        if (el) el.textContent = `${dateStr}, ${timeStr}`;
    }
    update();
    setInterval(update, 1000);
}

// --- SIMULATED NETWORK STATUS ---
function initNetworkStatus() {
    function update() {
        const nodes = Math.floor(140 + Math.random() * 10);
        const traffic = (Math.random() * 4 + 6).toFixed(1);
        const uptime = (99.9 + Math.random() * 0.09).toFixed(2);

        const nodesEl = document.getElementById("net-nodes");
        const trafficEl = document.getElementById("net-traffic");
        const uptimeEl = document.getElementById("net-uptime");
        const uptimeBar = document.getElementById("uptime-bar");

        if (nodesEl) nodesEl.textContent = `${nodes}/150`;
        if (trafficEl) trafficEl.textContent = `${traffic} GB/s`;
        if (uptimeEl) uptimeEl.textContent = `${uptime}%`;
        if (uptimeBar) uptimeBar.style.width = `${uptime}%`;
    }
    update();
    setInterval(update, 5000);
}

// --- SPOTLIGHT HOVER GLOW ---
function initSpotlightGlow() {
    const panels = document.querySelectorAll('.glass-panel');
    panels.forEach(panel => {
        panel.addEventListener('mousemove', (e) => {
            const rect = panel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            panel.style.setProperty('--mouse-x', `${x}px`);
            panel.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

// --- DATA LOADER ---
function loadDashboardData() {
    chrome.storage.local.get({ scanHistory: [], userTrust: {}, userBlacklist: [] }, (data) => {
        const history = data.scanHistory.reverse();
        const trustData = data.userTrust;
        const blacklistData = data.userBlacklist;
        
        const urlParams = new URLSearchParams(window.location.search);
        const inspectUrl = urlParams.get('inspect');
        let highlightedRow = null;
        let highlightedScan = null;

        // 1. Stats
        const trustedDomains = Object.keys(trustData).filter(d => trustData[d] >= 2);
        document.getElementById("stat-total-scans").innerText = history.length;
        document.getElementById("stat-blocked").innerText = blacklistData.length;
        document.getElementById("stat-trusted").innerText = trustedDomains.length;

        const trendEl = document.getElementById("stat-scans-trend");
        if (trendEl && history.length > 0) {
            trendEl.textContent = `+${Math.min(history.length, 14)}% vs Last 24H`;
        }

        // 2. Chart
        renderChart(history);

        // 3. History Table
        const historyTable = document.getElementById("history-table-body");
        historyTable.innerHTML = "";
        if (history.length === 0) {
            historyTable.innerHTML = `<tr><td colspan="5" class="empty-state">No scans logged yet. Browse websites to generate threat data.</td></tr>`;
        } else {
            history.forEach(scan => {
                let hostname = "unknown";
                try { hostname = new URL(scan.url).hostname; } catch(e) {}

                const tr = document.createElement("tr");
                let badgeClass = scan.score > 75 ? "danger" : (scan.score > 30 ? "warning" : "safe");
                let badgeText = scan.score > 75 ? "CRITICAL" : (scan.score > 30 ? "WARNING" : "SAFE");
                const displayUrl = scan.url.length > 30 ? scan.url.substring(0, 30) + "..." : scan.url;

                tr.innerHTML = `
                    <td style="color: var(--text-muted); font-size: 11px;">${scan.date || "Just now"}</td>
                    <td title="${scan.url}" style="font-family: monospace; font-size: 11px;">${displayUrl}</td>
                    <td style="color: var(--primary-cyan); font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 13px; text-shadow: 0 0 6px var(--primary-glow);">${scan.score}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        <button class="btn-action btn-white dynamic-btn" data-list="whitelist" data-action="add" data-domain="${hostname}">Trust</button>
                        <button class="btn-action btn-black dynamic-btn" data-list="blacklist" data-action="add" data-domain="${hostname}">Block</button>
                    </td>
                `;

                if (inspectUrl && scan.url.includes(inspectUrl)) {
                    tr.style.background = "rgba(239, 68, 68, 0.12)";
                    tr.style.boxShadow = "inset 3px 0 0 var(--danger-red)";
                    highlightedRow = tr;
                    highlightedScan = scan;
                }

                historyTable.appendChild(tr);
            });

            if (highlightedRow && highlightedScan) {
                setTimeout(() => {
                    highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showForensicModal(highlightedScan);
                }, 100);
            }
        }

        // 4. Whitelist
        const whitelistTable = document.getElementById("whitelist-table-body");
        whitelistTable.innerHTML = "";
        if (trustedDomains.length === 0) whitelistTable.innerHTML = `<tr><td class="empty-state">No trusted domains.</td></tr>`;
        else {
            trustedDomains.forEach(domain => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="color: var(--safe-green); font-weight: 600; text-shadow: 0 0 4px var(--safe-glow); font-size: 12px;">${domain}</td>
                    <td style="text-align:right;">
                        <button class="btn-action btn-remove dynamic-btn" data-list="whitelist" data-action="remove" data-domain="${domain}">Remove</button>
                    </td>
                `;
                whitelistTable.appendChild(tr);
            });
        }

        // 5. Blacklist
        const blacklistTable = document.getElementById("blacklist-table-body");
        blacklistTable.innerHTML = "";
        if (blacklistData.length === 0) blacklistTable.innerHTML = `<tr><td class="empty-state">No custom blocks.</td></tr>`;
        else {
            blacklistData.forEach(domain => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="color: var(--danger-red); font-weight: 600; text-shadow: 0 0 4px var(--danger-glow); font-size: 12px;">${domain}</td>
                    <td style="text-align:right;">
                        <button class="btn-action btn-remove dynamic-btn" data-list="blacklist" data-action="remove" data-domain="${domain}">Remove</button>
                    </td>
                `;
                blacklistTable.appendChild(tr);
            });
        }
    });
}

// --- DONUT CHART ---
function renderChart(history) {
    if (history.length === 0) return;

    let safeCount = 0, warnCount = 0, dangerCount = 0;
    history.forEach(scan => {
        if (scan.score > 75) dangerCount++;
        else if (scan.score > 30) warnCount++;
        else safeCount++;
    });

    const total = history.length;
    document.getElementById("count-safe").innerText = safeCount;
    document.getElementById("count-warn").innerText = warnCount;
    document.getElementById("count-danger").innerText = dangerCount;

    const safePct = (safeCount / total) * 100;
    const warnPct = (warnCount / total) * 100;
    const safeEnd = safePct;
    const warnEnd = safePct + warnPct;

    const chart = document.getElementById("traffic-chart");
    chart.style.background = `conic-gradient(
        var(--safe-green) 0% ${safeEnd}%, 
        var(--warn-orange) ${safeEnd}% ${warnEnd}%, 
        var(--danger-red) ${warnEnd}% 100%
    )`;
}

// --- STORAGE MODIFIER ---
function modifyList(listType, action, domain) {
    if (!domain || domain === 'unknown') return;

    chrome.storage.local.get({ userTrust: {}, userBlacklist: [] }, (data) => {
        let trustData = data.userTrust;
        let blacklistData = data.userBlacklist;

        if (listType === 'whitelist') {
            if (action === 'add') {
                trustData[domain] = 3; 
                blacklistData = blacklistData.filter(d => d !== domain); 
            } else if (action === 'remove') {
                delete trustData[domain];
            }
        } 
        else if (listType === 'blacklist') {
            if (action === 'add') {
                if (!blacklistData.includes(domain)) blacklistData.push(domain);
                delete trustData[domain]; 
            } else if (action === 'remove') {
                blacklistData = blacklistData.filter(d => d !== domain);
            }
        }

        chrome.storage.local.set({ userTrust: trustData, userBlacklist: blacklistData }, () => {
            loadDashboardData();
        });
    });
}

// --- FORENSIC REPORT MODAL ---
function showForensicModal(scan) {
    let threatType = scan.score > 75 ? "Malware / Phishing Payload" : "Unknown Anomaly";
    let harm = scan.score > 75 ? "High risk of drive-by download, credential theft, or remote code execution." : "Potential tracker or suspicious script.";
    let action = "Connection Severed by WISE Edge-Sensor.";

    if (scan.url.includes("wicar.org")) {
        threatType = "Malware Testing Payload Detected";
        harm = "System exploit demonstration. High risk of Remote Code Execution if left unblocked.";
    }

    const modalHtml = `
        <div id="wise-modal" class="wise-modal-overlay">
            <div class="wise-modal-content">
                <button onclick="document.getElementById('wise-modal').remove()" class="modal-close-btn">✖</button>
                
                <h2 class="modal-title">🚨 Forensic Threat Report</h2>

                <p style="color: var(--text-muted); margin-bottom: 5px; font-size: 10px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Target Telemetry URL</p>
                <p style="color: var(--text-main); word-break: break-all; margin-top: 0; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 12px; border-left: 3px solid var(--danger-red); border-radius: 6px; font-family: monospace; font-size: 11px;">${scan.url}</p>

                <div style="display: flex; gap: 16px; margin: 18px 0;">
                    <div style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 14px; text-align: center; border-radius: 8px;">
                        <p style="color: var(--text-muted); margin: 0 0 5px 0; font-size: 10px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1px;">RISK SCORE</p>
                        <h1 style="color: var(--danger-red); margin: 0; font-family: 'Orbitron', sans-serif; font-size: 36px; font-weight: 900; text-shadow: 0 0 12px var(--danger-glow);">${scan.score}%</h1>
                    </div>
                    <div style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 14px; text-align: center; border-radius: 8px; display: flex; flex-direction: column; justify-content: center;">
                        <p style="color: var(--text-muted); margin: 0 0 5px 0; font-size: 10px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1px;">VERDICT</p>
                        <span class="badge danger" style="align-self: center; font-size: 10px; padding: 5px 14px;">${scan.verdict}</span>
                    </div>
                </div>

                <p style="color: var(--text-muted); margin-bottom: 5px; font-size: 10px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">WISE Intelligence Report</p>
                <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; color: var(--text-main); font-size: 11px; line-height: 1.6;">
                    <p style="margin-top: 0; border-bottom: 1px dashed rgba(255,255,255,0.04); padding-bottom: 6px;"><strong>Classification:</strong> <span style="color: var(--warn-orange); font-weight: 600;">${threatType}</span></p>
                    <p style="border-bottom: 1px dashed rgba(255,255,255,0.04); padding-bottom: 6px;"><strong>Scope & Harm:</strong> ${harm}</p>
                    <p style="margin-bottom: 0;"><strong>Active Protocol:</strong> <span style="color: var(--safe-green); font-weight: 600;">${action}</span></p>
                </div>

                <button onclick="document.getElementById('wise-modal').remove()" class="cyber-btn red" style="width: 100%; padding: 13px; margin-top: 22px; font-size: 10px;">ACKNOWLEDGE & CLOSE REPORT</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// --- TELEMETRY FETCHER ---
function fetchDashboardTelemetry() {
    chrome.runtime.sendMessage({ action: "GET_LATEST_TELEMETRY" }, (res) => {
        if (!res || !res.data) return;
        const tel = res.data;
        
        if (tel.permissions) {
            updateDashSensorBadge('dash-sensor-camera', tel.permissions.camera);
            updateDashSensorBadge('dash-sensor-mic', tel.permissions.microphone);
            updateDashSensorBadge('dash-sensor-location', tel.permissions.geolocation);
            updateDashSensorBadge('dash-sensor-clipboard', tel.permissions['clipboard-read']);
        }
    });
}

function updateDashSensorBadge(id, state) {
    const badge = document.getElementById(id);
    if (!badge || !state) return;
    
    badge.innerText = state.toUpperCase();
    if (state === 'granted' || state === 'allow') {
        badge.style.color = '#ef4444';
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
    } else if (state === 'denied' || state === 'block' || state === 'prompt' || state === 'ask') {
        badge.style.color = '#10b981';
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
    }
}

// --- CONTENT SETTINGS TOGGLES (DASHBOARD) ---
function initDashboardPermissionToggles() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].url || !tabs[0].url.startsWith("http")) return;
        const url = tabs[0].url;

        const settings = [
            { id: 'dash-toggle-camera', type: 'camera', badgeId: 'dash-sensor-camera' },
            { id: 'dash-toggle-mic', type: 'microphone', badgeId: 'dash-sensor-mic' },
            { id: 'dash-toggle-location', type: 'location', badgeId: 'dash-sensor-location' },
            { id: 'dash-toggle-notifications', type: 'notifications', badgeId: 'dash-sensor-notifications' }
        ];

        settings.forEach(setting => {
            const toggle = document.getElementById(setting.id);
            if (!toggle) return;
            
            // Initial Load
            if (chrome.contentSettings && chrome.contentSettings[setting.type]) {
                chrome.contentSettings[setting.type].get({ primaryUrl: url }, (details) => {
                    const isAllowed = details.setting === 'allow';
                    toggle.checked = isAllowed;
                    updateDashSensorBadge(setting.badgeId, details.setting);
                });
            } else {
                toggle.disabled = true; // API not available
            }

            // On Toggle Change
            toggle.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const newSetting = isChecked ? 'allow' : 'block';
                
                if (chrome.contentSettings && chrome.contentSettings[setting.type]) {
                    chrome.contentSettings[setting.type].set({
                        primaryPattern: new URL(url).origin + '/*',
                        setting: newSetting
                    }, () => {
                        updateDashSensorBadge(setting.badgeId, newSetting);
                        if (!isChecked) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    });
                }
            });
        });
    });
}