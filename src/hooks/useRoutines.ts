import { useState, useEffect } from 'react';
import { Routine, SequenceStep, BpmGrowth, DurationType } from '../types';

const STORAGE_KEY = 'rhythmflow_routines';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  }, [routines]);

  const saveRoutine = (
    name: string,
    data: {
      sequence: SequenceStep[];
      bpm: number;
      bpmGrowth: BpmGrowth;
      loopFlow: boolean;
      flowDurationType: DurationType;
      flowDurationValue: number;
    },
    opts: { asNew: boolean; existingId: string | null }
  ) => {
    const id = (opts.asNew || !opts.existingId)
      ? Math.random().toString(36).substr(2, 9)
      : opts.existingId;

    const newRoutine: Routine = {
      id,
      name,
      sequence: JSON.parse(JSON.stringify(data.sequence)),
      bpm: data.bpm,
      bpmGrowth: { ...data.bpmGrowth },
      loopFlow: data.loopFlow,
      flowDurationType: data.flowDurationType,
      flowDurationValue: data.flowDurationValue,
    };

    if (!opts.asNew && opts.existingId) {
      setRoutines(prev => prev.map(r => r.id === opts.existingId ? newRoutine : r));
    } else {
      setRoutines(prev => [...prev, newRoutine]);
      setActiveRoutineId(newRoutine.id);
    }
  };

  const renameRoutine = (id: string, name: string) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  };

  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
    if (activeRoutineId === id) setActiveRoutineId(null);
  };

  const duplicateRoutine = (routine: Routine) => {
    const copy: Routine = {
      ...routine,
      id: Math.random().toString(36).substr(2, 9),
      name: `${routine.name} (Copy)`,
    };
    setRoutines(prev => [...prev, copy]);
  };

  return {
    routines,
    activeRoutineId,
    setActiveRoutineId,
    saveRoutine,
    renameRoutine,
    deleteRoutine,
    duplicateRoutine,
  };
}
