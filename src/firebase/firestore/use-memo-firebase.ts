
import { useMemo, useRef } from 'react';

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<T | null>(null);
  const depsRef = useRef<any[]>([]);

  const changed = deps.length !== depsRef.current.length || deps.some((dep, i) => dep !== depsRef.current[i]);

  if (changed) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref.current as T;
}
