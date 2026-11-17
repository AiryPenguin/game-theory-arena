/**
 * Action transport between players. V1 uses a synchronous local loopback (hot-seat).
 * V2 can provide e.g. a Supabase/WebRTC implementation with the same interface:
 * every client applies the same ordered action log to the same pure reducer.
 */
export interface Transport<A> {
  send(action: A): void;
  subscribe(listener: (action: A) => void): () => void;
}

export function createLocalTransport<A>(): Transport<A> {
  const listeners = new Set<(a: A) => void>();
  return {
    send: (a) => listeners.forEach((l) => l(a)),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
