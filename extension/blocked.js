// blocked.js - Handles logic for the WISE cyber block screen

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Particle Background
    initParticleCanvas();

    // 2. Extract the URL parameters passed from content.js
    const urlParams = new URLSearchParams(window.location.search);
    const targetUrl = urlParams.get('target');
    const threatType = urlParams.get('reason');

    // 3. Update the UI with specific threat details
    const targetEl = document.getElementById('target-url');
    if (targetUrl) {
        // Truncate if too long to prevent breaking layout
        targetEl.innerText = targetUrl.length > 55 ? targetUrl.substring(0, 52) + "..." : targetUrl;
        targetEl.title = targetUrl; // Tooltip for full URL
    } else {
        targetEl.innerText = "Unknown Target";
    }

    if (threatType) {
        document.getElementById('verdict-text').innerText = threatType.toUpperCase();
        
        // Adjust rationale based on threat type
        const rationale = document.getElementById('rationale-text');
        if (threatType.toLowerCase().includes('phishing')) {
            rationale.innerText = "Target domain exhibits deceptive framing consistent with credential harvesting or spear-phishing campaigns.";
        } else if (threatType.toLowerCase().includes('malware')) {
            rationale.innerText = "Target domain is flagged for hosting malicious payloads, exploit kits, or participating in botnet command-and-control.";
        }
    }

    // 4. Handle "Return to Safety" (Primary Defense)
    document.getElementById('btn-back').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If opened in a new tab with no history, default to Google
            window.location.href = "https://www.google.com";
        }
    });

    // 5. Handle "Threat Telemetry" (View Dashboard)
    document.getElementById('btn-report').addEventListener('click', () => {
        if (targetUrl) {
            // Open dashboard and pass the specific URL to highlight/inspect
            window.open(chrome.runtime.getURL(`dashboard.html?inspect=${encodeURIComponent(targetUrl)}`), "_blank");
        } else {
            window.open(chrome.runtime.getURL("dashboard.html"), "_blank");
        }
    });

    // 6. Handle "Bypass Warning" (Add to Trust & Reload)
    document.getElementById('btn-proceed').addEventListener('click', () => {
        if (targetUrl && confirm("WARNING: Proceeding to this site may compromise your system or steal credentials. Are you absolutely sure you want to bypass WISE security?")) {
            // Tell background.js to add a strike to the user trust counter (whitelist it)
            chrome.runtime.sendMessage({ action: "USER_BYPASS", url: targetUrl });
            
            // Give the background script a tiny fraction of a second to save state, then go
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 150);
        }
    });
});

// ===== PARTICLE CANVAS BACKGROUND =====
// Reusing the lightweight 2D canvas particle effect for the blocked page
function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    // Handle resize
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    // More intense/erratic particles for the blocked screen
    const count = 40; 
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.8, // Faster movement
            vy: (Math.random() - 0.5) * 0.8,
            r: Math.random() * 2 + 1
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, width, height);
        // Red tinted particles
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
        
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
                if (dist < 100) {
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