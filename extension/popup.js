// popup.js - WISE Cyberpunk Popup Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Tabs
    document.getElementById('tab-scan').addEventListener('click', () => switchTab('scan'));
    document.getElementById('tab-history').addEventListener('click', () => switchTab('history'));

    // 2. Load Data on Startup
    requestScan();
    loadHistory();

    // 3. Initialize Live Systems
    initLiveClock();
    initNetworkIntel();
    initParticleCanvas();

    // 4. Re-Scan Button
    document.getElementById('scan-btn').addEventListener('click', requestScan);
    
    // 5. Clear Visual Logs Only
    document.getElementById('clear-history').addEventListener('click', () => {
        document.getElementById('history-list').innerHTML = "<div class='empty-logs'>Logs cleared.</div>";
    });

    // 6. Open Dashboard
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });

    // 7. Reset Memory
    document.getElementById('btn-reset').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "RESET_MEMORY" }, (response) => {
            if (response && response.success) {
                const btn = document.getElementById('btn-reset');
                const btnText = btn.querySelector('.btn-text');
                if (btnText) btnText.innerText = "✅ MEMORY WIPED";
                btn.style.borderColor = "var(--safe-green)";
                btn.style.color = "var(--safe-green)";
                
                setTimeout(() => {
                    loadHistory(); 
                    if (btnText) btnText.innerText = "⚠️ RESET USER EXEMPTIONS";
                    btn.style.borderColor = "";
                    btn.style.color = "";
                }, 2000);
            }
        });
    });
});

// ===== LIVE CLOCK =====
function initLiveClock() {
    function update() {
        const now = new Date();
        
        const timeEl = document.getElementById("live-time");
        const dateEl = document.getElementById("live-date");
        
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        }
        
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
        }
    }
    update();
    setInterval(update, 1000);
}

// ===== NETWORK INTELLIGENCE =====
function initNetworkIntel() {
    function update() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        const typeEl = document.getElementById("net-type");
        const ssidEl = document.getElementById("net-ssid");
        const downEl = document.getElementById("net-downlink");
        const rttEl = document.getElementById("net-rtt");
        const speedEl = document.getElementById("net-speed");
        const badgeEl = document.getElementById("net-secure-badge");
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        // Online/Offline status
        const isOnline = navigator.onLine;
        if (statusDot) {
            statusDot.className = 'status-dot ' + (isOnline ? 'online' : 'offline');
        }
        if (statusText) {
            statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
            statusText.style.color = isOnline ? 'var(--safe-green)' : 'var(--danger-red)';
        }
        
        if (conn) {
            // Connection type
            const connType = conn.effectiveType || conn.type || 'Unknown';
            const connLabel = {
                'slow-2g': 'Slow 2G',
                '2g': '2G Mobile',
                '3g': '3G Mobile',
                '4g': '4G / WiFi',
                'wifi': 'WiFi',
                'ethernet': 'Ethernet',
                'cellular': 'Cellular',
                'bluetooth': 'Bluetooth',
                'none': 'Disconnected'
            };
            
            if (typeEl) typeEl.textContent = connLabel[connType] || connType.toUpperCase();
            
            // Downlink speed
            const downlink = conn.downlink;
            if (downEl) downEl.textContent = downlink ? `${downlink} Mbps` : '-- Mbps';
            if (speedEl) speedEl.textContent = downlink ? `${downlink} Mbps` : '--';
            
            // RTT latency
            const rtt = conn.rtt;
            if (rttEl) {
                rttEl.textContent = rtt !== undefined ? `${rtt} ms` : '-- ms';
                rttEl.style.color = rtt < 100 ? 'var(--safe-green)' : rtt < 300 ? 'var(--warn-orange)' : 'var(--danger-red)';
            }
            
            // Save data detection
            const saveData = conn.saveData;
            
            // SSID (not directly available via API — infer from context)
            if (ssidEl) {
                if (connType === '4g' || connType === 'wifi') {
                    ssidEl.textContent = 'WiFi Connected';
                    ssidEl.style.color = 'var(--safe-green)';
                } else if (connType === '3g' || connType === '2g' || connType === 'slow-2g') {
                    ssidEl.textContent = 'Mobile Data';
                    ssidEl.style.color = 'var(--warn-orange)';
                } else if (connType === 'ethernet') {
                    ssidEl.textContent = 'Wired (Ethernet)';
                    ssidEl.style.color = 'var(--safe-green)';
                } else {
                    ssidEl.textContent = isOnline ? 'Connected' : 'Disconnected';
                    ssidEl.style.color = isOnline ? 'var(--text-main)' : 'var(--danger-red)';
                }
            }
            
            // Security assessment
            if (badgeEl) {
                const isSecure = window.location.protocol === 'chrome-extension:' || window.location.protocol === 'https:';
                if (!isOnline) {
                    badgeEl.textContent = '⚠ OFFLINE';
                    badgeEl.className = 'net-badge unsecure';
                } else if (isSecure && rtt && rtt < 200 && downlink > 1) {
                    badgeEl.textContent = '🔒 SECURED';
                    badgeEl.className = 'net-badge secure';
                } else if (isSecure) {
                    badgeEl.textContent = '🔒 SECURED';
                    badgeEl.className = 'net-badge secure';
                } else {
                    badgeEl.textContent = '⚠ UNSECURED';
                    badgeEl.className = 'net-badge unsecure';
                }
            }
        } else {
            // Fallback when Network Information API is not available
            if (typeEl) typeEl.textContent = isOnline ? 'Connected' : 'Offline';
            if (ssidEl) {
                ssidEl.textContent = isOnline ? 'Network Active' : 'Disconnected';
                ssidEl.style.color = isOnline ? 'var(--safe-green)' : 'var(--danger-red)';
            }
            if (downEl) downEl.textContent = '-- Mbps';
            if (rttEl) rttEl.textContent = '-- ms';
            if (speedEl) speedEl.textContent = isOnline ? 'Active' : 'None';
            
            if (badgeEl) {
                if (isOnline) {
                    badgeEl.textContent = '🔒 SECURED';
                    badgeEl.className = 'net-badge secure';
                } else {
                    badgeEl.textContent = '⚠ OFFLINE';
                    badgeEl.className = 'net-badge unsecure';
                }
            }
        }
    }
    
    update();
    setInterval(update, 3000);
    
    // Listen for network changes
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (navigator.connection) {
        navigator.connection.addEventListener('change', update);
    }
}

