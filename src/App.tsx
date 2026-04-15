/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  Settings2,
  Clock,
  Activity,
  Layers,
  Save,
  Copy,
  RotateCcw,
  Timer,
  TrendingUp,
  History,
  Edit3,
  Check,
  X,
  HelpCircle,
  Infinity as InfinityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SequenceStep, Subdivision, BpmGrowth, Routine, DurationType } from './types';

type RemainderType = 'whole' | 'fixed' | 'sliding';

const CONVENTIONAL_FRACTIONS = [0.25, 0.5, 0.75, 0.125, 0.375, 0.625, 0.875];

function classifyRemainder(remainder: number): RemainderType {
  if (remainder === 0) return 'whole';
  if (CONVENTIONAL_FRACTIONS.includes(remainder)) return 'fixed';
  return 'sliding';
}

const SUBDIVISIONS: { value: Subdivision; label: string; icon: React.ReactNode }[] = [
  { value: '1n', label: 'Whole', icon: <NoteIcon type="1n" /> },
  { value: '2n', label: 'Half', icon: <NoteIcon type="2n" /> },
  { value: '4n', label: 'Quarter', icon: <NoteIcon type="4n" /> },
  { value: '8n', label: 'Eighth', icon: <NoteIcon type="8n" /> },
  { value: '16n', label: 'Sixteenth', icon: <NoteIcon type="16n" /> },
  { value: '8t', label: '8th Triplet', icon: <NoteIcon type="8t" /> },
  { value: '16t', label: '16th Triplet', icon: <NoteIcon type="16t" /> },
];

