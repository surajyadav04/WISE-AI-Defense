# WADE: Web AI Defense Engine 🛡️

![Version](https://img.shields.io/badge/version-5.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![Status](https://img.shields.io/badge/status-Stable-success)

**WADE (Web AI Defense Engine)** is a cloud-integrated browser Intrusion Prevention System (IPS). It utilizes **Generative AI (Groq Llama-3 & Google Gemini)** and **OSINT Threat Intelligence** to detect zero-day phishing, malicious scripts, and social engineering in real-time.

---

## 🏗️ Architecture
1. **The Edge Sensor:** Chrome Extension (Manifest V3) that intercepts navigation.
2. **The Intelligence Core:** FastAPI backend hosted on Hugging Face; orchestrates OSINT lookups and LLM analysis.
3. **The Analytics Center:** A glass-morphic dashboard for visualizing threat logs.

---

## 🚀 Key Features

### 1. Interactive HUD Scanner
Hover over links to see an instant risk assessment before you click.
* **Safe Target:** ![Safe HUD](assets/hud-safe.jpg)
* **High-Risk Payload:** ![Malicious HUD](assets/hud-malicious.jpg)

### 2. Real-Time Intervention
When a threat is confirmed (>75% risk), WADE forces an isolation screen.
![WADE Block Screen](assets/blocked.png)

### 3. Forensic Threat Reporting
Click "View Threat Report" to generate an AI-powered forensic breakdown.
![Forensic Threat Report](assets/report.png)

### 4. 3D Analytics Dashboard
Visualize your security telemetry with our custom glass-morphic Command Center.
![WADE Dashboard](assets/dashboard.png)

---

## 🛠️ Tech Stack
* **AI:** Groq API (Llama 3.3 70B), Google Gemini 1.5 Flash
* **Backend:** Python, FastAPI, SQLite3
* **Frontend:** JavaScript, Chrome Manifest V3, CSS3 3D
* **Threat Intel:** VirusTotal v3, URLHaus, Phishing.Database

---

## 📦 Quick Start
1. **Clone:** `git clone https://github.com/Ghost19-ui/WADE-AI-Defense.git`
2. **Backend:** Set API keys (`GROQ`, `GEMINI`, `VIRUSTOTAL`) and run `python app.py`.
3. **Extension:** Load the `/extension` folder in `chrome://extensions/`.

---

## 👨‍💻 Author
**Tushar Kumar Saini** | Cybersecurity Strategist & B.Tech CSE Student, Parul University.