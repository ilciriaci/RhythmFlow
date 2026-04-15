export type Subdivision = '1n' | '2n' | '4n' | '8n' | '16n' | '8t' | '16t';

export type DurationType = 'measures' | 'time' | 'loop';

export interface BpmGrowth {
  enabled: boolean;
  amount: number;
  every: number;
  unit: 'measures' | 'time'; // 'time' in minutes
}

export interface SequenceStep {
  id: string;
  measures: number;
  timeInSeconds?: number;
  durationType: DurationType;
  subdivision: Subdivision;
  timeSignature: string; // e.g., "4/4", "3/4", "6/8"
  label: string;
}

export interface Routine {
  id: string;
  name: string;
  sequence: SequenceStep[];
  bpm: number;
  bpmGrowth: BpmGrowth;
  loopFlow: boolean;
  flowDurationType: DurationType;
  flowDurationValue: number; // measures or minutes
}

export interface MetronomeState {
  bpm: number;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  currentBeat: number;
  sequence: SequenceStep[];
}
