import React, { useState } from "react";
import { PrimeContact, VoiceOption, ModelOption } from "../types";
import { X, Plus, Trash2, ShieldCheck, ShieldAlert, Heart, User, Sparkles } from "lucide-react";

interface SettingsScreenProps {
  onBack: () => void;
  userName: string;
  setUserName: (name: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  personality: "GF" | "Professional" | "Assistant";
  setPersonality: (mode: "GF" | "Professional" | "Assistant") => void;
  primeContacts: PrimeContact[];
  setPrimeContacts: (contacts: PrimeContact[]) => void;
  accessibilityOn: boolean;
  setAccessibilityOn: (enabled: boolean) => void;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { name: "Aoede (Female - Default)", voiceId: "Aoede", gender: "Female" },
  { name: "Charon (Male)", voiceId: "Charon", gender: "Male" },
  { name: "Kore (Female)", voiceId: "Kore", gender: "Female" },
  { name: "Fenrir (Male)", voiceId: "Fenrir", gender: "Male" },
  { name: "Puck (Male)", voiceId: "Puck", gender: "Male" },
  { name: "Leda (Female)", voiceId: "Leda", gender: "Female" },
  { name: "Orus (Male)", voiceId: "Orus", gender: "Male" },
  { name: "Zephyr (Female)", voiceId: "Zephyr", gender: "Female" },
];

const MODEL_OPTIONS: ModelOption[] = [
  { label: "Native Audio (Fast Speech) - Recommended", modelString: "gemini-3.5-flash" },
  { label: "Flash Live (Quick Reasoning)", modelString: "gemini-3.1-flash-lite" },
  { label: "Pro Audio Dialogue (Advanced Reasoning)", modelString: "gemini-3.1-pro-preview" },
];

export default function SettingsScreen({
  onBack,
  userName,
  setUserName,
  selectedModel,
  setSelectedModel,
  selectedVoice,
  setSelectedVoice,
  personality,
  setPersonality,
  primeContacts,
  setPrimeContacts,
  accessibilityOn,
  setAccessibilityOn,
}: SettingsScreenProps) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNumber.trim()) return;

    const newContact: PrimeContact = {
      id: "contact_" + Date.now(),
      name: newName.trim(),
      number: newNumber.trim(),
    };

    setPrimeContacts([...primeContacts, newContact]);
    setNewName("");
    setNewNumber("");
    setShowAddContact(false);
  };

  const handleDeleteContact = (id: string) => {
    setPrimeContacts(primeContacts.filter((c) => c.id !== id));
  };

  return (
    <div className="absolute inset-0 bg-[#050505] z-30 flex flex-col pt-12 pb-5 px-4 overflow-y-auto">
      {/* Settings Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4 sticky top-0 bg-[#050505]/95 backdrop-blur-md z-12">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono text-red-500 tracking-wider">Configuration</span>
          <span className="text-lg font-black tracking-tight text-zinc-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-red-500" /> SYSTEM SETTINGS
          </span>
        </div>
        <button
          onClick={onBack}
          className="p-1 px-3 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-zinc-850 rounded-lg text-xs font-mono text-zinc-300 hover:text-red-500 transition-all flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" /> Close
        </button>
      </div>

      {/* Settings Form */}
      <div className="flex flex-col gap-5 pb-8">
        
        {/* User Identity Section */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
          <label className="text-xs font-mono text-red-500 flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5" /> USER ADDRESS NAME
          </label>
          <p className="text-[10px] text-zinc-500 mb-2 font-mono">
            How MYRA will address you in verbal and written dialogues.
          </p>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Priya or Sir"
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 text-zinc-100 text-xs rounded-lg p-2.5 outline-none transition-colors"
          />
        </div>

        {/* Personality Mode Choice */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
          <label className="text-xs font-mono text-red-500 flex items-center gap-1.5 mb-1.5">
            <Heart className="w-3.5 h-3.5 animate-pulse" /> PERSONALITY SYSTEM TYPE
          </label>
          <p className="text-[10px] text-zinc-500 mb-3 font-mono">
            Adapts vocabulary, slang, emojis, and maximum reply constraints.
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            {(["GF", "Professional", "Assistant"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPersonality(mode)}
                className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                  personality === mode
                    ? "bg-red-950/40 border-red-500 text-red-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {mode === "GF" ? "💖 GF Mode" : mode === "Professional" ? "💼 Professional" : "🤖 Assistant"}
              </button>
            ))}
          </div>
        </div>

        {/* AI Speech Voice Selection */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
          <label className="text-xs font-mono text-red-500 mb-2 block">AI SYNTHESIS VOICE (8 OPTIONS)</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 text-zinc-200 text-xs rounded-lg p-2.5 underline-none cursor-pointer outline-none transition-colors"
          >
            {VOICE_OPTIONS.map((opt) => (
              <option key={opt.voiceId} value={opt.voiceId}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Gemini Model Option */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
          <label className="text-xs font-mono text-red-500 mb-2 block">LIVE REASONING MODEL</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-500 text-zinc-200 text-xs rounded-lg p-2.5 underline-none cursor-pointer outline-none transition-colors"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.modelString} value={opt.modelString}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Accessibility Status Helper */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-mono text-red-500">ACCESSIBILITY SERVICE</span>
            <span className="text-[9px] font-mono text-zinc-500">Allows MYRA to simulate device clicks & open apps.</span>
          </div>
          <button
            onClick={() => setAccessibilityOn(!accessibilityOn)}
            className={`p-1.5 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-mono border transition-all cursor-pointer ${
              accessibilityOn
                ? "bg-emerald-950/20 border-emerald-500 text-emerald-400"
                : "bg-red-950/20 border-red-500 text-red-400 animate-pulse"
            }`}
          >
            {accessibilityOn ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> ENABLED
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" /> DISABLED
              </>
            )}
          </button>
        </div>

        {/* Prime Contacts Module */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-red-500">PRIME CONTACTS ({primeContacts.length})</label>
            <button
              onClick={() => setShowAddContact(true)}
              className="p-1 bg-red-955/30 border border-red-500/40 text-red-400 text-[10px] rounded hover:bg-red-500 hover:text-black font-mono transition-all flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> ADD PRIME
            </button>
          </div>
          
          <p className="text-[10px] text-zinc-500 mb-3 font-mono">
            Key contacts queried inside voice scripts, e.g. "call my close friend".
          </p>

          {/* Quick Contact Adding Form */}
          {showAddContact && (
            <form onSubmit={handleAddContact} className="p-2 border border-dashed border-red-500/30 rounded-lg bg-zinc-900/50 mb-3 flex flex-col gap-2">
              <span className="text-[9px] font-mono text-red-500 block uppercase">New Contact Details</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 p-1.5 text-xs text-zinc-200 rounded outline-none text-center"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  required
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 p-1.5 text-xs text-zinc-200 rounded outline-none text-center"
                />
              </div>
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="px-2 py-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-[9px] font-mono bg-red-500 text-black rounded font-bold hover:bg-red-400 transition-colors"
                >
                  Save Prime
                </button>
              </div>
            </form>
          )}

          {/* List of custom contacts */}
          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
            {primeContacts.length === 0 ? (
              <div className="text-center py-4 bg-zinc-900/30 border border-zinc-900 text-zinc-600 text-[10px] font-mono rounded-lg">
                No prime contacts saved. Click Add Prime above.
              </div>
            ) : (
              primeContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-850"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-900/40">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-300">{contact.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{contact.number}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1 px-1.5 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500/30 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Disclosures */}
        <div className="p-3 border border-red-500/10 rounded-xl bg-red-950/5">
          <span className="text-[10px] font-mono text-red-500/70 block uppercase tracking-wider mb-1">
            API Security Disclosure
          </span>
          <p className="text-[9.5px] text-zinc-500 leading-normal font-mono">
            All AI operations run securely within the NodeJS middleware proxy layer on port 3000. Under platform guidelines, no keys are ever stored or exposed client-side. The standard model selects <code className="text-zinc-300">gemini-3.5-flash</code> automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
