import { useEffect, useState, type ReactNode } from 'react';
import { useArena } from '../state/ArenaContext';
import { Button } from './basics';
import { RichText } from './RichText';

const VERDICT = {
  ok: { icon: '✅', cls: 'bg-emerald-50 ring-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:ring-emerald-700 dark:text-emerald-100' },
  warn: { icon: '⚠️', cls: 'bg-amber-50 ring-amber-300 text-amber-900 dark:bg-amber-950/50 dark:ring-amber-700 dark:text-amber-100' },
  bad: { icon: '❌', cls: 'bg-rose-50 ring-rose-300 text-rose-900 dark:bg-rose-950/50 dark:ring-rose-700 dark:text-rose-100' },
  info: { icon: 'ℹ️', cls: 'bg-sky-50 ring-sky-300 text-sky-900 dark:bg-sky-950/50 dark:ring-sky-700 dark:text-sky-100' },
} as const;

/** Traffic-light verdict box. */
export function Verdict({ kind, headline, children }: { kind: keyof typeof VERDICT; headline: string; children?: ReactNode }) {
  const v = VERDICT[kind];
  return (
    <div className={`rounded-2xl p-4 ring-1 ${v.cls}`}>
      <p className="flex items-start gap-2 font-bold">
        <span aria-hidden>{v.icon}</span>
        <RichText text={headline} />
      </p>
      {children && <div className="mt-2 space-y-1.5 text-sm leading-relaxed">{children}</div>}
    </div>
  );
}

/** Collapsible exam-style derivation. */
export function Derivation({ steps, title = 'Formale Herleitung (Rechenweg wie in der Klausur)', open = false }: { steps: string[]; title?: string; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
      <summary className="cursor-pointer list-none font-semibold text-indigo-700 dark:text-indigo-300">
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span> {title}
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {steps.map((s, i) => (
          <li key={i}>
            <RichText text={s} />
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Full-screen cover for passing the device in hot-seat mode. */
export function Curtain({ name, message, onReady }: { name: string; message?: string; onReady: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-indigo-950 p-6 text-center text-white">
      <div className="text-6xl" aria-hidden>
        📱
      </div>
      <h2 className="text-2xl font-bold">Gib das Gerät an {name}</h2>
      <p className="max-w-sm text-indigo-200">{message ?? 'Alle anderen bitte wegschauen. Dein Zug bleibt verdeckt.'}</p>
      <Button onClick={onReady} className="bg-white !text-indigo-900 hover:bg-indigo-100">
        Ich bin {name} – los
      </Button>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useArena();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onClose={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ icon, title, text, onClose }: { icon: string; title: string; text: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <button
      type="button"
      onClick={onClose}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-slate-900 p-3 text-left text-white shadow-xl ring-1 ring-amber-400"
    >
      <span className="text-3xl">{icon}</span>
      <span>
        <span className="block font-bold text-amber-300">{title}</span>
        <span className="block text-sm text-slate-200">{text}</span>
      </span>
    </button>
  );
}

/** Countdown; calls onTimeout once when it reaches zero. */
export function Timer({ seconds, onTimeout, running }: { seconds: number; onTimeout: () => void; running: boolean }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        onTimeout();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const frac = left / seconds;
  return (
    <div className="flex items-center gap-2" aria-label={`Noch ${left} Sekunden`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full transition-all ${frac > 0.33 ? 'bg-indigo-500' : 'bg-rose-500'}`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <span className={`w-12 text-right tabular-nums text-sm font-semibold ${frac > 0.33 ? '' : 'text-rose-600'}`}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </span>
    </div>
  );
}
