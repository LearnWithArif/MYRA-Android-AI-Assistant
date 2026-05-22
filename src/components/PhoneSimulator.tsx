import React, { useState, useEffect, useRef } from "react";
import { MyraState, ChatMessage, PrimeContact, AppCommand } from "../types";
import OrbAnimationView from "./OrbAnimationView";
import WaveformView from "./WaveformView";
import { 
  Settings, Battery, Wifi, Bluetooth, Volume2, Mic, MicOff, Send, Home,
  Phone, Video, MessageCircle, AlertTriangle, ShieldCheck, Play, Pause,
  CornerDownLeft, Compass
} from "lucide-react";

interface PhoneSimulatorProps {
  myraState: MyraState;
  setMyraState: (state: MyraState) => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onOpenSettings: () => void;
  // State from parent
  userName: string;
  personality: string;
  primeContacts: PrimeContact[];
  accessibilityOn: boolean;
  setAccessibilityOn: (enabled: boolean) => void;
  // Hardware overrides triggered externally
  hwFlashlight: boolean;
  setHwFlashlight: (on: boolean) => void;
  hwWifi: boolean;
  setHwWifi: (on: boolean) => void;
  hwBluetooth: boolean;
  setHwBluetooth: (on: boolean) => void;
  hwVolume: number;
  setHwVolume: (vol: number) => void;
  addLog: (level: "I" | "D" | "W" | "E", tag: string, message: string) => void;
  // Calling system
  ringingCall: { active: boolean; name: string; number: string; state: "ringing" | "connected" | "idle" } | null;
  setRingingCall: (call: any) => void;
  onCallDecision: (accepted: boolean) => void;
}

