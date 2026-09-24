import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True only after hydration. Prefer this over a `useState` + `useEffect`
 * pair for the same purpose — setting state synchronously inside an effect
 * body trips the react-hooks/set-state-in-effect lint rule, and this
 * external-store form is the pattern React itself recommends for "has this
 * hydrated yet" checks.
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
