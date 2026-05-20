// hover_script.js - WISE Heads-Up Display (Optimized for API Limits)

let hoverTimer = null;
let currentHUD = null;

console.log("[WISE] Link Hover Scanner Active.");

// =========================================================================
// 🛑 MASS SCANNER DISABLED TO PREVENT "429 TOO MANY REQUESTS" API CRASHES
// For the presentation, we rely on Active Tab scanning + Hover scanning
// =========================================================================
/*
function scanPageLinks() {
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
        if (link.hasAttribute('data-wise-scanned')) return;
        link.setAttribute('data-wise-scanned', 'true');
        chrome.runtime.sendMessage({ action: "scan_link_heuristic", url: link.href }, (response) => {
            if (response && response.risk_score > 75) {
                link.classList.add('wise-blocked-link');
                link.innerText = `[🚨 WISE BLOCKED: PHISHING] ${link.innerText}`;
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    alert("WISE IPS: Connection to this hostile domain has been severed.");
                }, true);
            }
        });
    });
}
scanPageLinks();
const linkObserver = new MutationObserver(() => scanPageLinks());
linkObserver.observe(document.body, { childList: true, subtree: true });
*/

// --- HELPERS ---
function formatAge(days) {
    if (days === "Hidden" || days === -1 || !days) return "❓ Age Unknown";
    const d = parseInt(days);
    if (isNaN(d)) return "❓ Data Unavailable";
    if (d < 30) return `⚠️ Fresh Site (${d} days)`;
    if (d < 365) return `📅 ${Math.floor(d/30)} Months Old`;
    return `🛡️ ${(d/365).toFixed(1)} Years Old`;
}

function formatVT(vt) {
    if (!vt || !vt.total || vt.total === "Database" || vt.total === "N/A") return "📡 No Database Match";
    if (vt.malicious > 0) return `🦠 ${vt.malicious}/${vt.total} Vendors Flagged This`;
    
    if (vt.total === "Tranco" || vt.total === "Local") return `✅ Clean (${vt.total} Database)`;
    
    return `✅ Clean (${vt.total} Engines)`;
}

// --- LISTENERS ---
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a');
    if (target && target.href.startsWith('http') && target.href !== window.location.href) {
        clearTimeout(hoverTimer);
        // Wait 800ms to ensure the user is actually reading the link before spending an API call
        hoverTimer = setTimeout(() => showHUD(target, target.href), 800);
    }
});

document.addEventListener('mouseout', (e) => {
    clearTimeout(hoverTimer);
    if (currentHUD) {
        currentHUD.remove();
        currentHUD = null;
    }
});

// --- UI LOGIC ---
function showHUD(element, url) {
    if (currentHUD) currentHUD.remove();
    const hud = document.createElement('div');
    currentHUD = hud;
    
    hud.style.cssText = `
        position: absolute; z-index: 2147483647;
        background: rgba(6, 10, 18, 0.95); border: 1px solid rgba(0, 243, 255, 0.3);
        color: #e2e8f0; padding: 18px; border-radius: 8px;
        font-family: 'Sora', 'Segoe UI', sans-serif; font-size: 12px;
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 243, 255, 0.15);
        min-width: 280px; pointer-events: none; text-align: left; opacity: 0; 
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    const rect = element.getBoundingClientRect();
    hud.style.top = (window.scrollY + rect.bottom + 12) + 'px';
    hud.style.left = (window.scrollX + rect.left) + 'px';
    
    hud.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #00f3ff; box-shadow: 0 0 12px #00f3ff; animation: pulse 1.5s infinite;"></div>
            <span id="wise-hud-status" style="font-family: 'Orbitron', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 11px; color: #00f3ff;">SCANNING TARGET...</span>
        </div>
        <style>@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }</style>
    `;
    
    document.body.appendChild(hud);
    requestAnimationFrame(() => hud.style.opacity = '1');

    // Cloud Status Monitors
    let isResponded = false;
    
    const wakeTimer = setTimeout(() => {
        if (!isResponded && currentHUD === hud) {
            const statusSpan = hud.querySelector('#wise-hud-status');
            if (statusSpan) {
                statusSpan.innerText = "WAKING CLOUD AI...";
                statusSpan.style.color = "#ffa500";
            }
        }
    }, 2500);

    const killTimer = setTimeout(() => {
        if (!isResponded && currentHUD === hud) {
            hud.innerHTML = `<div style="color:#ff4c4c; font-weight:bold;">⚠️ CLOUD API TIMEOUT</div>`;
            setTimeout(() => { if (currentHUD === hud) hud.remove(); }, 2000);
        }
    }, 12000);

    // DELEGATE TO BACKGROUND SCRIPT
    chrome.runtime.sendMessage({ action: "ANALYZE_URL", url: url }, (response) => {
        isResponded = true;
        clearTimeout(wakeTimer);
        clearTimeout(killTimer);
        
        if (chrome.runtime.lastError) {
            if (currentHUD === hud) hud.remove();
            return;
        }

        if (currentHUD !== hud) return;

        if (!response || !response.success) {
            hud.innerHTML = `<div style="color:#ef4444; font-weight: 600;">⚠️ Analysis Failed</div>`;
            setTimeout(() => { if (currentHUD === hud) hud.remove(); }, 1500);
            return;
        }

        const data = response.data;
        let color = '#00f3ff';
        let shadowColor = 'rgba(0, 243, 255, 0.2)';
        if (data.risk_score > 30) { color = '#f59e0b'; shadowColor = 'rgba(245, 158, 11, 0.2)'; }
        if (data.risk_score > 75) { color = '#ef4444'; shadowColor = 'rgba(239, 68, 68, 0.2)'; }

        hud.style.borderColor = color;
        hud.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px ${shadowColor}`;

        hud.innerHTML = `
            <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">WISE PROTOCOL</span>
                <span style="color: ${color}; font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 14px; text-shadow: 0 0 10px ${shadowColor};">RISK: ${data.risk_score}%</span>
            </div>
            <div style="margin-bottom: 8px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
                <span style="background: rgba(255, 255, 255, 0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1); font-size: 11px;">${formatAge(data.domain_age)}</span>
            </div>
            <div style="margin-bottom: 12px; font-size: 11px; color: #94a3b8; line-height: 1.4;">${formatVT(data.vt_data)}</div>
            ${data.risk_score > 0 ? 
                `<div style="color: ${color}; font-weight: 600; font-size: 11px; background: ${shadowColor}; padding: 8px; border-radius: 4px; border: 1px solid ${color};">⚠️ ${data.threat_type || "Threat Detected"}</div>` : 
                `<div style="color: #10b981; font-weight: 600; font-size: 11px; background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 4px; border: 1px solid #10b981;">✅ VERIFIED SAFE TARGET</div>`
            }
        `;
    });
}