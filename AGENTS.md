# AGENTS.md — RhythmFlow

## Commands

```bash
npm run dev       # dev server on 0.0.0.0:3000
npm run build     # Vite production bundle → dist/
npm run preview   # serve dist/ locally
npm run clean     # rm -rf dist
npm run lint      # tsc --noEmit (type-check only — no ESLint exists)
```

There is **no test script** and no formatter script. `npm run lint` is TypeScript type-checking, not ESLint.

## Architecture

- Single-package app (not a monorepo). No backend.
- All application logic lives in **`src/App.tsx`** (~1545 lines) — no sub-components, no custom hook files.
- Shared types: `src/types.ts`
- Global styles + Tailwind theme: `src/index.css`
- shadcn/ui components are vendored into `src/components/ui/`
- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

## Key Quirks

### Tailwind v4 — no config file
Tailwind is v4. All theme customization uses `@theme` blocks inside `src/index.css`. **Do not create `tailwind.config.js`.**

### shadcn uses `@base-ui/react`, not Radix
The style is `base-nova`, which wraps `@base-ui/react` primitives. When referencing shadcn docs, use the base-ui variant. To add components: `npx shadcn add <component>`.

### Duplicate `lib/utils.ts`
`lib/utils.ts` at the repo root and `src/lib/utils.ts` are identical. Always import via `@/lib/utils` (resolves to `src/lib/utils.ts`).

### Unused installed packages
`express` and `@google/genai` are installed but not imported anywhere — AI Studio scaffold leftovers.

### `GEMINI_API_KEY` is a build-time define
Vite injects `process.env.GEMINI_API_KEY` into the client bundle via `define` in `vite.config.ts`. In Google AI Studio it is supplied via the Secrets panel. Locally, put it in `.env` (gitignored).

### HMR disable flag
Set `DISABLE_HMR=true` to suppress Vite HMR (used by AI Studio to prevent flicker during agent edits).

## State & Persistence

- All state is in React `useState` inside `App()`.
- Routines auto-save to `localStorage` key `rhythmflow_routines` on every state change.
- Audio engine: Tone.js (`Tone.Transport`, `Tone.Part`, `Tone.Synth`). Scheduling uses tick-based absolute positions for BPM-change correctness.

## Environment Variables

```dotenv
GEMINI_API_KEY=   # baked into client bundle at build time
APP_URL=          # Cloud Run URL (AI Studio injects this)
DISABLE_HMR=true  # optional: disables Vite HMR
```

`.env*` files (except `.env.example`) are gitignored.

## No CI, No Tests, No Hooks

- No GitHub Actions workflows.
- No test framework (no Vitest, Jest, Playwright).
- No pre-commit hooks, no Prettier config, no ESLint config.
- No `engines` field — use Node 18+.
