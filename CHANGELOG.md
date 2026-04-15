# Changelog - flow_fix

## Changes from main

### New Features
- Add Whole (1n) and Half (2n) note subdivisions with custom SVG icons
- Ghost beat markers for fractional beat visualization (remainderType)
- Remainder classification: whole | fixed | sliding

### Bug Fixes
- BPM growth reset on stop (returns to starting BPM via startingBpmRef)
- Fix tick-based scheduling for correct absolute beat positioning

### Improvements
- BPM range expanded: 20-320 (was 40-280)
- Project metadata: react-example → rhythmflow
