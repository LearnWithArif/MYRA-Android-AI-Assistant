import { useState, useRef, useEffect } from "react";
import { SystemLog } from "../types";
import { Play, Power, Trash2, Search, Terminal, Phone, AlertCircle, RefreshCw } from "lucide-react";

interface ControlPanelProps {
  logs: SystemLog[];
  onClearLogs: () => void;
  onSimulateCall: (callerName: string, phoneNumber: string) => void;
  onTriggerOverlay: () => void;
  hwFlashlight: boolean;
  hwWifi: boolean;
  hwBluetooth: boolean;
  hwVolume: number;
}

export default function ControlPanel({
  logs,
  onClearLogs,
  onSimulateCall,
  onTriggerOverlay,
  hwFlashlight,
  hwWifi,
  hwBluetooth,
  hwVolume,
}: ControlPanelProps) {
  const [filter, setFilter] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logcat to bottom on new additions
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const term = filter.toLowerCase();
    return (
      log.tag.toLowerCase().includes(term) ||
      log.message.toLowerCase().includes(term) ||
      log.level.toLowerCase().includes(term)
    );
  });

  return (
    <div id="control-panel-root" className="w-full lg:w-96 bg-[#090909] border-l lg:border-l-0 border-t lg:border-t-0 border-zinc-850 p-4 flex flex-col gap-5 overflow-y-auto max-h-screen">
      
      {/* Simulation Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono uppercase text-red-500 tracking-wider">Simulations</span>
          <h3 className="text-sm font-black text-zinc-200 tracking-tight flex items-center gap-1.5 leading-none">
            <Play className="w-4 h-4 text-red-500 fill-red-500/20" /> SIMULATE HARDWARE EVENTS
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Incoming Phone Calling Simulation */}
          <button
            onClick={() => onSimulateCall("Priya", "+91 98765 43210")}
            className="p-2.5 bg-zinc-950 border border-zinc-850 hover:border-red-500/50 hover:bg-zinc-900 rounded-lg text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-zinc-300 group-hover:text-red-400">
              <Phone className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-500" /> Priya Call
            </div>
            <span className="text-[9px] font-mono text-zinc-500 leading-normal block">
              Ring device and prompt MYRA speech feedback.
            </span>
          </button>

          <button
            onClick={() => onSimulateCall("Mom", "+91 91234 56789")}
            className="p-2.5 bg-zinc-950 border border-zinc-850 hover:border-red-500/50 hover:bg-zinc-900 rounded-lg text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-zinc-300 group-hover:text-red-400">
              <Phone className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-500" /> Mom Call
            </div>
            <span className="text-[9px] font-mono text-zinc-500 leading-normal block">
              Ring device with prime maternal contact state.
            </span>
          </button>
        </div>

        {/* Double click power key translation */}
        <button
          onClick={onTriggerOverlay}
          className="w-full p-2 bg-zinc-950 border border-zinc-850 hover:border-red-500/50 text-xs font-mono text-zinc-300 rounded-lg hover:text-red-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer py-2.5"
        >
          <Power className="w-4 h-4 text-red-500" /> Simulate Double Power Click (Overlay)
        </button>
      </div>

      {/* Simulated hardware state telemetry widgets */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-950 border border-zinc-850 rounded-xl font-mono text-[10px]">
        <span className="text-zinc-500 tracking-wider uppercase mb-1 block">Live Hardware Telemetry</span>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Flashlight:</span>
            <span className={hwFlashlight ? "text-amber-400 font-bold" : "text-zinc-650"}>
              {hwFlashlight ? "● ON 100%" : "○ Off"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Wifi Network:</span>
            <span className={hwWifi ? "text-emerald-400 font-bold" : "text-zinc-650 animate-pulse"}>
              {hwWifi ? "● ENABLED" : "○ Offline"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Bluetooth:</span>
            <span className={hwBluetooth ? "text-blue-400 font-bold" : "text-zinc-650"}>
              {hwBluetooth ? "● LINKED" : "○ Standby"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Media Volume:</span>
            <span className="text-red-400 font-bold">{hwVolume}%</span>
          </div>
        </div>
      </div>

      {/* Logcat Terminal Output */}
      <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Real-time Monitor</span>
            <h3 className="text-sm font-black text-zinc-200 tracking-tight flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-red-500" /> ANDROID SYSTEM LOGCAT
            </h3>
          </div>
          <button
            onClick={onClearLogs}
            className="p-1 px-2 border border-zinc-850 hover:bg-zinc-900 rounded text-[9px] font-mono text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
            title="Clear active display logs"
          >
            <Trash2 className="w-3 h-3" /> Clear Log
          </button>
        </div>

        {/* Filter Input bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs by level, tag, or string content..."
            className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-500/50 text-zinc-200 font-mono text-[10px] rounded-lg pl-8 pr-3 py-2 outline-none transition-colors"
          />
        </div>

        {/* Dynamic Log Output Container */}
        <div className="flex-1 bg-black border border-zinc-850 rounded-xl p-3 font-mono text-[9px] leading-relaxed overflow-y-auto max-h-[460px] lg:max-h-none shadow-inner flex flex-col gap-1 select-text scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-700 py-12">
              <AlertCircle className="w-6 h-6 mb-1 text-zinc-800 animate-pulse" />
              <span>No logs matched filter criteria.</span>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              let tagColor = "text-zinc-500";
              let levelColor = "text-zinc-500 bg-zinc-900";
              let msgColor = "text-zinc-400";

              if (log.level === "D") {
                levelColor = "text-fuchsia-400 bg-fuchsia-950/20 border border-fuchsia-900/30";
                tagColor = "text-fuchsia-500";
              } else if (log.level === "I") {
                levelColor = "text-cyan-400 bg-cyan-950/20 border border-cyan-900/30";
                tagColor = "text-cyan-500";
              } else if (log.level === "W") {
                levelColor = "text-amber-400 bg-amber-950/20 border border-amber-900/30";
                tagColor = "text-amber-500";
                msgColor = "text-amber-300";
              } else if (log.level === "E") {
                levelColor = "text-red-400 bg-red-950/30 border border-red-900/40 animate-pulse";
                tagColor = "text-red-500 font-bold";
                msgColor = "text-red-300";
              }

              return (
                <div key={index} className="flex flex-col py-1 border-b border-zinc-900/40 hover:bg-zinc-950/30 transition-colors">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-zinc-600 text-[8px]">{log.timestamp.split(" ")[1]}</span>
                    <span className={`px-1 rounded text-[8px] font-bold ${levelColor}`}>{log.level}</span>
                    <span className={`font-bold ${tagColor}`}>{log.tag}:</span>
                  </div>
                  <span className={`mt-0.5 pr-1 break-all ${msgColor}`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
