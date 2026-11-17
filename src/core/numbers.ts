/** Number helpers: tolerant comparison, German formatting, exact fractions, input parsing. */

export const EPS = 1e-9;

/** Relative/absolute tolerant equality for floating-point payoffs. */
export function approxEq(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

/** a ≥ b up to floating-point noise. */
export function geq(a: number, b: number, eps = EPS): boolean {
  return a > b || approxEq(a, b, eps);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** German number formatting without thousands grouping (avoids 1.000 ≙ 1 confusion). */
export function fmt(x: number, digits = 3): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '–';
  const r = Math.abs(x) < 10 ** -(digits + 1) ? 0 : x;
  return r.toLocaleString('de-DE', { maximumFractionDigits: digits, useGrouping: false }).replace('-', '−');
}

/** Same as fmt but safe inside TeX (decimal comma must be wrapped as {,}). */
export function tex(x: number, digits = 3): string {
  return fmt(x, digits).replace(',', '{,}').replace('−', '-');
}

export interface Fraction {
  value: number;
  /** true if numerator and denominator are integers and the fraction is exact */
  exact: boolean;
  num: number;
  den: number;
  /** "2/3" or "0,667" */
  text: string;
  /** "\frac{2}{3}" or "0{,}667" */
  tex: string;
}

/** Build a (reduced) fraction num/den; falls back to decimals for non-integer inputs. */
export function fraction(num: number, den: number): Fraction {
  const value = num / den;
  if (Number.isInteger(num) && Number.isInteger(den) && den !== 0) {
    const g = gcd(num, den) || 1;
    let n = num / g;
    let d = den / g;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    if (d === 1) return { value, exact: true, num: n, den: d, text: fmt(n), tex: tex(n) };
    const sign = n < 0 ? '-' : '';
    return {
      value,
      exact: true,
      num: n,
      den: d,
      text: `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`,
      tex: `${sign}\\frac{${Math.abs(n)}}{${d}}`,
    };
  }
  return { value, exact: false, num, den, text: fmt(value), tex: tex(value) };
}

/** "2/3 ≈ 0,667" style text, used in explanations. */
export function fractionWithDecimal(f: Fraction, digits = 3): { text: string; tex: string } {
  if (f.exact && f.den !== 1) {
    return { text: `${f.text} ≈ ${fmt(f.value, digits)}`, tex: `${f.tex} \\approx ${tex(f.value, digits)}` };
  }
  return { text: f.text, tex: f.tex };
}

/**
 * Parses student input: "0,5", "0.5", "1/2", "-3", " 2 / 3 ". Returns null when not a number.
 * A single comma is treated as decimal separator (German).
 */
export function parseNumberInput(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (s === '') return null;
  const parsePart = (p: string): number | null => {
    if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(p)) return null;
    const v = Number(p.replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  };
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length !== 2) return null;
    const a = parsePart(parts[0]);
    const b = parsePart(parts[1]);
    if (a === null || b === null || b === 0) return null;
    return a / b;
  }
  return parsePart(s);
}
