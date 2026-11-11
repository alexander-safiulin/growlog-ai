# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Panic-mode (tap spam)

Use `useSingleFlight` from `@/lib/use-single-flight` for async buttons; NPK solve is debounced in `useMobileNutrientSolve` (200ms, same as web). Serialize heavy `reload()` via coalescing in `useMobileNutrientWorkspace`.
