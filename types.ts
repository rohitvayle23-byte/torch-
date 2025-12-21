
export enum TorchMode {
  NORMAL = 'NORMAL',
  STROBE = 'STROBE',
  SOS = 'SOS',
  MORSE = 'MORSE',
  SOUND_REACTIVE = 'SOUND_REACTIVE',
  MOOD = 'MOOD'
}

export interface MoodConfig {
  color: string;
  pulseSpeed: number;
  intensity: number;
  description: string;
}

export interface MorseSequence {
  char: string;
  sequence: string; // e.g., "..." or "---"
}
