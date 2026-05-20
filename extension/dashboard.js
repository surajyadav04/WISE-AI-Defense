// dashboard.js - WISE Command Center Logic

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    init3DTilt();

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
                resultBox.innerHTML = `✅ <span style="color:#00ff66; text-shadow: 0 0 10px #00ff66;">${query}</span> is in the Tranco Database!`;
            } else {
                resultBox.innerHTML = `⚠️ <span style="color:#ffa500; text-shadow: 0 0 10px #ffa500;">${query}</span> requires AI Scan.`;
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

// --- THE 3D HOLOGRAPHIC TILT ENGINE ---
function init3DTilt() {
    const cards = document.querySelectorAll('.interactive-3d');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; 
            const y = e.clientY - rect.top;  
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -6; 
            const rotateY = ((x - centerX) / centerX) * 6;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

function loadDashboardData() {
    chrome.storage.local.get({ scanHistory: [], userTrust: {}, userBlacklist: [] }, (data) => {
        const history = data.scanHistory.reverse();
        const trustData = data.userTrust;
        const blacklistData = data.userBlacklist;
        
        const urlParams = new URLSearchParams(window.location.search);
        const inspectUrl = urlParams.get('inspect');
        let highlightedRow = null;
        let highlightedScan = null; // Store the data for the modal

        // 1. Calculate Stats
        const trustedDomains = Object.keys(trustData).filter(d => trustData[d] >= 2);
        document.getElementById("stat-total-scans").innerText = history.length;
        document.getElementById("stat-blocked").innerText = blacklistData.length;
        document.getElementById("stat-trusted").innerText = trustedDomains.length;

        // 2. Render Analytics Chart
        renderChart(history);

        // 3. Populate History
        const historyTable = document.getElementById("history-table-body");
        historyTable.innerHTML = "";
        if (history.length === 0) {
            historyTable.innerHTML = `<tr><td colspan="5" class="empty-state">No scans logged.</td></tr>`;
        } else {
            history.forEach(scan => {
                let hostname = "unknown";
                try { hostname = new URL(scan.url).hostname; } catch(e) {}

                const tr = document.createElement("tr");
                let badgeClass = scan.score > 75 ? "danger" : (scan.score > 30 ? "warning" : "safe");
                let badgeText = scan.score > 75 ? "BLOCKED" : (scan.score > 30 ? "WARNING" : "SAFE");
                const displayUrl = scan.url.length > 35 ? scan.url.substring(0, 35) + "..." : scan.url;

                tr.innerHTML = `
                    <td style="color: var(--text-muted);">${scan.date || "Just now"}</td>
                    <td title="${scan.url}">${displayUrl}</td>
                    <td style="color: var(--primary-cyan); font-weight:bold; text-shadow: 0 0 5px var(--primary-glow);">${scan.score}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        <button class="btn-action btn-white dynamic-btn" data-list="whitelist" data-action="add" data-domain="${hostname}">Trust</button>
                        <button class="btn-action btn-black dynamic-btn" data-list="blacklist" data-action="add" data-domain="${hostname}">Block</button>
                    </td>
                `;

                if (inspectUrl && scan.url.includes(inspectUrl)) {
                    tr.style.backgroundColor = "rgba(255, 0, 60, 0.25)";
                    tr.style.boxShadow = "inset 0 0 10px rgba(255, 0, 60, 0.8)";
                    highlightedRow = tr;
                    highlightedScan = scan; // Capture data for the modal
                }

                historyTable.appendChild(tr);
            });

            // Trigger smooth scroll and open Forensic Modal
            if (highlightedRow && highlightedScan) {
                setTimeout(() => {
                    highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showForensicModal(highlightedScan);
                }, 100);
            }
        }

        // 4. Populate Whitelist
        const whitelistTable = document.getElementById("whitelist-table-body");
        whitelistTable.innerHTML = "";
        if (trustedDomains.length === 0) whitelistTable.innerHTML = `<tr><td class="empty-state">No trusted domains.</td></tr>`;
        else {
            trustedDomains.forEach(domain => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="color: var(--safe-green); font-weight: bold; text-shadow: 0 0 5px rgba(0,255,102,0.4);">${domain}</td>
                    <td style="text-align:right;">
                        <button class="btn-action btn-remove dynamic-btn" data-list="whitelist" data-action="remove" data-domain="${domain}">Remove</button>
                    </td>
                `;
                whitelistTable.appendChild(tr);
            });
        }

        // 5. Populate Blacklist
        const blacklistTable = document.getElementById("blacklist-table-body");
        blacklistTable.innerHTML = "";
        if (blacklistData.length === 0) blacklistTable.innerHTML = `<tr><td class="empty-state">No custom blocks.</td></tr>`;
        else {
            blacklistData.forEach(domain => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="color: var(--danger-red); font-weight: bold; text-shadow: 0 0 5px var(--danger-glow);">${domain}</td>
                    <td style="text-align:right;">
                        <button class="btn-action btn-remove dynamic-btn" data-list="blacklist" data-action="remove" data-domain="${domain}">Remove</button>
                    </td>
                `;
                blacklistTable.appendChild(tr);
            });
        }
    });
}

// --- PURE CSS DONUT CHART LOGIC ---
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

// --- STORAGE MODIFICATION LOGIC ---
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

// --- FORENSIC REPORT MODAL GENERATOR ---
function showForensicModal(scan) {
    // Generate contextual data based on the AI's risk score
    let threatType = scan.score > 75 ? "Malware / Phishing Payload" : "Unknown Anomaly";
    let harm = scan.score > 75 ? "High risk of drive-by download, credential theft, or remote code execution." : "Potential tracker or suspicious script.";
    let action = "Connection Severed by WISE Edge-Sensor.";

    // Hardcoded context specifically for the presentation demo
    if (scan.url.includes("wicar.org")) {
        threatType = "Malware Testing Payload Detected";
        harm = "System exploit demonstration. High risk of Remote Code Execution if left unblocked.";
    }

    const modalHtml = `
        <div id="wise-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999; display:flex; justify-content:center; align-items:center;">
            <div style="background:#0a0a0c; border:1px solid #ff003c; box-shadow:0 0 40px rgba(255,0,60,0.4); width:600px; padding:30px; font-family:'Courier New', monospace; color:#00f3ff; border-radius:8px; position:relative;">
                <button onclick="document.getElementById('wise-modal').remove()" style="position:absolute; top:10px; right:15px; background:transparent; border:none; color:#ff003c; font-size:20px; cursor:pointer;">✖</button>
                
                <h2 style="color:#ff003c; text-transform:uppercase; border-bottom:1px solid #ff003c; padding-bottom:10px; margin-top:0;">🚨 Forensic Threat Report</h2>

                <p style="color:#888; margin-bottom:5px; font-size:12px;">TARGET URL</p>
                <p style="color:#fff; word-break:break-all; margin-top:0; background:#111; padding:10px; border-left:3px solid #ff003c;">${scan.url}</p>

                <div style="display:flex; gap:20px; margin:20px 0;">
                    <div style="flex:1; background:#111; padding:15px; text-align:center; border-radius:4px; border:1px solid #333;">
                        <p style="color:#888; margin:0 0 5px 0; font-size:12px;">RISK SCORE</p>
                        <h1 style="color:#ff003c; margin:0; font-size:40px; text-shadow: 0 0 10px #ff003c;">${scan.score}%</h1>
                    </div>
                    <div style="flex:1; background:#111; padding:15px; text-align:center; border-radius:4px; border:1px solid #333;">
                        <p style="color:#888; margin:0 0 5px 0; font-size:12px;">VERDICT</p>
                        <h1 style="color:#ff003c; margin:0; font-size:28px; margin-top:10px;">${scan.verdict}</h1>
                    </div>
                </div>

                <p style="color:#888; margin-bottom:5px; font-size:12px;">AI THREAT ANALYSIS</p>
                <div style="background:#111; padding:15px; border-radius:4px; color:#ddd; line-height:1.6; border:1px solid #333;">
                    <p style="margin-top:0;"><strong>Classification:</strong> <span style="color:#ffa500">${threatType}</span></p>
                    <p><strong>Scope & Harm:</strong> ${harm}</p>
                    <p style="margin-bottom:0;"><strong>WISE Protocol:</strong> <span style="color:#00ff66">${action}</span></p>
                </div>

                <button onclick="document.getElementById('wise-modal').remove()" style="margin-top:25px; width:100%; padding:15px; background:#ff003c; color:#fff; border:none; font-weight:bold; font-size:16px; font-family:'Courier New', monospace; cursor:pointer; letter-spacing:2px; transition:0.3s;" onmouseover="this.style.background='#cc0030'" onmouseout="this.style.background='#ff003c'">ACKNOWLEDGE & CLOSE</button>
            </div>
        </div>
    `;
    
    // Inject the modal into the dashboard
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}