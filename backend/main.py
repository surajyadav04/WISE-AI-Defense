import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict

app = FastAPI(title="WISE Real-Time SOC Backend")

# Allow all for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.dashboard_connections: List[WebSocket] = []
        # Store latest state for new connections
        self.latest_telemetry: Dict[str, dict] = {}

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_connections.append(websocket)
        # Send initial state
        await websocket.send_json({"type": "INITIAL_STATE", "data": self.latest_telemetry})

    def disconnect_dashboard(self, websocket: WebSocket):
        self.dashboard_connections.remove(websocket)

    async def broadcast_to_dashboards(self, message: dict):
        for connection in self.dashboard_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

def run_ai_analysis(payload: dict) -> dict:
    """Simulated AI Risk Scoring Engine"""
    domain = payload.get("domain", "unknown")
    event_type = payload.get("type", "")
    
    score_penalty = 0
    explanation = ""
    
    if event_type == "FINGERPRINT_ATTEMPT":
        score_penalty = 20
        explanation = f"Detected fingerprinting attempt via {payload.get('data', {}).get('method')}."
    elif event_type == "DEVICE_ACCESS":
        score_penalty = 40
        explanation = f"Site requested sensitive device access: {payload.get('data', {}).get('constraints')}."
    elif event_type == "POPUP_ATTEMPT":
        score_penalty = 10
        explanation = "Site attempted to launch a popup window."
    elif event_type == "PERMISSION_STATUS":
        state = payload.get('data', {}).get('state')
        perm = payload.get('data', {}).get('permission')
        if state == "granted" and perm in ["camera", "microphone"]:
            score_penalty = 15
            explanation = f"Site has active access to {perm}."
            
    return {
        "risk_penalty": score_penalty,
        "ai_explanation": explanation
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """Endpoint for Chrome Extension to stream raw telemetry"""
    await websocket.accept()
    print("Extension telemetry stream connected.")
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            domain = payload.get("domain")
            
            if domain:
                if domain not in manager.latest_telemetry:
                    manager.latest_telemetry[domain] = {
                        "events": [],
                        "risk_score": 0,
                        "ai_explanations": []
                    }
                
                # Analyze event
                analysis = run_ai_analysis(payload)
                
                # Update state
                manager.latest_telemetry[domain]["events"].append(payload)
                manager.latest_telemetry[domain]["risk_score"] = min(100, manager.latest_telemetry[domain]["risk_score"] + analysis["risk_penalty"])
                
                if analysis["ai_explanation"]:
                    manager.latest_telemetry[domain]["ai_explanations"].append({
                        "time": payload.get("timestamp"),
                        "text": analysis["ai_explanation"]
                    })
                
                # Limit history
                if len(manager.latest_telemetry[domain]["events"]) > 50:
                    manager.latest_telemetry[domain]["events"].pop(0)
                if len(manager.latest_telemetry[domain]["ai_explanations"]) > 10:
                    manager.latest_telemetry[domain]["ai_explanations"].pop(0)

                # Broadcast to dashboards
                await manager.broadcast_to_dashboards({
                    "type": "TELEMETRY_UPDATE",
                    "domain": domain,
                    "event": payload,
                    "state": manager.latest_telemetry[domain]
                })

    except WebSocketDisconnect:
        print("Extension telemetry stream disconnected.")

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """Endpoint for Next.js SOC Dashboard"""
    await manager.connect_dashboard(websocket)
    print("Dashboard connected.")
    try:
        while True:
            # Just keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)
        print("Dashboard disconnected.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
