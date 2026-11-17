import { useEffect, useState } from 'react';

/**
 * Hash routing with plain names (#pd, #exam, …). Plain names work everywhere, including
 * embedded viewers that only pass `#name`. Extra parameters (e.g. which concept to practise)
 * are handed over in memory by `navigate`, never through the URL.
 */
export interface Route {
  path: string;
  query: URLSearchParams;
}

let nextQuery: URLSearchParams | null = null;

const currentPath = (): string => {
  // accepts legacy "#/exam?x=1" as well as "#exam"
  const name = (globalThis.location?.hash ?? '').replace(/^#\/?/, '').split('?')[0];
  return name && name !== 'start' ? `/${name}` : '/';
};

const parse = (): Route => {
  const query = nextQuery ?? new URLSearchParams();
  nextQuery = null;
  return { path: currentPath(), query };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** navigate('/exam?review=1') → #exam with an in-memory query. */
export function navigate(to: string): void {
  const [p, q = ''] = to.split('?');
  nextQuery = new URLSearchParams(q);
  const name = p.replace(/^\//, '') || 'start';
  if (currentPath() === (name === 'start' ? '/' : `/${name}`)) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = name;
}
