import { useCallback, useEffect, useReducer, useState } from 'react';
import type { GameDefinition } from '../core/types';
import { createLocalTransport, type Transport } from '../net/transport';

/** Runs a pure game definition; all actions go through the transport (local loopback in V1). */
export function useMatch<P, S, A>(def: GameDefinition<P, S, A>, params: P, seed: number, transport?: Transport<A>) {
  const [t] = useState<Transport<A>>(() => transport ?? createLocalTransport<A>());
  const [state, dispatch] = useReducer((s: S, a: A) => def.reduce(s, a), null, () => def.init(params, seed));
  useEffect(() => t.subscribe(dispatch), [t]);
  const send = useCallback((a: A) => t.send(a), [t]);
  return [state, send] as const;
}
