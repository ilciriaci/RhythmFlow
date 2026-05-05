# AGENTS.md - RhythmFlow

## Commands

- `npm run dev` - Start dev server on port 3000 (not default 5173)
- `npm run lint` - Typecheck only (`tsc --noEmit`), no ESLint configured
- `npm run build` - Production build to `dist/`
- No test framework configured

## Architecture

- Single React 19 SPA, not a monorepo
- Entry: `src/main.tsx` → `src/App.tsx` (main logic, ~88KB)
- Path alias: `@/` maps to `./src/` (see `tsconfig.json`)
- UI: shadcn/ui with `@base-ui/react` (not Radix)
- Components: `src/components/ui/` (shadcn structure)
- Styling: Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config` file)

## Environment

- Target: Google AI Studio deployment
- `GEMINI_API_KEY` required for AI features (AI Studio injects at runtime)
- `DISABLE_HMR=true` disables hot reload (set by AI Studio to prevent flickering)

## Priority: Time Precision

**Time scanning accuracy is the #1 priority.** This is a musical metronome—timing must be sample-accurate. Never compromise tick-based scheduling in `src/App.tsx` for UI convenience. Verify all changes against musical theory (beat = numerator/denominator correctly calculated, especially compound time 6/8, 9/8, 12/8).

## Key Features & Points of Stability

### 1. BPM Management
- **BPM Range:** 20-320 BPM
- **Reset on Stop:** Always resets to starting BPM (`startingBpmRef.current` saved at start, applied in `stopMetronome()`)
- **BPM Growth:**
  - By Measures: Sample-accurate via `measureCountRef` in Transport callback
  - By Time: Sample-accurate via `Tone.Transport.schedule()` (NOT `setInterval`)
  - Growth stops and resets on `stopMetronome()`

### 2. Time Signature Handling
- **Simple Time (4/4, 3/4, 2/4):** Beats = numerator, beat value = denominator note
- **Compound Time (6/8, 9/8, 12/8):** 
  - Beats = numerator ÷ 3 (6/8 = 2 beats, 9/8 = 3 beats)
  - 1 beat = dotted note = 3 × denominator note
  - Visual beats = effective beats (not total notes per measure)
  - `getEffectiveBeats()` in `src/App.tsx:84`
  - `beatTicks = baseBeatTicks * 3` (not * 1.5)

### 3. Audio-Visual Sync
- **Sample-Accurate:** Events scheduled with absolute ticks (`absoluteTick + "i"`)
- **UI Before Audio:** `Tone.Draw.schedule()` updates UI first, then audio plays
- **No CSS transitions** on beat indicators (`.duration-300` removed) for instant visual response

### 4. Volume Control
- Range: -20dB to +30dB (slider 0-50, offset -20)
- Updates synth via `useEffect` on `volume` state
- UI: Compact slider (`w-16`) in Master Tempo section

### 5. Routine Management
- Save/Load routines to/from localStorage (`rhythmflow_routines`)
- Routines store: sequence, BPM, BPM growth settings, loop settings

## Gotchas

- `start.sh` has stale path—do not use
- `install-node20.sh` is Debian-only, not for macOS
- Typechecking runs via `npm run lint` (misleading script name)
- HMR disabled when `DISABLE_HMR=true` (see `vite.config.ts:21`)
- Compound time: 6/8 = 2 beats (dotted quarter), not 6 beats
- Index title: "RhythmFlow - Precision Metronome" (not "My Google AI Studio App")
