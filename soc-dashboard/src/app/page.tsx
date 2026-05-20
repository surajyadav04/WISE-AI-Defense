"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Activity, EyeOff, Radio, Lock, Globe, Server, Code, HardDrive, Wifi, Smartphone, Crosshair } from 'lucide-react';

export default function SOCDashboard() {
  const [telemetry, setTelemetry] = useState({});
  const [activeDomain, setActiveDomain] = useState(null);
  const [systemStatus, setSystemStatus] = useState("DISCONNECTED");

  useEffect(() => {
    let ws;
    const connectWS = () => {
      ws = new WebSocket("ws://localhost:8000/ws/dashboard");
      ws.onopen = () => setSystemStatus("ONLINE");
      ws.onclose = () => {
        setSystemStatus("RECONNECTING...");
        setTimeout(connectWS, 3000);
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "INITIAL_STATE") {
          setTelemetry(msg.data);
          if (Object.keys(msg.data).length > 0) setActiveDomain(Object.keys(msg.data)[0]);
        } else if (msg.type === "TELEMETRY_UPDATE") {
          setTelemetry(prev => {
            const newState = { ...prev, [msg.domain]: msg.state };
            if (!activeDomain) setActiveDomain(msg.domain);
            return newState;
          });
        }
      };
    };
    connectWS();
    return () => ws && ws.close();
  }, [activeDomain]);

  const activeData = telemetry[activeDomain] || { events: [], risk_score: 0, ai_explanations: [], fingerprinting: [], permissions: {} };

  // Format data for chart
  const chartData = activeData.events.slice(-20).map((ev, i) => ({
    time: new Date(ev.time).toLocaleTimeString(),
    risk: i * 5 + (activeData.risk_score / 2) // Mock fluctuating risk for visual effect
  }));

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-['Sora'] selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 243, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 shadow-[0_0_15px_#00f3ff] z-10"></div>

      {/* Main Layout */}
      <div className="relative z-10 flex h-screen">
        
        {/* Sidebar */}
        <aside className="w-64 bg-black/60 border-r border-cyan-500/20 flex flex-col backdrop-blur-xl">
          <div className="p-6 border-b border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="font-['Orbitron'] font-bold tracking-widest text-white text-lg">WISE</h1>
                <p className="text-[9px] text-cyan-500 tracking-widest uppercase">Command Center</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">Monitored Targets</h2>
            <div className="space-y-2">
              {Object.keys(telemetry).length === 0 && <p className="text-xs text-slate-600 italic">Awaiting connection...</p>}
              
              {Object.keys(telemetry).map(domain => (
                <button 
                  key={domain}
                  onClick={() => setActiveDomain(domain)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between ${activeDomain === domain ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  <span className="text-sm font-semibold truncate">{domain}</span>
                  <div className={`w-2 h-2 rounded-full ${telemetry[domain].risk_score > 50 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-green-500'}`}></div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-cyan-500/20 bg-black/40">
            <div className="flex items-center gap-3">
              <div className={`relative flex h-3 w-3`}>
                {systemStatus === "ONLINE" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === "ONLINE" ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
              <span className="text-xs font-['Orbitron'] tracking-wider text-slate-300">{systemStatus}</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Top Bar */}
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-['Orbitron'] font-bold text-white mb-1 flex items-center gap-3">
                <Globe className="text-cyan-500 w-8 h-8"/>
                {activeDomain || "AWAITING TARGET"}
              </h2>
              <p className="text-slate-400 text-sm tracking-wide">Live Threat & Privacy Telemetry Feed</p>
            </div>
            
            <div className="flex gap-4">
              <ScoreCard label="THREAT SCORE" value={activeData.risk_score} isDanger={activeData.risk_score > 50} />
              <ScoreCard label="TRACKERS" value={activeData.events.length} />
              <ScoreCard label="ABUSE EVENTS" value={activeData.fingerprinting.length} isDanger={activeData.fingerprinting.length > 0} />
            </div>
          </header>

          <div className="grid grid-cols-3 gap-6 flex-1">
            
            {/* Left Column */}
            <div className="col-span-2 flex flex-col gap-6">
              
              {/* Chart */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-5 backdrop-blur-md">
                <h3 className="text-xs font-['Orbitron'] tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-500"/> THREAT EVOLUTION TIMELINE</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#ffffff40" fontSize={10} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#00f3ff50', borderRadius: '8px' }}
                        itemStyle={{ color: '#00f3ff' }}
                      />
                      <Line type="monotone" dataKey="risk" stroke="#00f3ff" strokeWidth={2} dot={{ r: 4, fill: '#000', stroke: '#00f3ff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#00f3ff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hardware Access */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-5 backdrop-blur-md">
                 <h3 className="text-xs font-['Orbitron'] tracking-widest text-slate-400 mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4 text-cyan-500"/> SENSOR & HARDWARE ACCESS</h3>
                 <div className="grid grid-cols-4 gap-4">
                   <PermissionBox name="Camera" state={activeData.permissions.camera} />
                   <PermissionBox name="Microphone" state={activeData.permissions.microphone} />
                   <PermissionBox name="Location" state={activeData.permissions.geolocation} />
                   <PermissionBox name="Clipboard" state={activeData.permissions['clipboard-read']} />
                 </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              
              {/* AI Analysis */}
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-5 backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.05)]">
                <h3 className="text-xs font-['Orbitron'] tracking-widest text-cyan-500 mb-4 flex items-center gap-2"><EyeOff className="w-4 h-4"/> AI BEHAVIORAL ANALYSIS</h3>
                <div className="space-y-3">
                  {activeData.ai_explanations.length > 0 ? (
                    activeData.ai_explanations.slice().reverse().map((exp, i) => (
                      <div key={i} className="text-sm text-slate-300 leading-relaxed border-l-2 border-cyan-500 pl-3 py-1 bg-cyan-500/5">
                        {exp.text}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">Awaiting AI synthesis...</p>
                  )}
                </div>
              </div>

              {/* Live Threat Feed */}
              <div className="bg-black/40 border border-red-500/20 rounded-xl p-5 backdrop-blur-md flex-1 flex flex-col shadow-[0_0_30px_rgba(239,68,68,0.05)]">
                <h3 className="text-xs font-['Orbitron'] tracking-widest text-red-400 mb-4 flex items-center gap-2"><Radio className="w-4 h-4"/> RAW EVENT STREAM</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  <AnimatePresence>
                    {activeData.events.slice().reverse().map((ev, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        key={ev.time + i} 
                        className="bg-black/60 border border-red-500/30 rounded p-3 text-xs font-mono"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-red-400 font-bold">{ev.type}</span>
                          <span className="text-slate-500">{new Date(ev.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 break-all opacity-80">
                           {JSON.stringify(ev.data)}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        </main>

      </div>
    </div>
  );
}

function ScoreCard({ label, value, isDanger }) {
  return (
    <div className={`px-6 py-4 rounded-xl border bg-black/60 backdrop-blur-md flex flex-col items-center justify-center min-w-[140px] transition-all ${isDanger ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-white/10'}`}>
      <span className="text-[10px] font-bold tracking-widest text-slate-400 mb-1">{label}</span>
      <span className={`text-4xl font-['Orbitron'] font-bold ${isDanger ? 'text-red-500' : 'text-cyan-400'}`}>{value}</span>
    </div>
  )
}

function PermissionBox({ name, state }) {
  const isGranted = state === 'granted';
  const isDenied = state === 'denied';
  const color = isGranted ? 'text-red-400 bg-red-400/10 border-red-400/30' : isDenied ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-slate-400 bg-white/5 border-white/10';
  
  return (
    <div className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 ${color}`}>
      <span className="text-xs font-bold uppercase tracking-wider">{name}</span>
      <span className="text-[10px] bg-black/50 px-2 py-1 rounded tracking-widest">{state || 'UNKNOWN'}</span>
    </div>
  )
}
