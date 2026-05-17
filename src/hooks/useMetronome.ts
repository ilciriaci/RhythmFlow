import { useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { SequenceStep, BpmGrowth, DurationType } from '../types';

type RemainderType = 'whole' | 'fixed' | 'sliding';

interface MetronomeEvent {
  time: string;
  isAccent: boolean;
  isMainBeat: boolean;
  isSoundBeat: boolean;
  isUIBeat: boolean;
  stepIdx: number;
  measure: number;
  beat: number;
  beatFractional: number;
  remainder: number;
  remainderType: RemainderType;
  subdivision: string;
}

interface UseMetronomeOptions {
  bpm: number;
  sequence: SequenceStep[];
  bpmGrowth: BpmGrowth;
  flowDurationType: DurationType;
  flowDurationValue: number;
  onBpmChange: (bpm: number) => void;
  onUIUpdate: (update: {
    stepIdx: number;
    measure: number;
    beat: number;
    visualBeat: number;
    ghostBeat: number | null;
    ghostType: RemainderType | null;
  }) => void;
  onStop: () => void;
}

const EPSILON = 0.001;
const CONVENTIONAL_FRACTIONS = [0.25, 0.5, 0.75, 0.125, 0.375, 0.625, 0.875];
const TRIPLET_FRACTIONS = [1 / 3, 2 / 3];

function isApproximatelyEqual(a: number, b: number) {
  return Math.abs(a - b) < EPSILON;
}

function classifyRemainder(remainder: number): RemainderType {
  if (isApproximatelyEqual(remainder, 0)) return 'whole';
  for (const frac of CONVENTIONAL_FRACTIONS) {
    if (isApproximatelyEqual(remainder, frac)) return 'fixed';
  }
  for (const frac of TRIPLET_FRACTIONS) {
    if (isApproximatelyEqual(remainder, frac)) return 'sliding';
  }
  return 'sliding';
}

export function isCompoundTimeSignature(timeSignature: string): boolean {
  const [num] = timeSignature.split('/').map(Number);
  return num % 3 === 0 && num > 3;
}

export function getEffectiveBeats(timeSignature: string): number {
  const [num] = timeSignature.split('/').map(Number);
  return isCompoundTimeSignature(timeSignature) ? num / 3 : num;
}

export function useMetronome(getOptions: () => UseMetronomeOptions) {
  const synthRef = useRef<Tone.Synth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const currentBpmRef = useRef<number>(120);
  const startingBpmRef = useRef<number>(120);
  const measureCountRef = useRef<number>(0);
  const globalMeasureRef = useRef<number>(0);
  const pendingRestartRef = useRef<boolean>(false);
  const syncStartRef = useRef<((isRestart?: boolean) => void) | null>(null);

  const initSynth = useCallback(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: 6,
    }).toDestination();

    return () => { synthRef.current?.dispose(); };
  }, []);

  const setVolume = useCallback((db: number) => {
    if (synthRef.current) synthRef.current.volume.value = db;
  }, []);

  const playClick = useCallback((time: number, isAccent: boolean) => {
    if (!synthRef.current) return;
    const playTime = typeof time === 'number' && !isNaN(time) ? time : Tone.now();
    const frequency = isAccent ? 880 : 440;
    const velocity = isAccent ? 1.0 : 0.7;
    try {
      synthRef.current.triggerAttackRelease(frequency, '32n', playTime, velocity);
    } catch {
      // Audio context may not be ready; click is silently skipped
    }
  }, []);

  const buildEvents = (
    sequence: SequenceStep[],
    bpmGrowth: BpmGrowth,
    flowDurationType: DurationType,
    flowDurationValue: number,
    currentBpm: number
  ) => {
    const events: MetronomeEvent[] = [];
    let accumulatedTicks = 0;

    // Time-based BPM growth: schedule all changes upfront
    if (bpmGrowth.enabled && bpmGrowth.unit === 'time') {
      const growthIntervalSecs = (bpmGrowth.every || 1) * 60;
      const stopTime = flowDurationType === 'time' ? flowDurationValue * 60 : 3600;
      let nextChangeTime = growthIntervalSecs;

      while (nextChangeTime < stopTime) {
        const changeTime = nextChangeTime;
        Tone.Transport.schedule((time) => {
          currentBpmRef.current += bpmGrowth.amount || 0;
          if (isFinite(currentBpmRef.current)) {
            Tone.Transport.bpm.rampTo(currentBpmRef.current, 1);
            Tone.Draw.schedule(() => getOptions().onBpmChange(Math.round(currentBpmRef.current)), time);
          }
        }, changeTime);
        nextChangeTime += growthIntervalSecs;
      }
    }

    sequence.forEach((step, idx) => {
      const [, den] = step.timeSignature.split('/').map(Number);
      const effectiveBeats = getEffectiveBeats(step.timeSignature) || 4;
      const subdivisionTicks = Math.round(Tone.Time(step.subdivision).toTicks());

      let beatTicks: number;
      if (isCompoundTimeSignature(step.timeSignature)) {
        beatTicks = Math.round(Tone.Time(`${den}n`).toTicks() * 3);
      } else {
        beatTicks = Math.round(Tone.Time(`${den}n`).toTicks());
      }

      const measureTicks = effectiveBeats * beatTicks;

      let stepMeasures = step.measures;
      if (sequence.length === 1 && step.durationType === 'time') {
        const totalSeconds = step.measures * 60;
        const secondsPerMeasure = (effectiveBeats * (den === 8 ? 0.5 : 1)) * (60 / currentBpm);
        stepMeasures = Math.ceil(totalSeconds / secondsPerMeasure);
      } else if (sequence.length === 1 && step.durationType === 'loop') {
        stepMeasures = 1;
      }

      const measureEventsMap = new Map<number, {
        tickInMeasure: number;
        isAccent: boolean;
        isMainBeat: boolean;
        isSubdivisionBeat: boolean;
      }>();

      for (let b = 0; b < effectiveBeats; b++) {
        const tick = b * beatTicks;
        measureEventsMap.set(tick, {
          tickInMeasure: tick,
          isAccent: b === 0,
          isMainBeat: true,
          isSubdivisionBeat: false,
        });
      }

      const numSubdivisions = Math.floor(measureTicks / subdivisionTicks);
      for (let s = 0; s <= numSubdivisions; s++) {
        const tick = Math.round(s * subdivisionTicks);
        if (tick >= measureTicks) break;
        if (measureEventsMap.has(tick)) {
          measureEventsMap.get(tick)!.isSubdivisionBeat = true;
        } else {
          measureEventsMap.set(tick, {
            tickInMeasure: tick,
            isAccent: tick === 0,
            isMainBeat: false,
            isSubdivisionBeat: true,
          });
        }
      }

      const isSubdivisionLong = subdivisionTicks >= beatTicks;
      const finalEvents = Array.from(measureEventsMap.values())
        .map(ev => {
          const shouldSound = isSubdivisionLong ? ev.isSubdivisionBeat : (ev.isMainBeat || ev.isSubdivisionBeat);
          return { ...ev, shouldSound, isEvent: shouldSound || ev.isMainBeat };
        })
        .filter(ev => ev.isEvent)
        .sort((a, b) => a.tickInMeasure - b.tickInMeasure);

      for (let m = 0; m < stepMeasures; m++) {
        const measureStartTick = m * measureTicks;
        for (const ev of finalEvents) {
          const absoluteTick = accumulatedTicks + measureStartTick + ev.tickInMeasure;
          const beatNumber = Math.floor(ev.tickInMeasure / beatTicks) + 1;
          const beatFractional = ev.tickInMeasure / beatTicks + 1;
          const remainder = (ev.tickInMeasure % beatTicks) / beatTicks;

          events.push({
            time: absoluteTick + 'i',
            isAccent: ev.isAccent,
            isMainBeat: ev.isMainBeat,
            isSoundBeat: ev.shouldSound,
            isUIBeat: true,
            stepIdx: idx,
            measure: m + 1,
            beat: beatNumber,
            beatFractional,
            remainder,
            remainderType: classifyRemainder(remainder),
            subdivision: step.subdivision,
          });
        }
      }

      accumulatedTicks += stepMeasures * measureTicks;
    });

    return { events, accumulatedTicks };
  };

  const syncStart = (isRestart = false) => {
    const { bpm, sequence, bpmGrowth, flowDurationType, flowDurationValue, onBpmChange, onUIUpdate, onStop } = getOptions();

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    currentBpmRef.current = bpm;

    if (!isRestart) {
      startingBpmRef.current = bpm;
      measureCountRef.current = 0;
      globalMeasureRef.current = 0;
    }

    partRef.current?.dispose();

    const { events, accumulatedTicks } = buildEvents(sequence, bpmGrowth, flowDurationType, flowDurationValue, bpm);

    partRef.current = new Tone.Part((time, event: MetronomeEvent) => {
      if (pendingRestartRef.current && event.isMainBeat && event.beat === 1) {
        pendingRestartRef.current = false;
        Tone.Draw.schedule(() => { syncStartRef.current?.(true); }, time);
        return;
      }

      if (event.isUIBeat) {
        Tone.Draw.schedule(() => {
          const isWholeBeat = event.remainderType === 'whole';
          getOptions().onUIUpdate({
            stepIdx: event.stepIdx,
            measure: globalMeasureRef.current,
            beat: Math.floor(event.beatFractional),
            visualBeat: Math.floor(event.beatFractional) - 1,
            ghostBeat: (!isWholeBeat && event.isSoundBeat) ? event.beatFractional : null,
            ghostType: (!isWholeBeat && event.isSoundBeat) ? event.remainderType : null,
          });
        }, time);
      }

      if (event.isSoundBeat) {
        playClick(time, event.isAccent);
      }

      if (event.isMainBeat && event.beat === 1) {
        measureCountRef.current++;
        globalMeasureRef.current++;

        const { bpmGrowth: currentBpmGrowth } = getOptions();
        if (currentBpmGrowth.enabled && currentBpmGrowth.unit === 'measures') {
          const every = currentBpmGrowth.every || 4;
          if (measureCountRef.current > every && measureCountRef.current % every === 1) {
            currentBpmRef.current += currentBpmGrowth.amount || 0;
            if (isFinite(currentBpmRef.current)) {
              Tone.Transport.bpm.rampTo(currentBpmRef.current, 0.1);
              Tone.Draw.schedule(() => getOptions().onBpmChange(Math.round(currentBpmRef.current)), time);
            }
          }
        }
      }
    }, events);

    const shouldLoop = flowDurationType === 'loop' || flowDurationType === 'measures' || flowDurationType === 'time';
    partRef.current.loop = shouldLoop;
    partRef.current.loopEnd = accumulatedTicks + 'i';
    partRef.current.start(0);

    if (flowDurationType === 'measures') {
      const totalTicks = flowDurationValue * Tone.Time('1m').toTicks();
      Tone.Transport.schedule((t) => {
        Tone.Draw.schedule(() => getOptions().onStop(), t);
      }, totalTicks + 'i');
    }

    if (flowDurationType === 'time') {
      Tone.Transport.schedule((t) => {
        Tone.Draw.schedule(() => getOptions().onStop(), t);
      }, flowDurationValue * 60);
    }

    Tone.Transport.start();
  };

  syncStartRef.current = syncStart;

  const start = async (isRestart = false) => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    syncStart(isRestart);
  };

  const stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    partRef.current?.dispose();
    pendingRestartRef.current = false;
    measureCountRef.current = 0;

    const resetBpm = startingBpmRef.current;
    currentBpmRef.current = resetBpm;
    Tone.Transport.bpm.value = resetBpm;
    return resetBpm;
  };

  const notifySequenceChange = () => {
    pendingRestartRef.current = true;
  };

  return { initSynth, setVolume, start, stop, notifySequenceChange, currentBpmRef };
}
