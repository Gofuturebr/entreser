import { describe, expect, it } from 'vitest';
import percurso from '../../specs/fixtures/percurso.json';
import corpus from '../../specs/fixtures/corpus_e5.exemplo.json';
import { faseEstaAtiva, validarPercurso } from './percurso';
import { encontrarVocabularioProibido } from './guardrails';

describe('percurso (mapa E1–E7)', () => {
  it('valida e só E5 está ativa', () => {
    const p = validarPercurso(percurso);
    expect(p.fases.map((f) => f.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(faseEstaAtiva(p, 5)).toBe(true);
    expect([1, 2, 3, 4, 6, 7].some((n) => faseEstaAtiva(p, n))).toBe(false);
  });
  it('rejeita mapa incompleto', () => {
    expect(() => validarPercurso({ fases: [], fase_ativa: 5, microcopy: {} })).toThrow();
  });
  it('não usa vocabulário proibido', () => {
    const textos = [...percurso.fases.flatMap((f) => [f.nome, f.lema, f.verbo, f.situacao, f.momento]), ...Object.values(percurso.microcopy)];
    for (const t of textos) expect(encontrarVocabularioProibido(t, corpus.vocabulario_proibido), t).toBeNull();
  });
});