// ===== PARTICLE CANVAS BACKGROUND =====
function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    const particles = [];
    const count = 35;
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.2 + 0.5
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
        
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            
            for (let j = i + 1; j < count; j++) {
                const q = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// ===== TAB SWITCHING =====
function switchTab(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.getElementById(`tab-${viewName}`).classList.add('active');

    if (viewName === 'history') loadHistory();
}

// ===== SCAN REQUEST =====
function requestScan() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.url) {
            document.getElementById('domain-name').innerText = new URL(tabs[0].url).hostname;
            chrome.runtime.sendMessage({ action: "ANALYZE_URL", url: tabs[0].url }, (response) => {
                if (response && response.success && response.data) {
                     updateDashboard(response.data);
                }
            });
        }
    });
}

// ===== UPDATE DASHBOARD =====
function updateDashboard(data) {
    if (!data) return;

    const score = data.risk_score || 0;
    const ring = document.getElementById('score-ring');
    const scoreNum = document.getElementById('score-num');
    
    scoreNum.innerText = score;
    
    let color = 'var(--primary-cyan)';
    if (score > 30) color = 'var(--warn-orange)';
    if (score > 75) color = 'var(--danger-red)';

    ring.style.borderTopColor = color;
    ring.style.boxShadow = `0 0 12px ${color}`;
    scoreNum.style.color = color;
    scoreNum.style.textShadow = `0 0 10px ${color}`;

    // Harm Box
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
    
    const vtDisplay = data.vt_verdict || (data.vt_data ? `Vendors Flagged: ${data.vt_data.malicious}` : "--");
    document.getElementById('vt-data').innerText = vtDisplay;
}

// ===== LOAD HISTORY =====
function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = ""; 

    chrome.storage.local.get({ scanHistory: [] }, (result) => {
        const history = result.scanHistory.reverse(); 

        if (history.length === 0) {
            list.innerHTML = "<div class='empty-logs'>No recent scans detected.</div>";
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
                    <div class="h-url">${item.url.substring(0, 28)}...</div>
                    <div class="h-info">${item.reason || "Scan"} | ${item.date}</div>
                </div>
                <div class="h-score ${colorClass}">${item.score}</div>
            `;
            list.appendChild(div);
        });
    });
}

// ===== LIVE LISTENER =====
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "SCAN_RESULT") {
        updateDashboard(req.data);
    }
});