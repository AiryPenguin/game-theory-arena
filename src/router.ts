import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  query: URLSearchParams;
}

const parse = (): Route => {
  const raw = globalThis.location?.hash.replace(/^#/, '') || '/';
  const [path, q = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(q) };
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

export const navigate = (to: string) => {
  window.location.hash = to;
};
