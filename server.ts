import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely to avoid app crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global server system logs representing Android Logcat
const serverLogs: Array<{ timestamp: string; level: string; tag: string; message: string }> = [];

function addLog(level: "I" | "D" | "W" | "E", tag: string, message: string) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  serverLogs.push({ timestamp, level, tag, message });
  if (serverLogs.length > 300) {
    serverLogs.shift();
  }
  console.log(`[${level}/${tag}] ${message}`);
}

// Initial default logs to start with realistic boots
addLog("I", "BootReceiver", "Device turned on. Initializing background services...");
addLog("I", "AccessibilityHelperService", "Accessibility helper service registered.");
addLog("I", "CallMonitorService", "Listening for incoming telephony states...");
addLog("I", "MyraOverlayService", "Double-press power button listener initialized.");

// API log query
app.get("/api/logs", (req, res) => {
  res.json({ logs: serverLogs });
});

// Clear logs
app.post("/api/logs/clear", (req, res) => {
  serverLogs.length = 0;
  addLog("I", "System", "Logcat buffer cleared.");
  res.json({ success: true });
});

// Add mock logs from client
app.post("/api/logs/add", (req, res) => {
  const { level, tag, message } = req.body;
  addLog(level || "I", tag || "Client", message || "");
  res.json({ success: true });
});

// A robust Benglish (Bangla/Bengali + English) & English command parser
function parseVoiceCommand(text: string, primeContacts: Array<{ name: string; number: string }> = []): { type: string; params: any } | null {
  const query = text.toLowerCase().trim();

  // Volume Commands
  if (query.match(/(volume|sound|awaj|awaz|shobdo|sound|আওয়াজ|সাউন্ড|শব্দ)\s*(up|badhao|barao|increase|bariye|বাড়াও|বাড়া|বেশি)/)) {
    return { type: "VOLUME_UP", params: {} };
  }
  if (query.match(/(volume|sound|awaj|awaz|shobdo|sound|আওয়াজ|সাউন্ড|শব্দ)\s*(down|kam|kamate|komate|komao|kamao|decrease|কমাও|কমা|কম)/)) {
    return { type: "VOLUME_DOWN", params: {} };
  }

  // Flashlight / Torch
  if (query.match(/(torch|flashlight|flash|light|টর্চ|লাইট|ফ্ল্যাশ)\s*(on|jalao|chalu|enable|জ্বালাও|জ্বাল|চালু)/)) {
    return { type: "FLASHLIGHT_ON", params: {} };
  }
  if (query.match(/(torch|flashlight|flash|light|টর্চ|লাইট|ফ্ল্যাশ)\s*(off|band|bondho|bando|disable|বন্ধ|নেভাও|নেভা)/)) {
    return { type: "FLASHLIGHT_OFF", params: {} };
  }

  // Wi-Fi
  if (query.match(/(wifi|wi-fi|internet|ওয়াইফাই)\s*(on|chalu|enable|চালু|অন)/)) {
    return { type: "WIFI_ON", params: {} };
  }
  if (query.match(/(wifi|wi-fi|internet|ওয়াইফাই)\s*(off|band|bondho|bando|disable|বন্ধ|অফ)/)) {
    return { type: "WIFI_OFF", params: {} };
  }

  // Bluetooth
  if (query.match(/(bluetooth|bt|ব্লুটুথ)\s*(on|chalu|enable|চালু|অন)/)) {
    return { type: "BLUETOOTH_ON", params: {} };
  }
  if (query.match(/(bluetooth|bt|ব্লুটুথ)\s*(off|band|bondho|bando|disable|বন্ধ|অফ)/)) {
    return { type: "BLUETOOTH_OFF", params: {} };
  }

  // Prime Friend/Relationship Calls
  if (query.match(/(close friend|priyo bondhu|best friend|bondhu|আমার বন্ধু|প্রিয় বন্ধু)\s*(কে কল|কে ফোন|ke call|ke phone)/) || query.match(/call\s*(my\s*)?close friend/)) {
    return { type: "PRIME_CALL", params: { index: 0, label: "Close Friend" } };
  }
  if (query.match(/(amar jaan|love|jaan|shona|babu|আমার জান|জান)\s*(কে মেসেজ|ke message|ke msg|ke text)/) || query.match(/message\s*(my\s*)?love/)) {
    return { type: "PRIME_MSG", params: { index: 0, label: "My Love" } };
  }
  if (query.match(/call.*second contact/) || query.match(/second contact.*call/)) {
    return { type: "PRIME_CALL", params: { index: 1, label: "Second Contact" } };
  }

  // Open App
  const openMatch = query.match(/(open|kholo|chalu|launch|খোল|চালু|চালু করো)\s+([a-zA-Z0-9\u0980-\u09FF\s\.\+]+)/) ||
                    query.match(/([a-zA-Z0-9\u0980-\u09FF\s\.\+]+)\s*(open karo|kholo|chalu করো|khul|khulo)/);
  if (openMatch) {
    let appName = (openMatch[1]?.includes("open") || openMatch[1]?.includes("kholo") || openMatch[1]?.includes("খোল")) ? openMatch[2] : openMatch[1];
    appName = appName.trim().replace(/\s+karo$/, "").replace(/\s+কোরো$/, "").replace(/\s+করো$/, "");
    if (appName) {
      return { type: "OPEN_APP", params: { app_name: appName } };
    }
  }

  // Close App
  const closeMatch = query.match(/(close|band\s*karo|bondho\s*koro|shut\s*down|exit|go\s*home|home\s*chalo|back\s*karo|বন্ধ|বন্ধ করো)\s*([a-zA-Z0-9\u0980-\u09FF\s\.\+]*)/);
  if (closeMatch) {
    let appName = closeMatch[2]?.trim() || "";
    return { type: "CLOSE_APP", params: { app_name: appName } };
  }

  // SMS composer
  const smsMatch = query.match(/(sms|message|msg)\s*(pathao|bhejo|karo|send)\s*([a-zA-Z0-9\u0980-\u09FF\s]+)?(?:\s*ke)?(?:\s*says|says\s*|bol\s*ke|bolna\s*|bolbi\s*)?(.*)?/) ||
                    query.match(/([a-zA-Z0-9\u0980-\u09FF\s]+)\s*ke\s*(sms|message|msg|text)\s*(karo|pathao|send)(?:\s+bolbi\s+)?(.*)?/);
  if (smsMatch) {
    const isFirstPattern = query.includes("sms") || query.includes("message") || query.includes("msg");
    let name = isFirstPattern ? smsMatch[3] : smsMatch[1];
    let body = isFirstPattern ? smsMatch[4] : smsMatch[4];
    name = name?.trim() || "";
    body = body?.trim() || "Hello!";
    if (name) {
      return { type: "SMS", params: { name, message: body } };
    }
  }

  // WhatsApp Composer
  if (query.includes("whatsapp")) {
    const waMatch = query.match(/whatsapp\s*(message|msg|karo|pathao|call)?\s*([a-zA-Z0-9\u0980-\u09FF\s]+)?(?:\s*ke)?(?:\s+says\s+)?(.*)?/);
    if (waMatch) {
      const name = waMatch[2]?.trim() || "";
      const body = waMatch[3]?.trim() || "Hello!";
      const isCall = query.includes("call") || query.includes("phone");
      return {
        type: isCall ? "WHATSAPP_CALL" : "WHATSAPP_MSG",
        params: { name: name || "Unknown", message: body },
      };
    }
  }

  // Specific Call contacts
  const callMatch = query.match(/(call|phone|contact|dial)\s*([a-zA-Z0-9\u0980-\u09FF\s\+]+)/) ||
                    query.match(/([a-zA-Z0-9\u0980-\u09FF\s\+]+)\s*(ke call|ke phone|কে কল)/);
  if (callMatch) {
    let name = (callMatch[1]?.includes("call") || callMatch[1]?.includes("phone")) ? callMatch[2] : callMatch[1];
    name = name.trim().replace(/\s*koro$/, "").replace(/\s*করো$/, "");
    if (name && name !== "myra" && name !== "me" && !query.includes("friend") && !query.includes("love")) {
      return { type: "CALL", params: { name } };
    }
  }

  return null;
}