export default function PhoneSimulator({
  myraState,
  setMyraState,
  messages,
  onSendMessage,
  onOpenSettings,
  userName,
  personality,
  primeContacts,
  accessibilityOn,
  setAccessibilityOn,
  hwFlashlight,
  setHwFlashlight,
  hwWifi,
  setHwWifi,
  hwBluetooth,
  setHwBluetooth,
  hwVolume,
  setHwVolume,
  addLog,
  ringingCall,
  setRingingCall,
  onCallDecision,
}: PhoneSimulatorProps) {
  const [inputText, setInputText] = useState("");
  const [activeApp, setActiveApp] = useState<"home" | "youtube" | "whatsapp" | "dialer" | "sms" | "accessibility">("home");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [micAmplitude, setMicAmplitude] = useState(0);
  const [isMicListening, setIsMicListening] = useState(false);
  const [mockVideoPlaying, setMockVideoPlaying] = useState(false);
  const [mockWhatsappRecipient, setMockWhatsappRecipient] = useState("Priya");
  const [mockWhatsappInput, setMockWhatsappInput] = useState("");
  const [mockSmsRecipient, setMockSmsRecipient] = useState("");
  const [mockSmsInput, setMockSmsInput] = useState("");
  const [mockWhatsappChatList, setMockWhatsappChatList] = useState<Array<{ sender: string; text: string }>>([
    { sender: "Priya", text: "Haa, bolo cutie? Cholo ghure-fire ashi bikel bela!" },
    { sender: "User", text: "Shono, akhon assistant test korchi." }
  ]);
  const [mockSmsChatList, setMockSmsChatList] = useState<Array<{ sender: string; text: string }>>([
    { sender: "9876543210", text: "Your MYRA security token is 44521. Keep it safe." }
  ]);

  const [simulatedTime, setSimulatedTime] = useState("");
  const [simulatedRam, setSimulatedRam] = useState("3.2 / 8.0 GB");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync virtual clock counter
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSimulatedTime(now.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick flash Toast Alerts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Scroll active chat screen bubble list to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeApp]);

  // Sync caller states to dialer app view
  useEffect(() => {
    if (ringingCall?.active) {
      setActiveApp("dialer");
    } else if (activeApp === "dialer" && !ringingCall?.active) {
      setActiveApp("home");
    }
  }, [ringingCall]);

  // Setup actual browser Web Speech recognition!
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "bn-BD"; // Sets Bangla/Bengali capture values

      rec.onstart = () => {
        addLog("D", "AudioEngine", "Recording 16050Hz mono speech capture stream.");
        setMyraState("LISTENING");
        setMicAmplitude(0.25);
        setIsMicListening(true);
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        addLog("I", "CommandParser", `Voice transcribed: "${transcript}"`);
        setMicAmplitude(0);
        setIsMicListening(false);
        setMyraState("THINKING");
        
        // Feed text directly to assistant engine
        onSendMessage(transcript);
      };

      rec.onerror = (err: any) => {
        addLog("W", "AudioEngine", `Speech recognition interrupted or blocked: ${err?.error}`);
        setMicAmplitude(0);
        setIsMicListening(false);
        setMyraState("IDLE");
        triggerToast("Mic Error. Type command instead.");
      };

      rec.onend = () => {
        setIsMicListening(false);
        setMicAmplitude(0);
      };

      recognitionRef.current = rec;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleMicToggle = () => {
    if (isMicListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          addLog("E", "AudioEngine", "Attempted parallel mic sessions. Aborting active frame.");
        }
      } else {
        triggerToast("Chrome Speech API not supported. Use keyboard!");
      }
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText("");
    addLog("I", "CommandParser", `Manual command input: "${query}"`);
    setMyraState("THINKING");
    onSendMessage(query);
  };

  // Simulated double power press
  const handlePowerPress = () => {
    addLog("I", "PowerButtonReceiver", "Single power button click registered.");
    onOpenSettings();
  };

  // Simulated HW Volume Keys
  const handleVolumeUp = () => {
    const nextVol = Math.min(100, hwVolume + 15);
    setHwVolume(nextVol);
    triggerToast(`Media Volume: ${nextVol}%`);
    addLog("I", "AudioEngine", `Hardware Volume Changed: UP (${nextVol}%)`);
  };

  const handleVolumeDown = () => {
    const nextVol = Math.max(0, hwVolume - 15);
    setHwVolume(nextVol);
    triggerToast(`Media Volume: ${nextVol}%`);
    addLog("I", "AudioEngine", `Hardware Volume Changed: DOWN (${nextVol}%)`);
  };

  // Action hook intercepting triggered Myra Commands mapped in parent
  // We can handle specific command animations inside mock viewports!
  useEffect(() => {
    // Look at last added user messages in thread, check for command activations
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    // Check if parent has run command simulations
  }, [messages]);

  // Intercepting Command executions from parent node
  window.addEventListener("myra-execute-command", (e: any) => {
    const cmd: AppCommand = e.detail;
    addLog("I", "AccessibilityHelperService", `Received simulated Broadcast Intent: ${cmd.type}`);
    
    // Check if Accessibility is ON
    if (!accessibilityOn && cmd.type !== "CLOSE_APP") {
      addLog("E", "AccessibilityHelperService", "Accessibility Helper is disabled. Aborting app action.");
      triggerToast("Error: Turn on Accessibility first.");
      setMyraState("IDLE");
      return;
    }

    if (cmd.type === "OPEN_APP") {
      const app = cmd.params.app_name?.toLowerCase();
      addLog("I", "AccessibilityHelperService", `Performing launch request for: ${app}`);
      triggerToast(`Opening ${app}...`);
      
      if (app.includes("youtube") || app.includes("video")) {
        setActiveApp("youtube");
        setMockVideoPlaying(true);
      } else if (app.includes("whatsapp")) {
        setActiveApp("whatsapp");
      } else if (app.includes("sms") || app.includes("message") || app.includes("messenger")) {
        setActiveApp("sms");
      } else if (app.includes("setting") || app.includes("config")) {
        onOpenSettings();
      } else if (app.includes("accessibility")) {
        setActiveApp("accessibility");
      } else {
        triggerToast("Simulated app not found. Opening Sandbox Home.");
        setActiveApp("home");
      }
      setMyraState("IDLE");

    } else if (cmd.type === "CLOSE_APP") {
      addLog("I", "AccessibilityHelperService", "Executing standard Home trigger [GLOBAL_ACTION_HOME]");
      triggerToast("Going Home...");
      setActiveApp("home");
      setMockVideoPlaying(false);
      setMyraState("IDLE");

    } else if (cmd.type === "VOLUME_UP") {
      handleVolumeUp();
      setMyraState("IDLE");

    } else if (cmd.type === "VOLUME_DOWN") {
      handleVolumeDown();
      setMyraState("IDLE");

    } else if (cmd.type === "FLASHLIGHT_ON") {
      setHwFlashlight(true);
      addLog("I", "SysService", "Simulated Camera Flash Triggered ON.");
      triggerToast("Torch Activated");
      setMyraState("IDLE");

    } else if (cmd.type === "FLASHLIGHT_OFF") {
      setHwFlashlight(false);
      addLog("I", "SysService", "Camera Flash Disabled.");
      triggerToast("Torch Deactivated");
      setMyraState("IDLE");

    } else if (cmd.type === "WIFI_ON") {
      setHwWifi(true);
      addLog("I", "SystemNetwork", "WiFi Interface connected to SSID MyraLiveMesh");
      triggerToast("WiFi Connected");
      setMyraState("IDLE");

    } else if (cmd.type === "WIFI_OFF") {
      setHwWifi(false);
      addLog("I", "SystemNetwork", "WiFi Interface disconnected.");
      triggerToast("WiFi Disconnected");
      setMyraState("IDLE");

    } else if (cmd.type === "BLUETOOTH_ON") {
      setHwBluetooth(true);
      addLog("I", "SysBluetooth", "Bluetooth dynamic scans active.");
      triggerToast("Bluetooth On");
      setMyraState("IDLE");

    } else if (cmd.type === "BLUETOOTH_OFF") {
      setHwBluetooth(false);
      addLog("I", "SysBluetooth", "Bluetooth transmitter muted.");
      triggerToast("Bluetooth Off");
      setMyraState("IDLE");

    } else if (cmd.type === "CALL") {
      const recipient = cmd.params.name;
      addLog("I", "TelecomManager", `Simulating call dial integration with: ${recipient}`);
      setActiveApp("dialer");
      setRingingCall({
        active: true,
        name: recipient,
        number: "+91 " + Math.floor(1000000000 + Math.random() * 9000000000),
        state: "connected"
      });
      setMyraState("IDLE");

    } else if (cmd.type === "SMS") {
      const recipient = cmd.params.name;
      const body = cmd.params.message;
      addLog("I", "SmsProvider", `Staged outbound message to ${recipient}: "${body}"`);
      setActiveApp("sms");
      setMockSmsRecipient(recipient);
      setMockSmsInput(body);
      setMyraState("IDLE");

    } else if (cmd.type === "WHATSAPP_MSG") {
      const recipient = cmd.params.name;
      const body = cmd.params.message;
      addLog("I", "WhatsAppAPI", `Triggered wa.me layout proxy with Recipient: ${recipient}`);
      setActiveApp("whatsapp");
      setMockWhatsappRecipient(recipient);
      setMockWhatsappInput(body);
      setMyraState("IDLE");
    }
  });

  return (
    <div id="phone-hardware-root" className="flex items-center justify-center py-6 px-2">
      
      {/* Structural hardware bounds */}
      <div className="relative">
        
        {/* Left Physical Volume Buttons */}
        <div className="absolute -left-[6px] top-28 flex flex-col gap-3">
          <button
            onClick={handleVolumeUp}
            className="w-[6px] h-10 bg-zinc-700 hover:bg-red-500 rounded-l cursor-pointer border-r border-black active:scale-95 transition-all"
            title="Hardware Vol Up"
          />
          <button
            onClick={handleVolumeDown}
            className="w-[6px] h-10 bg-zinc-700 hover:bg-red-500 rounded-l cursor-pointer border-r border-black active:scale-95 transition-all"
            title="Hardware Vol Down"
          />
        </div>

        {/* Right Physical Power Button */}
        <div className="absolute -right-[6px] top-32">
          <button
            onClick={handlePowerPress}
            className="w-[6px] h-12 bg-zinc-700 hover:bg-red-500 rounded-r cursor-pointer border-l border-black active:scale-95 transition-all"
            title="Settings Key"
          />
        </div>

        {/* Camera LED Flash Flashlight Beam */}
        {hwFlashlight && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-400/10 blur-[18px] rounded-full pointer-events-none animate-pulse flex items-center justify-center">
            <span className="text-[9px] font-mono text-amber-500 tracking-wider">TORCH LIGHT ACTIVE</span>
          </div>
        )}

        {/* Primary Phone Chassis container */}
        <div className="w-[310px] h-[610px] rounded-[38px] bg-[#050505] p-2 border-[5px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col">
          
          {/* Edge Bezel Notch overlay */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-xl z-50 flex items-center justify-center gap-1.5 px-3">
            {/* Selfie Lens */}
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-900 shadow-inner flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-950" />
            </div>
            {/* Speaker bar */}
            <div className="flex-1 h-[3px] bg-zinc-850 rounded-full" />
          </div>

          {/* Core IPS LCD Screen inside bezel */}
          <div className="flex-1 rounded-[29px] overflow-hidden bg-[#050505] relative flex flex-col border border-zinc-900">
            
            {/* Red Voice Screen Pulse Ambient Active Overlay (0→0.08 alpha) */}
            <div 
              className={`absolute inset-0 bg-red-500 transition-opacity duration-300 pointer-events-none z-45 ${
                myraState !== "IDLE" ? "opacity-[0.06]" : "opacity-0"
              }`} 
            />

            {/* Custom Status bar */}
            <div className="h-7 pt-1 px-5 flex items-center justify-between text-[10px] font-mono text-zinc-400 select-none z-45 bg-[#050505]/80 backdrop-blur-sm shadow-sm">
              <span className="text-zinc-300 font-bold">{simulatedTime.split(":")[0]}:{simulatedTime.split(":")[1] || "12:00"}</span>
              <div className="flex items-center gap-2">
                {hwBluetooth && <Bluetooth className="w-2.5 h-2.5 text-blue-400" />}
                {hwWifi ? (
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Wifi className="w-2.5 h-2.5 text-zinc-650" />
                )}
                <div className="flex items-center gap-0.5" title="Battery state">
                  <Battery className="w-3 h-3 text-red-500" />
                  <span className="text-[9px] text-zinc-300">84%</span>
                </div>
              </div>
            </div>

            {/* Simulated OS App Layout Render Zone */}
            <div className="flex-1 flex flex-col relative overflow-hidden z-10 pb-1.5">
              
              {/* SCREEN POP TOAST alert floating at bottom-center */}
              {toastMessage && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-850 text-zinc-100 text-[10px] font-mono py-1.5 px-3 rounded-full shadow-lg z-50 animate-bounce tracking-tight whitespace-nowrap text-center">
                  {toastMessage}
                </div>
              )}

              {/* VIEWPORT: Launcher Home (Default UI) */}
              {activeApp === "home" && (
                <div className="flex-1 flex flex-col">
                  
                  {/* Top quick state summary */}
                  <div className="px-4 py-1.5 flex items-center justify-between border-b border-zinc-900 text-[9px] font-mono text-zinc-500 select-none bg-zinc-950/20">
                    <span className="text-red-500/80">CORE: 3.1-FLASH</span>
                    <span>RAM: {simulatedRam}</span>
                  </div>

                  {/* Dynamic interactive Central Orb area */}
                  <div className="h-44 flex flex-col items-center justify-center relative mt-1 select-none">
                    <OrbAnimationView state={myraState} amplitude={micAmplitude} />
                    
                    {/* Pulsing micro action caption */}
                    <span onClick={handleMicToggle} className="absolute bottom-2 text-[10px] font-bold text-zinc-400 tracking-wide font-mono cursor-pointer hover:text-red-400 transition-colors bg-black/40 px-2 py-0.5 rounded-full select-none">
                      {isMicListening ? "Shunchi... 🔴" : myraState === "SPEAKING" ? "Bolchi... 🔊" : "Tap to Speak 💬"}
                    </span>
                  </div>

                  {/* Oscillating Spectrum Peak Monitor */}
                  <WaveformView amplitude={micAmplitude} isActive={myraState === "SPEAKING" || myraState === "LISTENING"} />

                  {/* OS Desktop Messenger/Chat Dialogues Container */}
                  <div className="flex-1 flex flex-col px-3 overflow-y-auto max-h-[160px] border-t border-zinc-900 py-1 scrollbar-thin">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">Standby Mode</span>
                        <p className="text-[10.5px] text-zinc-600 leading-normal font-mono px-2">
                          MYRA is loaded with **{personality}** values. Tap speech mic or type Bangla/English triggers above.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${
                              msg.isUser ? "self-end items-end" : "self-start items-start"
                            }`}
                          >
                            <span className="text-[7.5px] font-mono text-zinc-600 mb-0.5 select-none">
                              {msg.isUser ? "YOU" : "MYRA"} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                            </span>
                            <div
                              className={`p-2 rounded-xl text-[10.5px] leading-snug break-words ${
                                msg.isUser
                                  ? "bg-zinc-950 border border-red-500/25 text-zinc-200 rounded-tr-none"
                                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none font-semibold flex items-start gap-1"
                              }`}
                            >
                              {!msg.isUser && <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                              <span>{msg.text}</span>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Floating Application Drawer Shelf (Short links) */}
                  <div className="h-10 border-t border-zinc-900 bg-[#070707] flex items-center justify-around px-2 py-0.5 select-none z-10">
                    <button
                      onClick={() => setActiveApp("youtube")}
                      className="p-1 cursor-pointer bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-red-500 hover:text-red-400 transition-colors"
                      title="Simulate YouTube"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveApp("whatsapp")}
                      className="p-1 cursor-pointer bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-emerald-500 hover:text-emerald-400 transition-colors"
                      title="Simulate WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveApp("sms")}
                      className="p-1 cursor-pointer bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-cyan-505 hover:text-cyan-400 transition-colors text-cyan-500"
                      title="Simulate SMS messages"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveApp("accessibility")}
                      className="p-1 cursor-pointer bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-blue-500 hover:text-blue-450 transition-colors"
                      title="Accessibility settings helper"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* VIEWPORT: Simulated YouTube viewport */}
              {activeApp === "youtube" && (
                <div className="flex-1 bg-[#0f0f0f] flex flex-col text-[#f1f1f1] select-none p-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-850 mb-2">
                    <span className="text-xs font-bold font-mono tracking-tight text-red-600 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-red-600" /> YouTube
                    </span>
                    <button onClick={() => setActiveApp("home")} className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300">
                      Close App
                    </button>
                  </div>

                  {/* Virtual Video Canvas Display */}
                  <div className="w-full h-28 bg-black border border-zinc-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
                    {mockVideoPlaying ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-950/20 to-zinc-900/50 flex flex-col items-center justify-center text-center p-2">
                          <span className="text-[8px] font-mono text-red-500 mb-1 animate-pulse">● LIVE BROADCAST</span>
                          <span className="text-[10px] font-bold tracking-tight px-1">Testing MYRA Voice Framework</span>
                          <span className="text-[8px] text-zinc-500 mt-2">Bangla & English / 16000Hz PCM</span>
                        </div>
                        <button
                          onClick={() => setMockVideoPlaying(false)}
                          className="absolute bottom-1 right-1 p-1 bg-black/60 rounded text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 text-zinc-400 hover:text-red-500 hover:scale-110 transition-all cursor-pointer" onClick={() => setMockVideoPlaying(true)} />
                        <span className="text-[9px] text-zinc-500 mt-1 font-mono">Stream Interrupted or Muted</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex flex-col">
                    <span className="text-[10px] font-bold font-mono text-zinc-200">Unboxing Complete Android Assistant System</span>
                    <span className="text-[8px] text-zinc-500 font-mono">819K views • Simulated Telemetry</span>
                  </div>

                  <div className="flex-1 mt-2 border-t border-zinc-900 pt-2 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Simulated Feeds</span>
                    <div className="flex gap-2 p-1 border border-zinc-900 bg-zinc-950/35 rounded-lg">
                      <div className="w-14 h-9 bg-zinc-900 rounded" />
                      <div className="flex-1 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-zinc-300 leading-tight">Myra v1.0 Voice WebSocket Setup</span>
                        <span className="text-[8px] text-zinc-500">MYRA Tech • 22M views</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEWPORT: Simulated WhatsApp layout */}
              {activeApp === "whatsapp" && (
                <div className="flex-1 bg-zinc-915 bg-[#0b141a] flex flex-col text-zinc-100 select-none">
                  {/* Chat top header banner */}
                  <div className="h-9 px-3 bg-[#1f2c34] flex items-center justify-between text-xs font-bold border-b border-zinc-805">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-black font-mono">
                        {mockWhatsappRecipient[0] || "P"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-200">{mockWhatsappRecipient}</span>
                        <span className="text-[7.5px] font-mono text-emerald-400">Online • Active</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveApp("home")} className="text-[8.5px] font-mono text-zinc-400 hover:text-zinc-200">
                      Home
                    </button>
                  </div>

                  {/* Active Message Board inside app */}
                  <div className="flex-1 p-2.5 flex flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    {mockWhatsappChatList.map((chat, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-[9.5px] max-w-[80%] leading-relaxed ${
                          chat.sender === "User"
                            ? "bg-[#0b5c46] text-zinc-100 rounded-tr-none self-end"
                            : "bg-[#202c33] text-zinc-200 rounded-tl-none self-start"
                        }`}
                      >
                        {chat.text}
                      </div>
                    ))}
                  </div>

                  {/* WhatsApp send form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!mockWhatsappInput.trim()) return;
                      setMockWhatsappChatList([
                        ...mockWhatsappChatList,
                        { sender: "User", text: mockWhatsappInput.trim() }
                      ]);
                      setMockWhatsappInput("");
                    }}
                    className="h-10 px-2 bg-[#1f2c34] flex items-center gap-1 border-t border-zinc-800"
                  >
                    <input
                      type="text"
                      value={mockWhatsappInput}
                      onChange={(e) => setMockWhatsappInput(e.target.value)}
                      placeholder="Type WhatsApp message..."
                      className="flex-1 bg-[#2a3942] border-none text-zinc-200 placeholder-zinc-500 text-[10px] rounded-full px-3 py-1 outline-none"
                    />
                    <button type="submit" className="p-1 px-2 bg-[#00a884] text-white rounded-full font-bold text-[9px]">
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* VIEWPORT: Telephoning calling layout */}
              {activeApp === "dialer" && ringingCall?.active && (
                <div className="flex-1 bg-gradient-to-b from-[#200508] to-[#0a0204] flex flex-col p-5 text-zinc-200 select-none z-50">
                  <div className="flex-1 flex flex-col items-center justify-center pt-8">
                    
                    {/* Ringing contact profile avatar sphere */}
                    <div className="w-20 h-20 rounded-full bg-red-950 border-2 border-red-500/40 flex items-center justify-center text-red-500 text-3xl font-black mb-3 animate-pulse shadow-2xl shadow-red-500/20">
                      {ringingCall.name[0] || "U"}
                    </div>
                    
                    <span className="text-base font-black tracking-tight text-white mb-0.5 select-all">{ringingCall.name}</span>
                    <span className="text-[10dp] font-mono text-zinc-500 mb-2 select-all">{ringingCall.number}</span>
                    
                    <span className="text-xs font-mono text-red-400 tracking-widest animate-bounce mt-8">
                      {ringingCall.state === "ringing" ? "INCOMING INCALL RINGING..." : "CALL IN ACTIVE PROGRESS"}
                    </span>
                  </div>

                  {/* Ringer action widgets (Slide Accept or Reject) */}
                  <div className="h-28 flex flex-col justify-end pb-3">
                    {ringingCall.state === "ringing" ? (
                      <div className="grid grid-cols-2 gap-4 px-2">
                        <button
                          onClick={() => onCallDecision(true)}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-black font-mono text-[11px] rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer"
                        >
                          ACCEPT
                        </button>
                        <button
                          onClick={() => onCallDecision(false)}
                          className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-black font-mono text-[11px] rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer"
                        >
                          REJECT
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onCallDecision(false)}
                        className="py-2.5 w-full bg-red-600 hover:bg-red-500 text-white font-black font-mono text-[11px] rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer"
                      >
                        DISCONNECT CALL
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* VIEWPORT: Simulated SMS manager inside OS */}
              {activeApp === "sms" && (
                <div className="flex-1 bg-zinc-950 flex flex-col text-zinc-200 select-none">
                  <div className="h-9 px-3 bg-[#111111] flex items-center justify-between text-xs font-bold border-b border-zinc-850">
                    <span className="text-[10px] font-mono text-cyan-400">SMS MESSENGER</span>
                    <button onClick={() => setActiveApp("home")} className="text-[8.5px] font-mono text-zinc-500">
                      Home
                    </button>
                  </div>

                  {/* Header ricipient mapping */}
                  <div className="p-2 border-b border-zinc-900 bg-[#0a0a0a] flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-500">TO:</span>
                    <input
                      type="text"
                      value={mockSmsRecipient}
                      onChange={(e) => setMockSmsRecipient(e.target.value)}
                      placeholder="Enter recipe target contact..."
                      className="bg-transparent border-none outline-none font-mono text-[10px] flex-1 text-zinc-100"
                    />
                  </div>

                  {/* SMS speech boards bubbles */}
                  <div className="flex-1 p-2.5 flex flex-col gap-2 overflow-y-auto scrollbar-thin">
                    {mockSmsChatList.map((chat, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-[9px] max-w-[80%] leading-relaxed ${
                          chat.sender === "User"
                            ? "bg-cyan-950 border border-cyan-800 text-zinc-100 rounded-tr-none self-end"
                            : "bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-tl-none self-start"
                        }`}
                      >
                        {chat.text}
                      </div>
                    ))}
                  </div>

                  {/* SMS Composer Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!mockSmsInput.trim() || !mockSmsRecipient.trim()) return;
                      setMockSmsChatList([
                        ...mockSmsChatList,
                        { sender: "User", text: mockSmsInput.trim() }
                      ]);
                      setMockSmsInput("");
                    }}
                    className="h-10 px-2 bg-[#111111] flex items-center gap-1 border-t border-zinc-850"
                  >
                    <input
                      type="text"
                      value={mockSmsInput}
                      onChange={(e) => setMockSmsInput(e.target.value)}
                      placeholder="Enter SMS payload..."
                      className="flex-1 bg-zinc-900 border-none text-zinc-200 placeholder-zinc-500 text-[10px] rounded px-2.5 py-1 outline-none"
                    />
                    <button type="submit" className="p-1 px-2.5 bg-cyan-600 text-black rounded font-bold text-[9px]">
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* VIEWPORT: Simulated Accessibility helper switch overlay panel */}
              {activeApp === "accessibility" && (
                <div className="flex-1 bg-zinc-950 flex flex-col text-zinc-200 select-none p-3 overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
                    <span className="text-xs font-bold text-zinc-100 font-mono tracking-tight flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> ACCESSIBILITY SERVICES
                    </span>
                    <button onClick={() => setActiveApp("home")} className="text-[9px] font-mono text-zinc-500">
                      Home
                    </button>
                  </div>

                  <div className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl mb-4 text-center">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#FF1744] block mb-1">Android Requirement</span>
                    <p className="text-[9.5px] leading-relaxed text-zinc-400 font-mono">
                      Accessibility Services permit MYRA to emulate physical UI layout clicks, scroll threads, type SMS messages, and close apps on your behalf.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-zinc-100">Myra Helper Service</span>
                      <span className="text-[8px] text-zinc-500 font-mono">Simulate intent interactions</span>
                    </div>

                    <button
                      onClick={() => {
                        const nextState = !accessibilityOn;
                        setAccessibilityOn(nextState);
                        triggerToast(`Accessibility Service: ${nextState ? "Enabled" : "Disabled"}`);
                        addLog("I", "AccessibilityHelperService", `Accessibility Service state customized manually: ${nextState ? "ON" : "OFF"}`);
                      }}
                      className={`px-3 py-1 text-[9px] font-mono rounded border transition-all ${
                        accessibilityOn
                          ? "bg-emerald-950/20 border-emerald-500 text-emerald-400"
                          : "bg-red-950/20 border-red-500 text-red-400 animate-pulse"
                      }`}
                    >
                      {accessibilityOn ? "ON (ACTIVE)" : "OFF (STANDBY)"}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Keyboard text console typing bar (Included on home desktop explicitly) */}
            {activeApp === "home" && (
              <form onSubmit={handleManualTextSubmit} className="h-10 px-2.5 bg-zinc-950 border-t border-zinc-900 flex items-center gap-1.5 select-none z-10">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type Bangla or English command..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-red-500 text-zinc-200 placeholder-zinc-650 text-[10px] rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                />
                <button type="submit" className="p-1 px-1.5 bg-zinc-900 hover:bg-zinc-850 text-red-500 rounded-lg border border-zinc-850 hover:border-red-500/20 transition-all cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className={`p-1 px-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    isMicListening 
                      ? "bg-red-500 border-red-600 text-black hover:bg-red-400 animate-pulse" 
                      : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-red-500/20"
                  }`}
                  title="Speak voice trigger"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Simulated Android System Navigation Buttons */}
            <div className="h-8 border-t border-zinc-900/60 bg-[#020202] flex items-center justify-around px-10 select-none z-10">
              {/* Back Button */}
              <button
                onClick={() => {
                  if (activeApp !== "home") {
                    addLog("I", "AccessibilityHelperService", "Going BACK from simulated app viewport.");
                    setActiveApp("home");
                    setMockVideoPlaying(false);
                    triggerToast("Launcher Desktop");
                  } else {
                    triggerToast("Launcher already active.");
                  }
                }}
                className="p-1 text-zinc-600 hover:text-zinc-200 transition-colors"
                title="Back Key"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
              
              {/* Home Button */}
              <button
                onClick={() => {
                  if (activeApp !== "home") {
                    addLog("I", "AccessibilityHelperService", "Executing standard Home trigger [GLOBAL_ACTION_HOME]");
                    setActiveApp("home");
                    setMockVideoPlaying(false);
                    triggerToast("Launcher Desktop");
                  } else {
                    triggerToast("Already on Home.");
                  }
                }}
                className="p-1 text-zinc-600 hover:text-zinc-200 transition-colors"
                title="Home Key"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
              
              {/* Settings Trigger Icon */}
              <button
                onClick={onOpenSettings}
                className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
                title="Settings Manager"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
