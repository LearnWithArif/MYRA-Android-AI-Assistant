export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export interface PrimeContact {
  id: string;
  name: string;
  number: string;
}

export type MyraState = "IDLE" | "LISTENING" | "SPEAKING" | "THINKING" | "ACTIVE";

export interface AppCommand {
  type: string;
  params: any;
}

export interface SystemLog {
  timestamp: string;
  level: "I" | "D" | "W" | "E";
  tag: string;
  message: string;
}

export interface VoiceOption {
  name: string;
  voiceId: string;
  gender: "Female" | "Male";
}

export interface ModelOption {
  label: string;
  modelString: string;
}
