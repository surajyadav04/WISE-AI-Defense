import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Camera, Mic, MapPin, Copy, Maximize, ExternalLink, Activity, AlertTriangle, Eye } from 'lucide-react';

export default function App() {
  const [telemetry, setTelemetry] = useState({
    permissions: {},
    trackers: [],
    fingerprinting: [],
    events: [],
    risk_score: 0,
    ai_explanations: []
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Poll background script for latest telemetry every second
    const fetchTelemetry = () => {
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "GET_LATEST_TELEMETRY" }, (res) => {
          if (res && res.data) {
            setTelemetry(res.data);
          }
        });
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1000);
    return () => clearInterval(interval);
  }, []);

  const riskColor = telemetry.risk_score > 75 ? 'text-red-500' : telemetry.risk_score > 30 ? 'text-orange-500' : 'text-green-500';
  const riskBorder = telemetry.risk_score > 75 ? 'border-red-500/30' : telemetry.risk_score > 30 ? 'border-orange-500/30' : 'border-green-500/30';
  const riskBg = telemetry.risk_score > 75 ? 'bg-red-500/10' : telemetry.risk_score > 30 ? 'bg-orange-500/10' : 'bg-green-500/10';

  return (
    <div className="w-full h-full flex flex-col font-['Sora'] relative">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Header */}
      <header className="z-10 flex items-center justify-between p-3 bg-black/80 border-b border-[#00f3ff]/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#00f3ff]" />
          <div>
            <h1 className="font-['Orbitron'] font-bold text-sm tracking-widest text-[#00f3ff]">WISE SOC</h1>
            <p className="text-[9px] text-slate-400 tracking-wider">LIVE TELEMETRY ACTIVE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] text-green-400 font-bold tracking-wider">SECURE</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="z-10 flex border-b border-white/10 bg-black/50">
        <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 text-[10px] font-['Orbitron'] tracking-wider ${activeTab === 'overview' ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/5' : 'text-slate-400 hover:text-white'}`}>OVERVIEW</button>
        <button onClick={() => setActiveTab('permissions')} className={`flex-1 py-2 text-[10px] font-['Orbitron'] tracking-wider ${activeTab === 'permissions' ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/5' : 'text-slate-400 hover:text-white'}`}>PERMISSIONS</button>
        <button onClick={() => setActiveTab('trackers')} className={`flex-1 py-2 text-[10px] font-['Orbitron'] tracking-wider ${activeTab === 'trackers' ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/5' : 'text-slate-400 hover:text-white'}`}>TRACKERS</button>
      </div>

      {/* Content Area */}
      <main className="z-10 flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            <div className={`p-4 rounded-lg border ${riskBorder} ${riskBg} flex items-center justify-between`}>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Threat Score</p>
                <p className={`text-4xl font-['Orbitron'] font-bold ${riskColor}`}>{telemetry.risk_score || 0}</p>
              </div>
              <Activity className={`w-10 h-10 ${riskColor} opacity-50`} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <h3 className="text-[11px] font-['Orbitron'] text-[#00f3ff] mb-2 flex items-center gap-2"><Eye className="w-3 h-3"/> AI RISK ANALYSIS</h3>
              <div className="space-y-2">
                {telemetry.ai_explanations?.length > 0 ? (
                  telemetry.ai_explanations.map((exp, i) => (
                    <div key={i} className="text-xs text-slate-300 border-l-2 border-[#00f3ff] pl-2 py-1 bg-black/30">
                      {exp.text}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Scanning behavior for anomalies...</p>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <h3 className="text-[11px] font-['Orbitron'] text-orange-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-3 h-3"/> LIVE EVENT FEED</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                <AnimatePresence>
                  {telemetry.events?.slice().reverse().map((ev, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div className="text-[10px] text-slate-300">
                        <span className="text-red-400 font-bold">[{ev.type}]</span> {JSON.stringify(ev.data)}
                      </div>
                    </motion.div>
                  ))}
                  {(!telemetry.events || telemetry.events.length === 0) && (
                    <p className="text-xs text-slate-500 italic">No suspicious events detected yet.</p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <PermissionRow icon={<Camera className="w-4 h-4" />} name="Camera" state={telemetry.permissions?.camera || 'unknown'} />
            <PermissionRow icon={<Mic className="w-4 h-4" />} name="Microphone" state={telemetry.permissions?.microphone || 'unknown'} />
            <PermissionRow icon={<MapPin className="w-4 h-4" />} name="Location" state={telemetry.permissions?.geolocation || 'unknown'} />
            <PermissionRow icon={<Copy className="w-4 h-4" />} name="Clipboard" state={telemetry.permissions?.['clipboard-read'] || 'unknown'} />
            
            <div className="mt-4 pt-4 border-t border-white/10">
               <h3 className="text-[11px] font-['Orbitron'] text-slate-400 mb-2">ABUSE DETECTION</h3>
               <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2 rounded border border-white/10 text-center">
                    <p className="text-[9px] text-slate-500">POPUPS</p>
                    <p className="text-lg font-['Orbitron'] text-white">{telemetry.events?.filter(e => e.type === 'POPUP_ATTEMPT').length || 0}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded border border-white/10 text-center">
                    <p className="text-[9px] text-slate-500">FULLSCREEN</p>
                    <p className="text-lg font-['Orbitron'] text-white">{telemetry.events?.filter(e => e.type === 'FULLSCREEN_ATTEMPT').length || 0}</p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* TRACKERS TAB */}
        {activeTab === 'trackers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">FINGERPRINTING METHODS DETECTED</p>
               <p className="text-3xl font-['Orbitron'] font-bold text-red-500 my-1">{telemetry.fingerprinting?.length || 0}</p>
            </div>

            {telemetry.fingerprinting?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-['Orbitron'] text-slate-400">METHODS USED</h3>
                {telemetry.fingerprinting.map((fp, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded p-2 text-xs text-red-400 font-mono">
                    {fp}
                  </div>
                ))}
              </div>
            )}

            <div className="edu-box bg-[#f59e0b]/10 border border-[#f59e0b]/30 p-3 rounded-lg mt-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-[#f59e0b]">What is Fingerprinting?</span> Fingerprinting is an aggressive tracking technique that identifies you based on your hardware configuration (like your graphics card via WebGL, or how your browser renders Canvas elements) even if you delete cookies.
              </p>
            </div>

          </motion.div>
        )}
      </main>

    </div>
  )
}

function PermissionRow({ icon, name, state }) {
  let color = 'text-slate-500';
  let badge = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  let displayState = state.toUpperCase();
  
  if (state === 'granted' || state === 'active') {
    color = 'text-green-500';
    badge = 'bg-green-500/20 text-green-400 border-green-500/30';
  } else if (state === 'denied' || state === 'blocked') {
    color = 'text-red-500';
    badge = 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-black/50 border border-white/5 ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-200">{name}</span>
      </div>
      <span className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded border ${badge}`}>
        {displayState}
      </span>
    </div>
  )
}
