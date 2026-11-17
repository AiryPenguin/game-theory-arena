import { describe, expect, it } from 'vitest';
import { fmt, fraction, parseNumberInput } from './numbers';

describe('parseNumberInput', () => {
  it.each([
    ['0,5', 0.5],
    ['0.5', 0.5],
    ['1/2', 0.5],
    [' 2 / 3 ', 2 / 3],
    ['-3', -3],
    ['−3', -3],
    ['10', 10],
    [',25', 0.25],
  ])('%s → %d', (input, value) => {
    expect(parseNumberInput(input)).toBeCloseTo(value);
  });
  it.each(['', 'abc', '1/0', '1/2/3', '1,2,3', '1e5x'])('%s → null', (input) => {
    expect(parseNumberInput(input)).toBeNull();
  });
});

describe('fraction', () => {
  it('reduces integer fractions', () => {
    expect(fraction(2, 4).text).toBe('1/2');
    expect(fraction(2, 4).tex).toBe('\\frac{1}{2}');
    expect(fraction(4, 2).text).toBe('2');
    expect(fraction(-2, 6).text).toBe('−1/3');
    expect(fraction(2, -6).tex).toBe('-\\frac{1}{3}');
  });
  it('falls back to decimals', () => {
    expect(fraction(1.5, 2).text).toBe('0,75');
    expect(fraction(1.5, 2).exact).toBe(false);
  });
});

describe('fmt', () => {
  it('uses German decimal comma and true minus', () => {
    expect(fmt(0.6667)).toBe('0,667');
    expect(fmt(-2)).toBe('−2');
    expect(fmt(1234.5)).toBe('1234,5');
  });
});