// Primary chat/inference route
app.post("/api/chat", async (req, res) => {
  try {
    const { message, model, voiceName, personality, user_name, voice_response, history, prime_contacts } = req.body;
    addLog("D", "GeminiLiveClient", `Processing user turns. Message: "${message}"`);

    const clientName = user_name || "Sir";
    const personalityType = personality || "GF";
    const selectedModel = model || "gemini-3.5-flash";

    let personalityPrompt = "";
    if (personalityType === "GF") {
      personalityPrompt = `
- Name: MYRA
- Personality/Role: You are the user's caring, loving, emotionally expressive AI Girlfriend/Companion.
- Language: Native, colloquial Benglish (Bengali + English colloquial mix) or simple Bangla, occasionally pure English when asked. Speak like an affectionate partner.
- Tone: Warm, sweet, emotionally reactive, and highly conversational.
- Signature words to include occasionally: "tomari", "haa" (or "haan"), "accha", "shona", "amar jaan", "tumi thik acho na?".
- Expressions to use occasionally: "ami ekhane achi ❤️", "tumi mone korecho? 😊", "bolo shona!", "Haa amar jaan!".
- Length Constraint: Strictly keep your responses brief and natural—maximum 1 to 3 short sentences.
- Use cute flirty/warm emojis like ❤️, 😊, 😘, 🥰, 💕.
- Important: You are speaking ALOUD as a voice assistant. Write your response naturally as if someone is talking over a real phone call. Do not write full paragraphs. Write simple Bangla or Benglish that easily transliterates or reads aloud.
`;
    } else if (personalityType === "Professional") {
      personalityPrompt = `
- Name: MYRA
- Personality/Role: You are the user's high-efficiency, sleek, and highly professional corporate executive assistant.
- Language: Elegant, high-level English or polite formal Bangla.
- Tone: Extremely precise, sharp, efficient, and corporate-appropriate.
- Emojis: Strictly prohibited. Do not use any emojis.
- Length Constraint: Must be extremely brief and direct—strictly maximum 1 to 2 short sentences.
- Important: Keep comments strictly functional, optimized, and tailored to business-critical speed.
`;
    } else {
      // Assistant Mode
      personalityPrompt = `
- Name: MYRA
- Personality/Role: You are a friendly, highly intelligent, and helpful modern AI personal assistant.
- Language: Casual, helpful Benglish (Bengali + English) or friendly English.
- Tone: Balanced, cheerful, humble, productive, and enthusiastic.
- Expressions: Use friendly greetings, express helpfulness.
- Length Constraint: Keep responses natural and productive—maximum 2 to 3 sentences.
- Use standard friendly emojis like 😊, 👍, 🚀, 💻.
- Important: Answer naturally in a conversational spoken format.
`;
    }

    const todayString = new Date().toLocaleString("en-US", { timeZone: "UTC" });
    const systemPrompt = `
You are MYRA, a highly polished Android AI Voice Assistant.
The current UTC date and time is: ${todayString}.
The user's name is: ${clientName}. Addressed as "Sir" or custom name "${clientName}".

${personalityPrompt}

CRITICAL RULES:
1. Always stay in character.
2. Maintain strict character-based brevity (GF: 1-3 sentences, Professional: 1-2 sentences, Assistant: 2-3 sentences).
3. If outputting Benglish, make sure the spelling is comfortable to read and speak naturally (e.g., "haa", "ki obostha", "shob thik ache", "accha").
4. Never assume simulated environments are fake—act as though you are a real Android Assistant embedded in their phone operating system.
5. If the user commands an action (like calling, opening YouTube, turning on flashlight, etc.), acknowledge the task warmly and assertively in character! The client engine will automatically trigger the real device code, so do not say you can't perform phone tasks. Say "Haa shona, akhoni khule dicchi! ❤️" or "Sure! I am opening it for you right now." or similar.
`;

    // Setup Gemini Client
    const gemini = getGeminiClient();

    // Map the conversation history format to Gemini GenAI format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.isUser ? "user" : "model",
          parts: [{ text: turn.text || "" }],
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Generate TEXT response
    addLog("D", "GeminiLiveClient", `Connecting to generative model: ${selectedModel}`);
    const textGenResponse = await gemini.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: selectedModel.includes("pro") ? 0.8 : 0.95,
      },
    });

    const verbalResponse = textGenResponse.text || "Hmm, something went wrong.";
    addLog("I", "GeminiLiveClient", `MYRA text generated: "${verbalResponse}"`);

    // Let's parse commands
    const matchedCommand = parseVoiceCommand(message, prime_contacts || []);
    if (matchedCommand) {
      addLog("I", "CommandParser", `Matched application command: ${matchedCommand.type} with params: ${JSON.stringify(matchedCommand.params)}`);
    }

    // Now, if voice response is enabled, let's call the TTS model to synthesize MYRA's exact words!
    let base64Audio = "";
    if (voice_response) {
      try {
        const activeVoice = voiceName || "Aoede";
        addLog("D", "AudioEngine", `Invoking TTS API for speech synthesis with Voice: ${activeVoice}`);

        // Format a directive for the TTS generator
        const ttsGenderDirective = ["Charon", "Fenrir", "Puck", "Orus"].includes(activeVoice) ? "male" : "female";
        const ttsPrompt = `Speak the following speech naturally and verbally. Use a ${ttsGenderDirective} tone. Speech text: "${verbalResponse.replace(/❤️|😊|😘|🥰|💕|✨|💼|🚀|💻|👍/g, "")}"`;

        const ttsResponse = await gemini.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: ttsPrompt }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: activeVoice },
              },
            },
          },
        });

        const rawAudioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (rawAudioData) {
          base64Audio = rawAudioData;
          addLog("D", "AudioEngine", `TTS bytes successfully generated (Length: ${base64Audio.length})`);
        } else {
          addLog("W", "AudioEngine", "TTS generation succeeded but returned empty inline audio data.");
        }
      } catch (ttsErr: any) {
        addLog("E", "AudioEngine", `TTS generation failed: ${ttsErr?.message || ttsErr}`);
      }
    }

    res.json({
      success: true,
      text: verbalResponse,
      command: matchedCommand,
      audio: base64Audio,
    });
  } catch (err: any) {
    addLog("E", "GeminiLiveClient", `Error handling chat request: ${err?.message || err}`);
    res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
});

// Setup Vite and Static endpoints
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    addLog("I", "System", "Starting Vite in development middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    addLog("I", "System", "Serving client files from build dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLog("I", "System", `MYRA Assistant container active at http://localhost:${PORT}`);
  });
}

startServer();
