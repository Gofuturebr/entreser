import { describe, expect, it } from 'vitest';
import { calcularDia, diaForcadoDaUrl, limitarDia } from './relogio';

describe('relógio da espera', () => {
  it('avança pela data e trava em D10', () => {
    expect(calcularDia(3, '2026-09-10', '2026-09-10')).toBe(3);
    expect(calcularDia(3, '2026-09-10', '2026-09-13')).toBe(6);
    expect(calcularDia(8, '2026-09-10', '2026-09-30')).toBe(10);
  });
  it('não volta no tempo', () => {
    expect(calcularDia(5, '2026-09-10', '2026-09-01')).toBe(5);
  });
  it('?dia=N força o dia só dentro de 1–10', () => {
    expect(diaForcadoDaUrl('?dia=7')).toBe(7);
    expect(diaForcadoDaUrl('?dia=11')).toBeNull();
    expect(diaForcadoDaUrl('?dia=abc')).toBeNull();
    expect(diaForcadoDaUrl('')).toBeNull();
  });
  it('limita', () => {
    expect(limitarDia(0)).toBe(1);
    expect(limitarDia(99)).toBe(10);
  });
});