function NoteIcon({ type, className }: { type: Subdivision; className?: string }) {
  const color = "currentColor";
  switch (type) {
    case '1n':
      return (
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className={className}>
          <ellipse cx="6" cy="15" rx="5" ry="4" fill={color} />
        </svg>
      );
    case '2n':
      return (
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" className={className}>
          <ellipse cx="5" cy="15" rx="4" ry="3" fill={color} />
          <path d="M9 2V16" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case '4n':
      return (
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none" className={className}>
          <path d="M10 2V14M10 14C10 16.2091 7.76142 18 5 18C2.23858 18 0 16.2091 0 14C0 11.7909 2.23858 10 5 10C7.76142 10 10 11.7909 10 14Z" fill={color} />
        </svg>
      );
    case '8n':
      return (
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className={className}>
          <path d="M10 2V14M10 14C10 16.2091 7.76142 18 5 18C2.23858 18 0 16.2091 0 14C0 11.7909 2.23858 10 5 10C7.76142 10 10 11.7909 10 14ZM10 2C10 2 14 3 14 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case '16n':
      return (
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className={className}>
          <path d="M10 2V14M10 14C10 16.2091 7.76142 18 5 18C2.23858 18 0 16.2091 0 14C0 11.7909 2.23858 10 5 10C7.76142 10 10 11.7909 10 14ZM10 2C10 2 14 3 14 7M10 5C10 5 14 6 14 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case '8t':
      return (
        <div className={cn("flex items-end gap-0.5", className)}>
          <NoteIcon type="8n" className="scale-75 origin-bottom" />
          <span className="text-[8px] font-bold mb-1">3</span>
        </div>
      );
    case '16t':
      return (
        <div className={cn("flex items-end gap-0.5", className)}>
          <NoteIcon type="16n" className="scale-75 origin-bottom" />
          <span className="text-[8px] font-bold mb-1">3</span>
        </div>
      );
    default:
      return null;
  }
}

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [tempBpm, setTempBpm] = useState('120');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sequence, setSequence] = useState<SequenceStep[]>([
    { id: '1', measures: 2, subdivision: '4n', timeSignature: '4/4', label: 'Intro', durationType: 'measures' },
    { id: '2', measures: 2, subdivision: '8n', timeSignature: '4/4', label: 'Build', durationType: 'measures' },
    { id: '3', measures: 2, subdivision: '16n', timeSignature: '4/4', label: 'Main', durationType: 'measures' },
  ]);
  
  const [bpmGrowth, setBpmGrowth] = useState<BpmGrowth>({
    enabled: false,
    amount: 5,
    every: 4,
    unit: 'measures'
  });

  const [loopFlow, setLoopFlow] = useState(true);
  const [flowDurationType, setFlowDurationType] = useState<DurationType>('loop');
  const [flowDurationValue, setFlowDurationValue] = useState(1); // 1 minute or 1 measure

  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem('rhythmflow_routines');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [visualBeat, setVisualBeat] = useState(0);
  const [ghostBeat, setGhostBeat] = useState<number | null>(null);
  const [ghostType, setGhostType] = useState<RemainderType | null>(null);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [routineNameInput, setRoutineNameInput] = useState('');
  const [isSavingAsNew, setIsSavingAsNew] = useState(false);
  const [routineToRenameId, setRoutineToRenameId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('flow');

  // Persist routines to localStorage
  useEffect(() => {
    localStorage.setItem('rhythmflow_routines', JSON.stringify(routines));
  }, [routines]);

  const synthRef = useRef<Tone.Synth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const bpmIntervalRef = useRef<number | null>(null);
  const currentBpmRef = useRef<number>(bpm);
  const startingBpmRef = useRef<number>(bpm);
  const measureCountRef = useRef<number>(0); // Track measures across loop cycles

  // Sync ref with state
  useEffect(() => {
    currentBpmRef.current = bpm;
  }, [bpm]);

  // Initialize Synth once
  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      },
      volume: 6 // Increase base volume by 6dB
    }).toDestination();

    return () => {
      synthRef.current?.dispose();
    };
  }, []);

  // Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Only trigger if not typing in an input
        if (document.activeElement?.tagName === 'INPUT') return;
        
        e.preventDefault();
        if (isPlaying) {
          stopMetronome();
        } else {
          startMetronome();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, sequence, bpm, bpmGrowth, loopFlow, flowDurationType, flowDurationValue]);

  // Global Cleanup
  useEffect(() => {
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      partRef.current?.dispose();
      if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current);
    };
  }, []);

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Persist Routines
  useEffect(() => {
    localStorage.setItem('rhythmflow_routines', JSON.stringify(routines));
  }, [routines]);

  const handleBpmSubmit = () => {
    const newBpm = parseInt(tempBpm);
    if (!isNaN(newBpm) && newBpm >= 20 && newBpm <= 320) {
      setBpm(newBpm);
      currentBpmRef.current = newBpm;
      if (isPlaying) {
        Tone.Transport.bpm.value = newBpm;
      }
    } else {
      setTempBpm(bpm?.toString() || '120');
    }
    setIsEditingBpm(false);
  };

  const handleTap = () => {
    const now = performance.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);
    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 20 && newBpm <= 320) {
        setBpm(newBpm);
        setTempBpm(newBpm.toString());
      }
    }
  };

  const playClick = useCallback((time: number, isAccent: boolean) => {
    if (!synthRef.current) return;
    const playTime = typeof time === 'number' && !isNaN(time) ? time : Tone.now();
    try {
      const frequency = isAccent ? 880 : 440; 
      const velocity = isAccent ? 1.0 : 0.7; // Increased from 0.6 to 0.7
      synthRef.current.triggerAttackRelease(frequency, '32n', playTime, velocity);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }, []);

  const startMetronome = async () => {
    try {
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }

      if (isPlaying) {
        stopMetronome();
        return;
      }

      setIsPlaying(true);
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.bpm.value = bpm;
      currentBpmRef.current = bpm;
      if (bpmGrowth.enabled) {
        startingBpmRef.current = bpm;
      }
      partRef.current?.dispose();
      if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current);
      measureCountRef.current = 0;

      // BPM Growth Logic (Time-based)
      if (bpmGrowth.enabled && bpmGrowth.unit === 'time') {
        bpmIntervalRef.current = window.setInterval(() => {
          currentBpmRef.current += (bpmGrowth.amount || 0);
          if (!isNaN(currentBpmRef.current) && isFinite(currentBpmRef.current)) {
            Tone.Transport.bpm.rampTo(currentBpmRef.current, 1);
            setBpm(Math.round(currentBpmRef.current));
          }
        }, (bpmGrowth.every || 1) * 60000);
      }

      const events: any[] = [];
      let accumulatedTicks = 0;

      sequence.forEach((step, idx) => {
        const [num, den] = step.timeSignature.split('/').map(Number);
        const beatsPerMeasure = num || 4;
        
        // Use ticks for absolute precision regardless of BPM changes
        const subdivisionTicks = Tone.Time(step.subdivision).toTicks();
        const beatTicks = Tone.Time(`${den}n`).toTicks();
        const measureTicks = beatsPerMeasure * beatTicks;
        
        // Resolution is the finest of either beat or subdivision
        const resolutionTicks = Math.min(subdivisionTicks, beatTicks);
        
        let stepMeasures = step.measures;
        if (sequence.length === 1 && step.durationType === 'time') {
          const totalSeconds = step.measures * 60;
          const secondsPerMeasure = (beatsPerMeasure * (den === 8 ? 0.5 : 1)) * (60 / currentBpmRef.current);
          stepMeasures = Math.ceil(totalSeconds / secondsPerMeasure);
        } else if (sequence.length === 1 && step.durationType === 'loop') {
          stepMeasures = 1; 
        }

        const totalTicksInStep = stepMeasures * measureTicks;
        const numEvents = Math.round(totalTicksInStep / resolutionTicks);

        for (let i = 0; i < numEvents; i++) {
          const currentTickInStep = i * resolutionTicks;
          const isMainBeat = currentTickInStep % beatTicks === 0;
          const isSubdivisionBeat = currentTickInStep % subdivisionTicks === 0;
          const isSubdivisionLong = subdivisionTicks >= beatTicks; // 1n, 2n

          if (isSubdivisionLong ? isSubdivisionBeat : (isMainBeat || isSubdivisionBeat)) {
            // Use absolute tick for correct visual positioning
            const absoluteTick = accumulatedTicks + currentTickInStep;
            const tickInMeasure = absoluteTick % measureTicks;
            const beatNumber = Math.floor(tickInMeasure / beatTicks) + 1;
            const isAccent = isMainBeat && beatNumber === 1;
            const measureInStep = Math.floor(tickInMeasure / measureTicks) + 1;
            const beatFractional = tickInMeasure / beatTicks + 1;
            const remainder = (tickInMeasure % beatTicks) / beatTicks;
            const remainderType = classifyRemainder(remainder);

            events.push({
              time: absoluteTick + "i",
              isAccent,
              isMainBeat,
              isSoundBeat: isMainBeat || isSubdivisionBeat,
              stepIdx: idx,
              measure: measureInStep,
              beat: beatNumber,
              beatFractional,
              remainder,
              remainderType,
              subdivision: step.subdivision
            });
          }
        }
        accumulatedTicks += totalTicksInStep;
      });

      partRef.current = new Tone.Part((time, event) => {
        // Play sound only on subdivision beats
        if (event.isSoundBeat) {
          playClick(time, event.isAccent);
        }

        // Update UI on every SOUND beat (for ghost marker support)
        Tone.Draw.schedule(() => {
          const isWholeBeat = event.remainderType === 'whole';
          const mainBeat = Math.floor(event.beatFractional);
          
          setCurrentStepIdx(event.stepIdx);
          setCurrentMeasure(event.measure);
          setCurrentBeat(mainBeat);
          setVisualBeat(mainBeat - 1);
          
          if (!isWholeBeat) {
            setGhostBeat(event.beatFractional);
            setGhostType(event.remainderType);
          } else {
            setGhostBeat(null);
            setGhostType(null);
          }
        }, time);

        // BPM Growth on measure completion (every N measures means change at measure N+1)
        if (event.isMainBeat && event.beat === 1) {
          measureCountRef.current++;
          const every = bpmGrowth.every || 4;
          if (bpmGrowth.enabled && bpmGrowth.unit === 'measures' && measureCountRef.current > every && measureCountRef.current % every === 1) {
            currentBpmRef.current += (bpmGrowth.amount || 0);
            if (!isNaN(currentBpmRef.current) && isFinite(currentBpmRef.current)) {
              Tone.Transport.bpm.rampTo(currentBpmRef.current, 0.1);
              Tone.Draw.schedule(() => setBpm(Math.round(currentBpmRef.current)), time);
            }
          }
        }
      }, events);

      partRef.current.loop = flowDurationType === 'loop' || (flowDurationType === 'measures' && loopFlow) || (flowDurationType === 'time' && loopFlow);
      partRef.current.loopEnd = accumulatedTicks + "i";
      partRef.current.start(0);

      // Handle "Measures" duration type
      if (flowDurationType === 'measures' && !loopFlow) {
        const totalTicks = flowDurationValue * (Tone.Time('1m').toTicks());
        Tone.Transport.schedule((t) => {
          Tone.Draw.schedule(() => stopMetronome(), t);
        }, totalTicks + "i");
      }

      // Handle "Time" duration type
      if (flowDurationType === 'time') {
        Tone.Transport.schedule((t) => {
          Tone.Draw.schedule(() => stopMetronome(), t);
        }, flowDurationValue * 60);
      }

      Tone.Transport.start();
    } catch (error) {
      console.error('Failed to start metronome:', error);
      setIsPlaying(false);
    }
  };

  const stopMetronome = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    partRef.current?.dispose();
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current);
    
    // Reset BPM to starting value if growth was enabled
    if (bpmGrowth.enabled) {
      const resetBpm = startingBpmRef.current;
      setBpm(resetBpm);
      setTempBpm(resetBpm.toString());
      currentBpmRef.current = resetBpm;
      Tone.Transport.bpm.value = resetBpm;
    }
    measureCountRef.current = 0;
    
    setIsPlaying(false);
    setCurrentStepIdx(0);
    setCurrentMeasure(0);
    setCurrentBeat(0);
    setGhostBeat(null);
    setGhostType(null);
  };

  const clearFlow = () => {
    setIsClearModalOpen(true);
  };

  const confirmClearFlow = () => {
    setSequence([{ id: '1', measures: 4, subdivision: '4n', timeSignature: '4/4', label: 'New Phase', durationType: 'measures' }]);
    setActiveRoutineId(null);
    setIsClearModalOpen(false);
  };

  const saveRoutine = (asNew: boolean = false) => {
    setIsSavingAsNew(asNew);
    setRoutineToRenameId(null);
    const defaultName = asNew || !activeRoutineId 
      ? `Routine ${routines.length + 1}` 
      : routines.find(r => r.id === activeRoutineId)?.name || `Routine ${routines.length + 1}`;
    setRoutineNameInput(defaultName);
    setIsSaveModalOpen(true);
  };

  const openRenameModal = (routine: Routine) => {
    setRoutineToRenameId(routine.id);
    setRoutineNameInput(routine.name);
    setIsSavingAsNew(false);
    setIsSaveModalOpen(true);
  };

  const confirmSave = () => {
    if (!routineNameInput.trim()) return;

    if (routineToRenameId) {
      setRoutines(prev => prev.map(r => r.id === routineToRenameId ? { ...r, name: routineNameInput } : r));
      setRoutineToRenameId(null);
    } else {
      const newId = (isSavingAsNew || !activeRoutineId) ? Math.random().toString(36).substr(2, 9) : activeRoutineId;
      const newRoutine: Routine = {
        id: newId,
        name: routineNameInput,
        sequence: JSON.parse(JSON.stringify(sequence)), // Deep copy to avoid reference issues
        bpm,
        bpmGrowth: { ...bpmGrowth },
        loopFlow,
        flowDurationType,
        flowDurationValue
      };

      if (!isSavingAsNew && activeRoutineId) {
        setRoutines(prev => prev.map(r => r.id === activeRoutineId ? newRoutine : r));
      } else {
        setRoutines(prev => [...prev, newRoutine]);
        setActiveRoutineId(newRoutine.id);
      }
    }
    
    setIsSaveModalOpen(false);
  };

  const loadRoutine = (routine: Routine) => {
    setSequence(routine.sequence || []);
    setBpm(routine.bpm || 120);
    setBpmGrowth(routine.bpmGrowth || { enabled: false, amount: 5, every: 4, unit: 'measures' });
    setLoopFlow(routine.loopFlow ?? true);
    setFlowDurationType(routine.flowDurationType || 'loop');
    setFlowDurationValue(routine.flowDurationValue || 1);
    setActiveRoutineId(routine.id);
    setActiveTab('flow');
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter(r => r.id !== id));
    if (activeRoutineId === id) setActiveRoutineId(null);
  };

  const renameRoutine = (id: string, newName: string) => {
    setRoutines(routines.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  const addStep = () => {
    const lastStep = sequence[sequence.length - 1];
    const newStep: SequenceStep = {
      id: Math.random().toString(36).substr(2, 9),
      measures: 1,
      durationType: 'measures',
      subdivision: lastStep?.subdivision || '4n',
      timeSignature: lastStep?.timeSignature || '4/4',
      label: `Step ${sequence.length + 1}`
    };
    setSequence([...sequence, newStep]);
  };

  const removeStep = (id: string) => {
    if (sequence.length > 1) {
      setSequence(sequence.filter(s => s.id !== id));
    }
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    setSequence(sequence.map(s => {
      if (s.id === id) {
        const newStep = { ...s, ...updates };
        // Auto-adjust subdivision if time signature denominator changes
        if (updates.timeSignature) {
          const [_, newDen] = updates.timeSignature.split('/').map(Number);
          const [__, oldDen] = s.timeSignature.split('/').map(Number);
          if (newDen !== oldDen) {
            if (newDen === 8 && s.subdivision === '4n') {
              newStep.subdivision = '8n';
            } else if (newDen === 4 && s.subdivision === '8n') {
              newStep.subdivision = '4n';
            }
          }
        }
        return newStep;
      }
      return s;
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSequence = [...sequence];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < sequence.length) {
      [newSequence[index], newSequence[targetIndex]] = [newSequence[targetIndex], newSequence[index]];
      setSequence(newSequence);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute inset-0 knurled-bg opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/60 font-bold">Precision Engine Active</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsManualOpen(true)}
                className="w-6 h-6 rounded-full hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors ml-2"
                title="Manuale d'uso"
              >
                <HelpCircle size={14} />
              </Button>
            </div>
            <h1 className="text-6xl font-black tracking-tight font-heading text-white">
              RHYTHM<span className="text-primary">FLOW</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium max-w-md border-l-2 border-primary/20 pl-4 py-1">
              Advanced rhythmic sequencing for professional musicians and precision practice.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6 bg-card/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col items-end gap-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold block">Master Tempo</Label>
                  <div className="flex items-center gap-4 min-w-[220px] justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleTap}
                      className="h-10 px-4 text-[11px] font-black bg-white/5 border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all rounded-xl shadow-lg active:scale-95 shrink-0"
                    >
                      TAP
                    </Button>
                    <div className="w-28 flex justify-end">
                      {isEditingBpm ? (
                        <Input
                          autoFocus
                          value={tempBpm ?? ""}
                          onChange={(e) => setTempBpm(e.target.value)}
                          onBlur={handleBpmSubmit}
                          onKeyDown={(e) => e.key === 'Enter' && handleBpmSubmit()}
                          className="w-full h-10 bg-background border-primary/20 text-white font-mono text-2xl text-center focus-visible:ring-primary/50"
                        />
                      ) : (
                        <div 
                          className="text-4xl font-mono font-bold text-white leading-none cursor-pointer hover:text-primary transition-all group flex items-baseline gap-1"
                          onClick={() => {
                            setTempBpm(bpm?.toString() || '120');
                            setIsEditingBpm(true);
                          }}
                        >
                          <span className="group-hover:scale-110 transition-transform inline-block">{bpm || 120}</span>
                          <span className="text-xs font-bold text-muted-foreground tracking-widest">BPM</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              <Separator orientation="vertical" className="h-12 bg-white/10" />
              <div className="w-full sm:w-56 space-y-3 relative z-50 pointer-events-auto">
                <Slider 
                  value={[bpm || 120]} 
                  onValueChange={(v) => {
                    const newBpm = Array.isArray(v) ? v[0] : v;
                    if (typeof newBpm === 'number' && !isNaN(newBpm)) {
                      setBpm(newBpm);
                      setTempBpm(newBpm.toString());
                      currentBpmRef.current = newBpm;
                      Tone.Transport.bpm.value = newBpm;
                    }
                  }} 
                  min={20} 
                  max={320} 
                  step={1}
                  className="py-4 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-muted-foreground font-bold uppercase tracking-tighter">
                  <span>Grave</span>
                  <span>Largo</span>
                  <span>Andante</span>
                  <span>Presto</span>
                </div>
              </div>
            </div>

            {/* BPM Growth Quick Settings */}
            <div className="flex items-center gap-4 bg-card/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={bpmGrowth.enabled} 
                  onCheckedChange={(v) => setBpmGrowth({ ...bpmGrowth, enabled: v })} 
                />
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Growth</Label>
              </div>
              {bpmGrowth.enabled && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                  <TrendingUp size={14} className="text-primary" />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-white">+{bpmGrowth.amount}</span>
                    <span className="text-[10px] text-muted-foreground">every</span>
                    <span className="text-[10px] font-mono text-white">{bpmGrowth.every}</span>
                    <span className="text-[10px] text-muted-foreground">{bpmGrowth.unit}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Visualizer & Controls */}
          <div className="lg:col-span-5 space-y-10">
            <Card className="bg-card/40 border-white/5 backdrop-blur-2xl overflow-hidden shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
              <CardContent className="p-10 relative z-10">
                <div className="relative aspect-square flex items-center justify-center">
                  {/* Hardware Details */}
                  <div className="absolute inset-0 border-4 border-white/5 rounded-full shadow-inner" />
                  <div className="absolute inset-8 border border-white/10 rounded-full border-dashed opacity-50" />
                  
                  {/* Beat Indicators */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Outer Ring - Subdivisions */}
                    <div className="absolute inset-0 border border-white/5 rounded-full" />
                    {Array.from({ length: 16 }).map((_, i) => (
                      <motion.div
                        key={`sub-${i}`}
                        className={cn(
                          "absolute w-1 h-1 rounded-full transition-all duration-150",
                          isPlaying && (visualBeat % 4) === (i % 4)
                            ? "bg-primary/40"
                            : "bg-white/5"
                        )}
                        style={{
                          transform: `rotate(${i * (360 / 16)}deg) translateY(-160px)`
                        }}
                      />
                    ))}

                    {/* Ghost Marker Ring - for between-beat events */}
                    {ghostBeat !== null && (
                      <motion.div
                        key={`ghost-${ghostBeat}-${ghostType}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute"
                        style={{
                          transform: `rotate(${((ghostBeat - 1) + (ghostBeat % 1)) * (360 / (parseInt(sequence[currentStepIdx]?.timeSignature.split('/')[0]) || 4))}deg) translateY(-150px)`,
                        }}
                      >
                        {ghostType === 'fixed' && (
                          <div className="w-4 h-4 rounded-full bg-primary/50 shadow-[0_0_12px_rgba(var(--primary),0.4)] border border-primary/30" />
                        )}
                        {ghostType === 'sliding' && (
                          <div className="w-3 h-3 rounded-full bg-primary/30 shadow-[0_0_8px_rgba(var(--primary),0.2)] border border-primary/20" />
                        )}
                      </motion.div>
                    )}

                    {/* Main Beat Indicators */}
                    {Array.from({ length: sequence[currentStepIdx]?.timeSignature.split('/')[0] ? parseInt(sequence[currentStepIdx]?.timeSignature.split('/')[0]) : 4 }).map((_, i, arr) => {
                      const numBeats = arr.length;
                      // Calculate angle based on number of beats
                      const angle = i * (360 / numBeats);
                      const isActive = currentBeat === i + 1;
                      
                      return (
                        <motion.div
                          key={i}
                          className={cn(
                            "absolute rounded-full transition-all duration-300",
                            isActive 
                              ? "w-4 h-4 bg-primary shadow-[0_0_25px_rgba(var(--primary),0.8)] scale-125" 
                              : "w-4 h-4 bg-white/5 border border-white/10"
                          )}
                          style={{
                            transform: `rotate(${angle}deg) translateY(-140px)`,
                          }}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="glow"
                              className="absolute inset-[-8px] bg-primary/20 blur-md rounded-full"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Center Display - Hardware Style */}
                  <div className="text-center glass-panel p-10 rounded-full w-48 h-48 flex flex-col items-center justify-center shadow-2xl border-white/10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStepIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-primary font-mono text-[10px] uppercase tracking-[0.4em] mb-3 font-bold"
                      >
                        {sequence[currentStepIdx]?.label || 'STANDBY'}
                      </motion.div>
                    </AnimatePresence>
                    <div className="text-9xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      {currentBeat || '0'}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Badge variant="outline" className="bg-black/40 border-white/10 text-muted-foreground font-mono text-[10px] px-2 py-0">
                        M:{currentMeasure || '0'}
                      </Badge>
                      <Badge variant="outline" className="bg-black/40 border-white/10 text-primary font-mono text-[10px] px-2 py-0">
                        {sequence[currentStepIdx]?.timeSignature || '4/4'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-16">
                  <Button 
                    size="lg" 
                    className={cn(
                      "w-full h-24 rounded-3xl text-2xl font-black tracking-tighter transition-all duration-500 group relative overflow-hidden",
                      isPlaying 
                        ? "bg-white text-black hover:bg-zinc-200" 
                        : "bg-primary text-black hover:bg-primary/90 shadow-[0_0_40px_rgba(var(--primary),0.3)]"
                    )}
                    onClick={startMetronome}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50" />
                    <div className="relative z-10 flex items-center justify-center gap-4">
                      {isPlaying ? (
                        <><Square className="w-8 h-8 fill-current" /> STOP SESSION</>
                      ) : (
                        <><Play className="w-8 h-8 fill-current" /> START SESSION</>
                      )}
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl flex flex-col justify-between h-32">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={16} className="text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Total Duration</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white flex items-baseline gap-1">
                  {sequence.reduce((acc, s) => acc + s.measures, 0)}
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Measures</span>
                </div>
              </div>
              <div className="bg-card/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl flex flex-col justify-between h-32">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers size={16} className="text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Complexity</span>
                </div>
                <div className="text-3xl font-mono font-bold text-white flex items-baseline gap-1">
                  {sequence.length}
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Phases</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sequence Editor & Routines */}
          <div className="lg:col-span-7">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="bg-card/40 border border-white/5 backdrop-blur-xl p-1 rounded-2xl mb-6 grid grid-cols-3 w-full sm:w-fit">
                <TabsTrigger value="flow" className="rounded-xl px-2 sm:px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-black font-bold transition-all text-[10px] sm:text-xs">
                  <Activity size={14} className="mr-1 sm:mr-2" /> FLOW
                </TabsTrigger>
                <TabsTrigger value="routines" className="rounded-xl px-2 sm:px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-black font-bold transition-all text-[10px] sm:text-xs">
                  <History size={14} className="mr-1 sm:mr-2" /> ROUTINES
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl px-2 sm:px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-black font-bold transition-all text-[10px] sm:text-xs">
                  <Settings2 size={14} className="mr-1 sm:mr-2" /> ENGINE
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flow" className="flex-1 mt-0">
                <Card className="bg-card/40 border-white/5 backdrop-blur-2xl h-full flex flex-col shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Activity size={120} className="text-primary" />
                  </div>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 p-6 sm:p-8 gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Activity className="text-primary" size={18} />
                        </div>
                        RHYTHMIC FLOW
                      </CardTitle>
                      <CardDescription className="text-muted-foreground font-medium">
                        Configure your session timeline and rhythmic variations.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFlow}
                        className="bg-white/5 border-white/10 text-white hover:bg-destructive hover:text-white rounded-xl px-3 sm:px-4 py-5 font-bold tracking-wide text-[10px] sm:text-xs"
                      >
                        <Trash2 size={16} className="mr-1 sm:mr-2" /> CLEAR
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => saveRoutine(false)}
                        className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-black rounded-xl px-3 sm:px-4 py-5 font-bold tracking-wide text-[10px] sm:text-xs"
                      >
                        <Save size={16} className="mr-1 sm:mr-2" /> {activeRoutineId ? 'UPDATE' : 'SAVE'}
                      </Button>
                      {activeRoutineId && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => saveRoutine(true)}
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3 sm:px-4 py-5 font-bold tracking-wide text-[10px] sm:text-xs"
                        >
                          SAVE AS NEW
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={addStep}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-3 sm:px-4 py-5 font-bold tracking-wide text-[10px] sm:text-xs"
                      >
                        <Plus size={16} className="mr-1 sm:mr-2" /> PHASE
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[640px] px-8">
                      <div className="py-8 space-y-6">
                        <AnimatePresence initial={false}>
                          {sequence.map((step, index) => (
                            <motion.div
                              key={step.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "group relative bg-black/40 border border-white/5 rounded-[2rem] p-6 transition-all duration-500",
                                currentStepIdx === index && isPlaying 
                                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
                                  : "hover:border-white/10 hover:bg-white/[0.02]"
                              )}
                            >
                              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                                <div className="flex-1 space-y-6">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-mono font-black text-primary border border-white/10 shadow-inner">
                                        {String(index + 1).padStart(2, '0')}
                                      </div>
                                      <Input 
                                        value={step.label ?? ""}
                                        onChange={(e) => updateStep(step.id, { label: e.target.value })}
                                        className="bg-transparent border-none text-xl font-black p-0 h-auto focus-visible:ring-0 text-white placeholder:text-white/10 tracking-tight w-full sm:w-48"
                                        placeholder="PHASE NAME"
                                      />
                                    </div>
                                    
                                    {sequence.length === 1 && (
                                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
                                        {(['measures', 'time', 'loop'] as DurationType[]).map((type) => (
                                          <Button
                                            key={type}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => updateStep(step.id, { durationType: type })}
                                            className={cn(
                                              "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                              step.durationType === type ? "bg-primary text-black" : "text-muted-foreground hover:text-white"
                                            )}
                                          >
                                            {type}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="space-y-3">
                                      <Label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black">
                                        {step.durationType === 'time' ? 'Minutes' : 'Measures'}
                                      </Label>
                                      <div className="relative">
                                        <Input 
                                          type="number"
                                          min={1}
                                          max={step.durationType === 'time' ? 20 : 999}
                                          value={step.measures ?? 1}
                                          onChange={(e) => updateStep(step.id, { measures: parseInt(e.target.value) || 1 })}
                                          className="bg-white/5 border-white/5 text-white font-mono text-center h-12 rounded-xl focus-visible:ring-primary/30"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <Label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black">Signature</Label>
                                      <Select 
                                        value={step.timeSignature ?? "4/4"} 
                                        onValueChange={(v) => updateStep(step.id, { timeSignature: v })}
                                      >
                                        <SelectTrigger className="bg-white/5 border-white/5 text-white h-12 rounded-xl focus:ring-primary/30">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                                          <SelectItem value="2/4">2 / 4</SelectItem>
                                          <SelectItem value="3/4">3 / 4</SelectItem>
                                          <SelectItem value="4/4">4 / 4</SelectItem>
                                          <SelectItem value="5/4">5 / 4</SelectItem>
                                          <SelectItem value="6/8">6 / 8</SelectItem>
                                          <SelectItem value="7/8">7 / 8</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-3">
                                      <Label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-black">Rhythm</Label>
                                      <Select 
                                        value={step.subdivision} 
                                        onValueChange={(v: Subdivision) => updateStep(step.id, { subdivision: v })}
                                      >
                                        <SelectTrigger className="bg-white/5 border-white/5 text-white h-12 rounded-xl focus:ring-primary/30">
                                          <div className="flex items-center gap-2">
                                            {SUBDIVISIONS.find(s => s.value === step.subdivision)?.icon}
                                            <span>{SUBDIVISIONS.find(s => s.value === step.subdivision)?.label}</span>
                                          </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                                          {SUBDIVISIONS.map(s => (
                                            <SelectItem key={s.value} value={s.value}>
                                              <div className="flex items-center gap-2">
                                                {s.icon}
                                                <span>{s.label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex md:flex-col items-center justify-center gap-3">
                                  <div className="flex md:flex-col gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => moveStep(index, 'up')}
                                      disabled={index === 0}
                                      className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-white/5 rounded-xl transition-all"
                                    >
                                      <ChevronUp size={20} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => moveStep(index, 'down')}
                                      disabled={index === sequence.length - 1}
                                      className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-white/5 rounded-xl transition-all"
                                    >
                                      <ChevronDown size={20} />
                                    </Button>
                                  </div>
                                  <Separator orientation="vertical" className="h-10 md:w-10 md:h-[1px] bg-white/5" />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeStep(step.id)}
                                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                  >
                                    <Trash2 size={20} />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Progress Bar for active step */}
                              {currentStepIdx === index && isPlaying && (
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 rounded-b-[2rem] overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(currentMeasure / step.measures) * 100}%` }}
                                    transition={{ duration: 0.1 }}
                                  />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="routines" className="flex-1 mt-0">
                <Card className="bg-card/40 border-white/5 backdrop-blur-2xl h-full flex flex-col shadow-2xl overflow-hidden">
                  <CardHeader className="border-b border-white/5 p-8">
                    <CardTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                      <History className="text-primary" size={24} /> SAVED ROUTINES
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                      Recall and manage your custom practice sessions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[640px] px-8">
                      <div className="py-8 grid grid-cols-1 gap-4">
                        {routines.length === 0 ? (
                          <div className="text-center py-20 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                              <History className="text-muted-foreground/20" size={32} />
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">No routines saved yet.</p>
                          </div>
                        ) : (
                          routines.map((routine) => (
                            <div 
                              key={routine.id}
                              className={cn(
                                "group bg-black/40 border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-primary/30 transition-all duration-300",
                                activeRoutineId === routine.id && "border-primary/50 bg-primary/5"
                              )}
                            >
                              <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                  <Music className="text-primary" size={20} />
                                </div>
                                <div>
                                  <h3 className="text-lg font-black text-white tracking-tight">{routine.name}</h3>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{routine.bpm} BPM</span>
                                    <span className="text-[10px] text-white/20">•</span>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{routine.sequence.length} Phases</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => loadRoutine(routine)}
                                  className="bg-primary/10 text-primary hover:bg-primary hover:text-black rounded-xl font-bold"
                                >
                                  LOAD
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => openRenameModal(routine)}
                                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                                  title="Rename"
                                >
                                  <Edit3 size={18} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    const duplicated = { ...routine, id: Math.random().toString(36).substr(2, 9), name: `${routine.name} (Copy)` };
                                    setRoutines([...routines, duplicated]);
                                  }}
                                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                                  title="Duplicate"
                                >
                                  <Copy size={18} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deleteRoutine(routine.id)}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 mt-0">
                <Card className="bg-card/40 border-white/5 backdrop-blur-2xl h-full flex flex-col shadow-2xl overflow-hidden">
                  <CardHeader className="border-b border-white/5 p-8">
                    <CardTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                      <Settings2 className="text-primary" size={24} /> ENGINE SETTINGS
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                      Configure global behaviors and advanced automation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    {/* BPM Growth Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary" /> BPM GROWTH
                          </h4>
                          <p className="text-xs text-muted-foreground">Automatically increase tempo over time.</p>
                        </div>
                        <div className="flex items-center gap-4">
                          {bpmGrowth.enabled && (
                            <Select 
                              value={bpmGrowth.unit ?? "measures"} 
                              onValueChange={(v: 'measures' | 'time') => setBpmGrowth({ ...bpmGrowth, unit: v })}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-primary font-bold text-[10px] h-9 px-3 rounded-xl focus:ring-0 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                                <SelectItem value="measures">Measures</SelectItem>
                                <SelectItem value="time">Minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Switch 
                            checked={bpmGrowth.enabled} 
                            onCheckedChange={(v) => setBpmGrowth({ ...bpmGrowth, enabled: v })} 
                          />
                        </div>
                      </div>
                      
                      {bpmGrowth.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-top-4">
                          <div className="space-y-3">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Increase By</Label>
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                              <Input 
                                type="number" 
                                value={bpmGrowth.amount ?? 1} 
                                onChange={(e) => setBpmGrowth({ ...bpmGrowth, amount: parseInt(e.target.value) || 1 })}
                                className="bg-transparent border-none text-center font-mono text-white p-0 h-auto focus-visible:ring-0 flex-1"
                              />
                              <span className="text-[10px] font-bold text-primary">BPM</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Every</Label>
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                              <Input 
                                type="number" 
                                value={bpmGrowth.every ?? 1} 
                                onChange={(e) => setBpmGrowth({ ...bpmGrowth, every: parseInt(e.target.value) || 1 })}
                                className="bg-transparent border-none text-center font-mono text-white p-0 h-auto focus-visible:ring-0 flex-1"
                              />
                              <div className="text-[10px] font-bold text-primary uppercase pr-2">
                                {bpmGrowth.unit === 'time' ? 'Min' : 'Meas'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Flow Duration Section */}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <Timer size={18} className="text-primary" /> FLOW DURATION
                        </h4>
                        <p className="text-xs text-muted-foreground">Define when the entire flow should stop or loop.</p>
                      </div>

                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 w-fit">
                          {(['measures', 'time', 'loop'] as DurationType[]).map((type) => (
                            <Button
                              key={type}
                              variant="ghost"
                              size="sm"
                              onClick={() => setFlowDurationType(type)}
                              className={cn(
                                "h-10 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                flowDurationType === type ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:text-white"
                              )}
                            >
                              {type === 'loop' ? 'Infinite Loop' : type}
                            </Button>
                          ))}
                        </div>

                        {flowDurationType !== 'loop' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-3">
                              <Label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                                {flowDurationType === 'time' ? 'Duration (Minutes)' : 'Duration (Measures)'}
                              </Label>
                              <div className="flex items-center gap-4 pointer-events-auto">
                                 <input
                                   type="range"
                                   value={flowDurationValue ?? 1}
                                   onChange={(e) => setFlowDurationValue(parseInt(e.target.value))}
                                   min={1}
                                   max={flowDurationType === 'time' ? 60 : 500}
                                   step={1}
                                   style={{
                                     background: `linear-gradient(to right, oklch(0.75 0.15 65) ${((flowDurationValue - 1) / ((flowDurationType === 'time' ? 60 : 500) - 1)) * 100}%, rgba(255,255,255,0.1) 0%)`
                                   }}
                                   className="flex-1 h-2 appearance-none rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(255,255,255,0.4)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:cursor-grab"
                                 />
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 min-w-[100px] justify-center">
                                  <Input
                                    type="number"
                                    value={flowDurationValue ?? 1}
                                    onChange={(e) => setFlowDurationValue(parseInt(e.target.value) || 1)}
                                    className="w-12 h-8 bg-transparent border-none text-center font-mono font-bold text-white p-0 focus-visible:ring-0"
                                  />
                                  <span className="text-[10px] text-primary font-bold uppercase">{flowDurationType === 'time' ? 'Min' : 'Meas'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20">
                              <div className="flex items-center gap-3">
                                <RotateCcw size={18} className="text-primary" />
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-bold text-white">LOOP FLOW</Label>
                                  <p className="text-[10px] text-muted-foreground">Restart automatically after {flowDurationValue} {flowDurationType}.</p>
                                </div>
                              </div>
                              <Switch 
                                checked={loopFlow} 
                                onCheckedChange={setLoopFlow} 
                              />
                            </div>
                          </div>
                        )}
                        
                        {flowDurationType === 'loop' && (
                          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 flex items-center gap-4 animate-in fade-in zoom-in-95">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <InfinityIcon size={20} className="text-primary" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-white uppercase tracking-tight">Infinite Mode Active</p>
                              <p className="text-[10px] text-muted-foreground">The sequence will repeat indefinitely until manually stopped.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8 text-muted-foreground text-[10px] font-mono uppercase tracking-[0.3em] font-bold">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <span>Core Engine v1.2.0</span>
            </div>
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <span>Audio: Tone.js High-Precision</span>
            </div>
          </div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-black opacity-40">
            Engineered for Absolute Rhythm
          </div>
        </footer>

        {/* Save Routine Modal */}
        <AnimatePresence>
          {isSaveModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSaveModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <Save className="text-primary" size={24} />
                        {routineToRenameId ? 'RENAME ROUTINE' : (isSavingAsNew ? 'SAVE NEW ROUTINE' : 'SAVE CHANGES')}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {routineToRenameId ? 'Change the name of this routine.' : (isSavingAsNew ? 'Create a new practice routine.' : 'Update the current routine settings.')}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsSaveModalOpen(false)}
                      className="rounded-full hover:bg-white/5 text-muted-foreground"
                    >
                      <X size={20} />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">ROUTINE NAME</Label>
                      <Input 
                        value={routineNameInput}
                        onChange={(e) => setRoutineNameInput(e.target.value)}
                        placeholder="Enter routine name..."
                        className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-lg font-bold text-white focus-visible:ring-primary/30"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmSave();
                          if (e.key === 'Escape') setIsSaveModalOpen(false);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSaveModalOpen(false)}
                      className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-bold hover:bg-white/10"
                    >
                      CANCEL
                    </Button>
                    <Button 
                      onClick={confirmSave}
                      className="flex-1 h-14 rounded-2xl bg-primary text-black font-black hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                    >
                      CONFIRM
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Clear Flow Confirmation Modal */}
          {isClearModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsClearModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <RotateCcw className="text-destructive" size={24} />
                        CLEAR FLOW?
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        This will reset your current sequence. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsClearModalOpen(false)}
                      className="rounded-full hover:bg-white/5 text-muted-foreground"
                    >
                      <X size={20} />
                    </Button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsClearModalOpen(false)}
                      className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-bold hover:bg-white/10"
                    >
                      CANCEL
                    </Button>
                    <Button 
                      onClick={confirmClearFlow}
                      className="flex-1 h-14 rounded-2xl bg-destructive text-white font-black hover:bg-destructive/90 shadow-[0_0_20px_rgba(var(--destructive),0.3)]"
                    >
                      CLEAR ALL
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* User Manual Modal */}
          {isManualOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsManualOpen(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                      <HelpCircle className="text-primary" size={24} />
                      USER MANUAL
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      Quick guide to mastering RhythmFlow.
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsManualOpen(false)}
                    className="rounded-full hover:bg-white/5 text-muted-foreground"
                  >
                    <X size={20} />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                  <div className="space-y-10 pb-8">
                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <Activity size={14} /> 1. Core Concepts
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        RhythmFlow is not just a metronome, but a **rhythmic sequencer**. You can create a "Flow" composed of different phases (Steps), each with its own tempo and duration settings.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <Settings2 size={14} /> 2. Setting the Tempo (BPM)
                      </h4>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>Use the **Slider** at the top to quickly adjust the BPM.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>Click on the **BPM number** to enter a precise value via keyboard.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <Layers size={14} /> 3. Creating the Flow
                      </h4>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Add Step:** Click on "PHASE" to add a new part to your workout.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Configure:** For each step, you can choose the number of measures, time signature (e.g., 4/4, 3/4), and subdivision (e.g., eighths, triplets).</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Reorder:** Use the arrows to move steps or the trash icon to delete them.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <TrendingUp size={14} /> 4. BPM Growth (Auto-Increase)
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Activate "Growth" to automatically increase speed during the session. You can set how much to increase the BPM and every how many measures (or minutes) to do so. Ideal for practicing technical passages starting slowly.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <Save size={14} /> 5. Saving and Routines
                      </h4>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Save:** Click "SAVE" to store your current flow. A window will open to name the routine.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Recall:** In the "ROUTINES" tab, you'll find all your saved sessions. Click "LOAD" to load one.</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="text-white font-bold">•</span>
                          <span>**Persistence:** Routines are saved in your browser and will be available even if you close the page.</span>
                        </li>
                      </ul>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-primary font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <Music size={14} /> 6. Keyboard Shortcuts
                      </h4>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Start / Stop</span>
                          <Badge className="bg-primary text-black font-bold">SPACE</Badge>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-white/[0.02]">
                  <Button 
                    onClick={() => setIsManualOpen(false)}
                    className="w-full h-14 rounded-2xl bg-primary text-black font-black hover:bg-primary/90"
                  >
                    GOT IT, LET'S START!
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
