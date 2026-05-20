// dashboard.js - WISE Command Center Logic

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    init3DTilt();
    initSpotlightGlow();
    initBackgroundParticles();

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

// --- SPOTLIGHT HOVER GLOW SYSTEM ---
function initSpotlightGlow() {
    const cards = document.querySelectorAll('.interactive-3d');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

// --- DYNAMIC BACKGROUND NETWORK NODES ---
function initBackgroundParticles() {
    const canvas = document.createElement("canvas");
    canvas.id = "cyber-bg-canvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.opacity = "0.35";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const maxParticles = 60;

    for (let i = 0; i < maxParticles; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 1.5 + 0.8
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0, 243, 255, 0.25)";
        ctx.strokeStyle = "rgba(0, 243, 255, 0.04)";

        for (let i = 0; i < maxParticles; i++) {
            const p1 = particles[i];
            p1.x += p1.vx;
            p1.y += p1.vy;

            if (p1.x < 0 || p1.x > width) p1.vx *= -1;
            if (p1.y < 0 || p1.y > height) p1.vy *= -1;

            ctx.beginPath();
            ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
            ctx.fill();

            for (let j = i + 1; j < maxParticles; j++) {
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 110) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// --- FORENSIC REPORT MODAL GENERATOR ---
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
                <p style="color: var(--text-main); word-break: break-all; margin-top: 0; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 12px; border-left: 3px solid var(--danger-red); border-radius: 6px; font-family: monospace; font-size: 12px;">${scan.url}</p>

                <div style="display: flex; gap: 20px; margin: 20px 0;">
                    <div style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 15px; text-align: center; border-radius: 8px;">
                        <p style="color: var(--text-muted); margin: 0 0 5px 0; font-size: 11px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1px;">RISK SCORE</p>
                        <h1 style="color: var(--danger-red); margin: 0; font-family: 'Orbitron', sans-serif; font-size: 38px; font-weight: 900; text-shadow: 0 0 10px var(--danger-glow);">${scan.score}%</h1>
                    </div>
                    <div style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 15px; text-align: center; border-radius: 8px; display: flex; flex-direction: column; justify-content: center;">
                        <p style="color: var(--text-muted); margin: 0 0 5px 0; font-size: 11px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1px;">VERDICT</p>
                        <span class="badge danger" style="align-self: center; font-size: 11px; padding: 6px 12px;">${scan.verdict}</span>
                    </div>
                </div>

                <p style="color: var(--text-muted); margin-bottom: 5px; font-size: 10px; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">WISE Cognitive Intelligence Report</p>
                <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; color: var(--text-main); font-size: 12px; line-height: 1.6;">
                    <p style="margin-top: 0; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;"><strong>Classification:</strong> <span style="color: var(--warn-orange); font-weight: 600;">${threatType}</span></p>
                    <p style="border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;"><strong>Scope & Harm:</strong> ${harm}</p>
                    <p style="margin-bottom: 0;"><strong>Active Protocol:</strong> <span style="color: var(--safe-green); font-weight: 600;">${action}</span></p>
                </div>

                <button onclick="document.getElementById('wise-modal').remove()" class="cyber-btn primary" style="width: 100%; padding: 14px; margin-top: 25px; font-size: 11px;">ACKNOWLEDGE & CLOSE REPORT</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}