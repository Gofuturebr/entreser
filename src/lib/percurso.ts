import type { FasePercurso, Percurso } from './types';

export const CAMINHO_PERCURSO = 'percurso.json';

export function validarPercurso(dado: unknown): Percurso {
  if (typeof dado !== 'object' || dado === null) throw new Error('percurso inválido');
  const p = dado as Record<string, unknown>;
  if (!Array.isArray(p.fases) || p.fases.length !== 7) throw new Error('percurso inválido: são esperadas 7 etapas');
  if (typeof p.fase_ativa !== 'number') throw new Error('percurso inválido: falta fase_ativa');
  if (typeof p.microcopy !== 'object' || p.microcopy === null) throw new Error('percurso inválido: falta microcopy');
  return dado as Percurso;
}

export async function carregarPercurso(base = import.meta.env.BASE_URL): Promise<Percurso> {
  const resposta = await fetch(`${base}${CAMINHO_PERCURSO}`, { cache: 'no-store' });
  if (!resposta.ok) throw new Error(`percurso indisponível (${resposta.status})`);
  return validarPercurso(await resposta.json());
}

export function faseDoPercurso(percurso: Percurso, numero: number): FasePercurso | undefined {
  return percurso.fases.find((f) => f.numero === numero);
}

export function faseEstaAtiva(percurso: Percurso, numero: number): boolean {
  return faseDoPercurso(percurso, numero)?.ativa === true;
}
