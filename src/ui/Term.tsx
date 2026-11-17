import { useEffect, useRef, useState, type ReactNode } from 'react';
import { glossaryById } from '../learning/glossary';
import { RichText } from './RichText';

/** Glossary tooltip: hover on desktop, tap on mobile (bottom sheet on small screens). */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const entry = glossaryById(id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  if (!entry) return <>{children}</>;
  return (
    <span ref={ref} className="relative inline" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="cursor-help underline decoration-indigo-400 decoration-dotted underline-offset-4"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className="fixed inset-x-4 bottom-4 z-50 block rounded-xl bg-slate-900 p-3 text-left text-sm font-normal text-slate-100 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-1 sm:w-80 dark:bg-slate-700"
        >
          <span className="block font-semibold">
            {entry.term} <span className="font-normal italic text-slate-300">({entry.en})</span>
          </span>
          <span className="mt-1 block leading-snug">
            <RichText text={entry.text} />
          </span>
        </span>
      )}
    </span>
  );
}
