import { DIA_MAX, DIA_MIN } from './types';

// Relógio da espera (01-build-spec.md §6, itens 2 e 9).

export function hojeISO(agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function paraDataLocal(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function limitarDia(dia: number): number {
  if (!Number.isFinite(dia)) return DIA_MIN;
  return Math.min(DIA_MAX, Math.max(DIA_MIN, Math.round(dia)));
}

/** Dia atual: o informado no onboarding avança automaticamente pela data. */
export function calcularDia(diaInformado: number, dataInformada: string, hoje: string = hojeISO()): number {
  const inicio = paraDataLocal(dataInformada).getTime();
  const fim = paraDataLocal(hoje).getTime();
  const diasPassados = Math.floor((fim - inicio) / 86_400_000);
  return limitarDia(diaInformado + Math.max(0, diasPassados));
}

/** `?dia=N` força o dia (modo teste de mesa). Fora de 1–10 é ignorado. */
export function diaForcadoDaUrl(search: string): number | null {
  const bruto = new URLSearchParams(search).get('dia');
  if (bruto === null) return null;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < DIA_MIN || n > DIA_MAX) return null;
  return n;
}
