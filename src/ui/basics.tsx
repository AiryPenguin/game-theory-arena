import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700',
  ghost: 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 dark:bg-slate-900 dark:ring-slate-700 ${className}`}>
      {children}
    </section>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-50">{children}</h2>;
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'indigo' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Big selectable tile used for radio-like choices. */
export function Choice({
  selected,
  onClick,
  children,
  className = '',
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-xl px-3 py-2 text-left ring-1 transition ${
        selected
          ? 'bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-950'
          : 'bg-white ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-600 dark:hover:bg-slate-700'
      } disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-xl bg-white px-3 py-2 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:ring-slate-600';

/** Destructive action with an in-page confirmation step (browser dialogs are not always available). */
export function ConfirmButton({ label, question, confirmLabel, onConfirm }: { label: string; question: string; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button variant="ghost" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-800">
      <span className="text-sm font-medium">{question}</span>
      <Button
        variant="danger"
        onClick={() => {
          onConfirm();
          setAsking(false);
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="secondary" onClick={() => setAsking(false)}>
        Abbrechen
      </Button>
    </div>
  );
}
