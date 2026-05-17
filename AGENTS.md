# AGENTS.md - RhythmFlow

## Commands

- `npm run dev` - Start dev server on port 3000 (not default 5173)
- `npm run lint` - Typecheck only (`tsc --noEmit`), no ESLint configured
- `npm run build` - Production build to `dist/`
- No test framework configured

## Architecture

- Single React 19 SPA, not a monorepo
- Entry: `src/main.tsx` → `src/App.tsx` (UI + state coordination, ~700 lines)
- Audio logic: `src/hooks/useMetronome.ts` (Tone.js scheduling, BPM growth, start/stop)
- Routine persistence: `src/hooks/useRoutines.ts` (localStorage CRUD)
- Path alias: `@/` maps to `./src/` (see `tsconfig.json`)
- UI: shadcn/ui with `@base-ui/react` (not Radix)
- Components: `src/components/ui/` (shadcn structure)
- Styling: Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config` file)

## Environment

- Target: Google AI Studio deployment
- `DISABLE_HMR=true` disables hot reload (set by AI Studio to prevent flickering)

## Priority: Time Precision

**Time scanning accuracy is the #1 priority.** This is a musical metronome—timing must be sample-accurate. Never compromise tick-based scheduling in `src/hooks/useMetronome.ts` for UI convenience. Verify all changes against musical theory (beat = numerator/denominator correctly calculated, especially compound time 6/8, 9/8, 12/8).

## Key Features & Points of Stability

### 1. BPM Management
- **BPM Range:** 20-320 BPM
- **Reset on Stop:** Always resets to starting BPM (`startingBpmRef.current` saved at start, applied in `stop()` in `useMetronome.ts`)
- **BPM Growth:**
  - By Measures: Sample-accurate via `measureCountRef` in Transport callback
  - By Time: Sample-accurate via `Tone.Transport.schedule()` (NOT `setInterval`)
  - Growth stops and resets on `stop()`

### 2. Time Signature Handling
- **Simple Time (4/4, 3/4, 2/4):** Beats = numerator, beat value = denominator note
- **Compound Time (6/8, 9/8, 12/8):**
  - Beats = numerator ÷ 3 (6/8 = 2 beats, 9/8 = 3 beats)
  - 1 beat = dotted note = 3 × denominator note
  - Visual beats = effective beats (not total notes per measure)
  - `getEffectiveBeats()` in `src/hooks/useMetronome.ts`
  - `beatTicks = baseBeatTicks * 3` (not * 1.5)

### 3. Audio-Visual Sync
- **Sample-Accurate:** Events scheduled with absolute ticks (`absoluteTick + "i"`)
- **UI Before Audio:** `Tone.Draw.schedule()` updates UI first, then audio plays
- **No CSS transitions** on beat indicators (`.duration-300` removed) for instant visual response
- **Stale closure prevention:** All Tone.Part callbacks read state via `getOptions()` at call time, not at schedule time

### 4. Volume Control
- Range: -20dB to +30dB (slider 0-50, offset -20)
- Updates synth via `setVolume()` from `useMetronome` on `volume` state change
- UI: Full-width on mobile, compact (`w-16`) on sm+

### 5. Routine Management
- Save/Load routines to/from localStorage (`rhythmflow_routines`)
- Logic isolated in `src/hooks/useRoutines.ts`
- Routines store: sequence, BPM, BPM growth settings, loop settings

## Gotchas

- `npm run lint` runs typecheck, not ESLint (misleading script name)
- HMR disabled when `DISABLE_HMR=true` (see `vite.config.ts`)
- Compound time: 6/8 = 2 beats (dotted quarter), not 6 beats
- Index title: "RhythmFlow - Precision Metronome"
- Tone.Part callbacks capture options at schedule time — always use `getOptions()` inside callbacks to avoid stale closures
- Stop button toggles via `isPlaying ? stopMetronome() : startMetronome(false)` — never call `startMetronome` unconditionally on button click
- ScrollArea heights are `h-[420px] sm:h-[640px]` — do not revert to fixed `h-[640px]`
