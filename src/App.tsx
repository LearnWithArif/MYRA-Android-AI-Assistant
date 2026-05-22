import { useState, useEffect, useRef } from "react";
import { MyraState, ChatMessage, PrimeContact, SystemLog } from "./types";
import PhoneSimulator from "./components/PhoneSimulator";
import ControlPanel from "./components/ControlPanel";
import SettingsScreen from "./components/SettingsScreen";
import FloatingOverlay from "./components/FloatingOverlay";
import { Sparkles, Terminal, Volume2, ShieldCheck, Heart, User } from "lucide-react";

export default function App() {
  // Shared Configuration States (persisted in localStorage to mirror Android SharedPreferences)
  const [userName, setUserName] = useState(() => localStorage.getItem("user_name") || "Sir");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("gemini_model") || "gemini-3.5-flash");
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("gemini_voice") || "Aoede");
  const [personality, setPersonality] = useState<"GF" | "Professional" | "Assistant">(() => {
    return (localStorage.getItem("personality_mode") as "GF" | "Professional" | "Assistant") || "GF";
  });
  const [accessibilityOn, setAccessibilityOn] = useState(() => {
    return localStorage.getItem("accessibility_enabled") === "true";
  });
  
  // Persistent Prime Contacts initialization
  const [primeContacts, setPrimeContacts] = useState<PrimeContact[]>(() => {
    const rawJson = localStorage.getItem("prime_contacts_json");
    if (rawJson) {
      try {
        return JSON.parse(rawJson);
      } catch (e) {
        return [];
      }
    }
    // Legacy mapping migration values
    return [
      { id: "prime_1", name: "Priya", number: "+91 98765 43210" },
      { id: "prime_2", name: "Mom", number: "+91 91234 56789" },
    ];
  });

  // Simulator Functional States
  const [myraState, setMyraState] = useState<MyraState>("IDLE");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showFloatingOverlay, setShowFloatingOverlay] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Simulated Telephone Active Inbound States
  const [ringingCall, setRingingCall] = useState<{
    active: boolean; 
    name: string; 
    number: string; 
    state: "ringing" | "connected" | "idle"
  } | null>(null);

  // Hardware states (synced to ControlPanel)
  const [hwFlashlight, setHwFlashlight] = useState(false);
  const [hwWifi, setHwWifi] = useState(true);
  const [hwBluetooth, setHwBluetooth] = useState(true);
  const [hwVolume, setHwVolume] = useState(70);

  // References to handle voice speech interrupt schedules
  const playAudioRef = useRef<{ source: AudioBufferSourceNode | null; ctx: AudioContext | null }>({
    source: null,
    ctx: null,
  });

  // Persistent browser save hook
  useEffect(() => {
    localStorage.setItem("user_name", userName);
    localStorage.setItem("gemini_model", selectedModel);
    localStorage.setItem("gemini_voice", selectedVoice);
    localStorage.setItem("personality_mode", personality);
    localStorage.setItem("accessibility_enabled", String(accessibilityOn));
    localStorage.setItem("prime_contacts_json", JSON.stringify(primeContacts));
  }, [userName, selectedModel, selectedVoice, personality, accessibilityOn, primeContacts]);

  // Read backend logs on mount, then poll logs periodically to represent active Logcat
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error("Logcat synchronization failure:", err);
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  // Safe manual Logcat Addition helper
  const addLog = async (level: "I" | "D" | "W" | "E", tag: string, message: string) => {
    try {
      await fetch("/api/logs/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, tag, message }),
      });
    } catch (e) {
      // Offline fallback log appending
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      setLogs((prev) => [...prev, { timestamp, level, tag, message }]);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
      setLogs([]);
    } catch (e) {
      setLogs([]);
    }
  };

  // Decode raw 16-bit PCM at 24000Hz (Standard output rate of Gemini Speech Synthesizer)
  const speakVoice = (base64PCM: string) => {
    try {
      // Clean interrupt standard if MYRA is speaking! (Meets prompt interruption specs)
      if (playAudioRef.current.source) {
        try {
          playAudioRef.current.source.stop();
        } catch (e) {}
        playAudioRef.current.source = null;
        addLog("D", "AudioEngine", "Speaking interrupted. Flashing buffer queue.");
      }

      if (!base64PCM) return;

      const binary = window.atob(base64PCM);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const ctx = playAudioRef.current.ctx || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      playAudioRef.current.ctx = ctx;

      const buffer = ctx.createBuffer(1, pcm16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768; // Normalized spectrum
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      setMyraState("SPEAKING");
      addLog("I", "AudioEngine", `Playback pipeline active. Streaming voice: ${selectedVoice}`);

      source.onended = () => {
        setMyraState("IDLE");
        playAudioRef.current.source = null;
        addLog("D", "AudioEngine", "Audio track drained. Standby mode active.");
      };

      source.start();
      playAudioRef.current.source = source;
    } catch (err: any) {
      addLog("E", "AudioEngine", `Voice decoding crash: ${err?.message || String(err)}`);
      setMyraState("IDLE");
    }
  };

  // Stop current active voice synthesis (interruption capability)
  const stopVoice = () => {
    if (playAudioRef.current.source) {
      try {
        playAudioRef.current.source.stop();
      } catch (e) {}
      playAudioRef.current.source = null;
      setMyraState("IDLE");
      addLog("I", "AudioEngine", "Speech synthesis interrupted and stopped by user.");
    }
  };

  // Automated first-launch boot and welcome greet dialog
  useEffect(() => {
    const startupGreeting = async () => {
      addLog("I", "GeminiLiveClient", "WebSocket session connected on first boot.");
      addLog("I", "AudioEngine", "Microphone record channel and Playback streams active.");
      
      const welcomePromptText = `Initialize system wake up. Say a sweet welcoming greeting. Address me as "${userName}". Personality Mode: "${personality}"`;
      
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: welcomePromptText,
            model: selectedModel,
            voiceName: selectedVoice,
            personality: personality,
            user_name: userName,
            voice_response: true,
            history: [],
            prime_contacts: primeContacts,
          }),
        });
        
        const data = await res.json();
        if (data.success && data.text) {
          const myraMsg: ChatMessage = {
            id: "msg_" + Date.now(),
            text: data.text,
            isUser: false,
            timestamp: Date.now(),
          };
          setMessages([myraMsg]);
          if (data.audio) {
            speakVoice(data.audio);
          }
        }
      } catch (err: any) {
        addLog("E", "GeminiLiveClient", `Startup fetch greeting failed: ${err?.message}`);
      }
    };

    setTimeout(startupGreeting, 1200);
  }, []);

  // Post messages to chat endpoint
  const sendMessage = async (text: string) => {
    // Interruption check: If user speaks while MYRA plays, halt currently playing track!
    stopVoice();

    const userMsg: ChatMessage = {
      id: "msg_user_" + Date.now(),
      text,
      isUser: true,
      timestamp: Date.now(),
    };

    // Update screen display state
    setMessages((prev) => [...prev, userMsg]);
    setMyraState("THINKING");

    // Map conversation logs to brief format passed to Gemini
    const historyPayload = messages.slice(-10).map((m) => ({
      text: m.text,
      isUser: m.isUser,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          model: selectedModel,
          voiceName: selectedVoice,
          personality: personality,
          user_name: userName,
          voice_response: true,
          history: historyPayload,
          prime_contacts: primeContacts,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const myraMsg: ChatMessage = {
          id: "msg_myra_" + Date.now(),
          text: data.text,
          isUser: false,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, myraMsg]);

        // Synthesize audio reply if base64 stream returned
        if (data.audio) {
          speakVoice(data.audio);
        } else {
          setMyraState("IDLE");
        }

        // Handle mapped App Command Actions
        if (data.command) {
          // Trigger custom event handled directly within PhoneSimulator layout
          const event = new CustomEvent("myra-execute-command", { detail: data.command });
          window.dispatchEvent(event);
        }

      } else {
        addLog("E", "GeminiLiveClient", `Error reply returned from proxy: ${data.error}`);
        setMyraState("IDLE");
      }
    } catch (err: any) {
      addLog("E", "GeminiLiveClient", `Critical pipeline call failure: ${err?.message || err}`);
      setMyraState("IDLE");
    }
  };

  // SIMULATE: Telephony Call Rings
  const simulateIncomingCall = (callerName: string, phoneNumber: string) => {
    addLog("I", "CallMonitorService", `Simulation: CALL_STATE_RINGING. Caller: "${callerName}" (${phoneNumber})`);
    
    setRingingCall({
      active: true,
      name: callerName,
      number: phoneNumber,
      state: "ringing"
    });

    // Make MYRA voice-announce the Ringing call state (GF Mode, Professional, etc.)
    setTimeout(async () => {
      let announcementText = `Sir, ${callerName} er call ashche. Receive korbo naki reject korbo?`;
      if (personality === "GF") {
        announcementText = `Hey shona! Dekho tumader bondhu ${callerName} call korche. Receive korbo, naki cut kore debo? Bolo na! 😊`;
      } else if (personality === "Professional") {
        announcementText = `Sir, an incoming call is detected from ${callerName}. Do you wish to accept or reject this transmission?`;
      } else {
        announcementText = `Hey! ${callerName} er call ashche. Receive korbo naki cut korbo, bolun?`;
      }

      addLog("D", "CallMonitorService", `Telephony Broadcast: Announcing caller "${callerName}" verbally.`);
      
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Verbal ringer announcement hook: "${announcementText}"`,
            model: selectedModel,
            voiceName: selectedVoice,
            personality: personality,
            user_name: userName,
            voice_response: true,
            history: [],
            prime_contacts: primeContacts,
          }),
        });

        const data = await res.json();
        if (data.success && data.text) {
          if (data.audio) {
            speakVoice(data.audio);
          }
        }
      } catch (err) {
        addLog("E", "CallMonitorService", "Telephony announce speaker failure.");
      }
    }, 1000);
  };

  // Telecom actions decision handler
  const handleCallDecision = (accepted: boolean) => {
    if (!ringingCall) return;

    if (accepted) {
      addLog("I", "CallMonitorService", "User accepted incoming call [TelecomManager.acceptRingingCall()]");
      setRingingCall({
        ...ringingCall,
        state: "connected"
      });
      addLog("I", "CallMonitorService", "Call audio stream connected. Status: OFFHOOK");
    } else {
      addLog("I", "CallMonitorService", "User disconnected call stream [TelecomManager.endCall()]");
      setRingingCall(null);
      // Trigger a Broadcast ended event
      addLog("I", "BootReceiver", "Telephony Broadcast: CALL_STATE_IDLE. com.myra.CALL_ENDED");
    }
  };

  // Toggle background Floating orb overlay service
  const triggerOverlay = () => {
    const nextState = !showFloatingOverlay;
    setShowFloatingOverlay(nextState);
    addLog("I", "MyraOverlayService", `${nextState ? "Starting" : "Stopping"} overlay thread [TYPE_APPLICATION_OVERLAY]`);
  };

  return (
    <div id="applet-dashboard" className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* Upper Glowing Mesh Canvas */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-red-950/15 via-purple-950/5 to-transparent pointer-events-none select-none z-0" />

      {/* Primary Developer Banner Header */}
      <header className="h-14 px-6 border-b border-zinc-850 flex items-center justify-between z-10 bg-black/45 select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FF1744] to-[#D500F9] flex items-center justify-center shadow-lg shadow-red-500/20">
            <Sparkles className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-widest text-[#FF1744] leading-none mb-0.5 select-all">MYRA</h1>
            <span className="text-[9px] font-mono tracking-wider text-zinc-500 leading-none">ANDROID VOICE ASSISTANT SIMULATOR CONSOLE</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-900">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>PORT 3000 CONTAINERINGRESS</span>
          </div>
        </div>
      </header>

      {/* Central Split Layout Panel */}
      <main className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-850">
        
        {/* Left Grid: Smartphone Simulator center */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[480px] lg:min-h-0 relative bg-black/10 overflow-y-auto">
          
          <PhoneSimulator
            myraState={myraState}
            setMyraState={setMyraState}
            messages={messages}
            onSendMessage={sendMessage}
            onOpenSettings={() => setShowSettings(true)}
            userName={userName}
            personality={personality}
            primeContacts={primeContacts}
            accessibilityOn={accessibilityOn}
            setAccessibilityOn={setAccessibilityOn}
            hwFlashlight={hwFlashlight}
            setHwFlashlight={setHwFlashlight}
            hwWifi={hwWifi}
            setHwWifi={setHwWifi}
            hwBluetooth={hwBluetooth}
            setHwBluetooth={setHwBluetooth}
            hwVolume={hwVolume}
            setHwVolume={setHwVolume}
            addLog={addLog}
            ringingCall={ringingCall}
            setRingingCall={setRingingCall}
            onCallDecision={handleCallDecision}
          />

          {/* Floating Settings Screen View inside bezel frame */}
          {showSettings && (
            <SettingsScreen
              onBack={() => setShowSettings(false)}
              userName={userName}
              setUserName={setUserName}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
              personality={personality}
              setPersonality={setPersonality}
              primeContacts={primeContacts}
              setPrimeContacts={setPrimeContacts}
              accessibilityOn={accessibilityOn}
              setAccessibilityOn={setAccessibilityOn}
            />
          )}
        </div>

        {/* Right Grid: Developer Logcat Control console monitor */}
        <ControlPanel
          logs={logs}
          onClearLogs={clearLogs}
          onSimulateCall={simulateIncomingCall}
          onTriggerOverlay={triggerOverlay}
          hwFlashlight={hwFlashlight}
          hwWifi={hwWifi}
          hwBluetooth={hwBluetooth}
          hwVolume={hwVolume}
        />
      </main>

      {/* Simulated Floating Device Orb Overlay (`MyraOverlayService.kt`) */}
      {showFloatingOverlay && (
        <FloatingOverlay
          state={myraState}
          onTap={() => {
            // Trigger standard OS speech listening
            const event = new CustomEvent("myra-execute-command", {
              detail: { type: "OPEN_APP", params: { app_name: "home" } }
            });
            window.dispatchEvent(event);
            addLog("I", "MyraOverlayService", "Overlay clicked. Forcing system wake.");
          }}
          onClose={() => triggerOverlay()}
        />
      )}
    </div>
  );
}
