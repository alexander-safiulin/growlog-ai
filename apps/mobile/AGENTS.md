# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Panic-mode (tap spam)

Use `useSingleFlight` from `@/lib/use-single-flight` for async buttons (optional `lightTapIgnored` haptic on skip); NPK solve is debounced in `useMobileNutrientSolve` (200ms). Guest workspace writes use `schedulePersistWorkspace` (400ms debounce); explicit saves use `flushPersistWorkspace`. Serialize heavy `reload()` via coalescing in `useMobileNutrientWorkspace`.
