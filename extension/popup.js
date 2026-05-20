// popup.js - Handles WISE UI Interactions

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Tabs
    document.getElementById('tab-scan').addEventListener('click', () => switchTab('scan'));
    document.getElementById('tab-history').addEventListener('click', () => switchTab('history'));

    // 2. Load Data on Startup
    requestScan();
    loadHistory();

    // 3. Re-Scan Button
    document.getElementById('scan-btn').addEventListener('click', requestScan);
    
    // 4. Clear Visual Logs Only
    document.getElementById('clear-history').addEventListener('click', () => {
        document.getElementById('history-list').innerHTML = "<div style='text-align:center; color:#555;'>Logs cleared.</div>";
    });

    // 5. OPEN DASHBOARD BUTTON (Added!)
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });

    // 6. RESET MEMORY BUTTON (The Undo Logic)
    document.getElementById('btn-reset').addEventListener('click', () => {
        // Send command to Background.js to wipe the "User Trust" database
        chrome.runtime.sendMessage({ action: "RESET_MEMORY" }, (response) => {
            if (response && response.success) {
                const btn = document.getElementById('btn-reset');
                btn.innerText = "✅ MEMORY WIPED";
                btn.style.borderColor = "#00ff00";
                btn.style.color = "#00ff00";
                
                // Refresh history to show it's empty/reset
                setTimeout(() => {
                    loadHistory(); 
                    btn.innerText = "⚠️ RESET TRUSTED SITES";
                    btn.style.borderColor = "#ff003c";
                    btn.style.color = "#ff003c";
                }, 2000);
            }
        });
    });
});

// --- UI HELPERS ---

function switchTab(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.getElementById(`tab-${viewName}`).classList.add('active');

    if (viewName === 'history') loadHistory();
}

function requestScan() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.url) {
            document.getElementById('domain-name').innerText = new URL(tabs[0].url).hostname;
            chrome.runtime.sendMessage({ action: "ANALYZE_URL", url: tabs[0].url }, (response) => {
                // Ignore the response here if we're relying on the background script to send SCAN_RESULT
                if (response && response.success && response.data) {
                     updateDashboard(response.data);
                }
            });
        }
    });
}

function updateDashboard(data) {
    if (!data) return;

    // Score Ring
    const score = data.risk_score || 0;
    const ring = document.getElementById('score-ring');
    const scoreNum = document.getElementById('score-num');
    
    scoreNum.innerText = score;
    
    let color = '#00f3ff'; // Cyan
    if (score > 30) color = '#ffa500'; // Orange
    if (score > 75) color = '#ff003c'; // Red

    ring.style.borderColor = color;
    scoreNum.style.color = color;

    // Harm Box (Threat Info)
    const harmBox = document.getElementById('harm-display');
    if (score > 50) {
        harmBox.style.display = 'block';
        document.getElementById('harm-cause').innerText = data.threat_type || "Unknown Threat";
        document.getElementById('harm-effect').innerText = data.harm || "Potential Security Risk";
    } else {
        harmBox.style.display = 'none';
    }

    // Details
   if (data.target_domain) {
    document.getElementById('domain-name').innerText = data.target_domain;
}
    document.getElementById('domain-name').style.color = color;
    document.getElementById('domain-age').innerText = data.domain_age || "--";
    
    // Fallback if vt_verdict isn't explicitly passed, use the total to show it scanned
    const vtDisplay = data.vt_verdict || (data.vt_data ? `Vendors Flagged: ${data.vt_data.malicious}` : "--");
    document.getElementById('vt-data').innerText = vtDisplay;
}

function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = ""; 

    chrome.storage.local.get({ scanHistory: [] }, (result) => {
        const history = result.scanHistory.reverse(); 

        if (history.length === 0) {
            list.innerHTML = "<div style='text-align:center; color:#555; margin-top:20px;'>No recent scans.</div>";
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            let colorClass = 'safe';
            if (item.score > 30) colorClass = 'sus';
            if (item.score > 75) colorClass = 'danger';
            
            div.innerHTML = `
                <div>
                    <div class="h-url" style="color:white;">${item.url.substring(0, 25)}...</div>
                    <div style="font-size:9px; color:#666;">${item.reason || "Scan"} | ${item.date}</div>
                </div>
                <div class="h-score ${colorClass}">${item.score}</div>
            `;
            list.appendChild(div);
        });
    });
}

// Live Listener
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "SCAN_RESULT") {
        updateDashboard(req.data);
    }
});