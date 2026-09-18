import { describe, expect, it } from 'vitest';
import { dispensadasNoHistorico, montarHistorico } from './historico';
import type { Mensagem } from './types';

const base: Mensagem[] = [
  { id: '1', autor: 'serena', tipo: 'texto', payload: { texto: 'Dia 6.', selo: 'mensagem_do_dia', dia: 6 } },
  { id: '2', autor: 'usuaria', tipo: 'texto', payload: { texto: 'oi' } },
  { id: '3', autor: 'serena', tipo: 'texto', payload: { texto: 'Tô aqui.' } },
  { id: '4', autor: 'serena', tipo: 'resumo_ferramenta', payload: { nome: 'plano_espera', resumo: '✓', resultado: { ancoras: ['caminhada'] }, dispensada: false, dia: 6, params: {} } },
  { id: '5', autor: 'serena', tipo: 'resumo_ferramenta', payload: { nome: 'card_micro', resumo: 'guardado', resultado: {}, dispensada: true, dia: 6, params: { card_id: 'progesterona-01' } } },
  { id: '6', autor: 'serena', tipo: 'texto', payload: { texto: '', streaming: true } },
];

describe('loop de retorno (10d)', () => {
  it('inclui [FERRAMENTA_CONCLUIDA] como turno da usuária e junta papéis consecutivos', () => {
    const h = montarHistorico(base);
    expect(h.map((t) => t.role)).toEqual(['assistant', 'user', 'assistant', 'user']);
    expect(h[3]?.content).toContain('[FERRAMENTA_CONCLUIDA] plano_espera: {"ancoras":["caminhada"],"dispensada":false}');
    expect(h[3]?.content).toContain('[FERRAMENTA_CONCLUIDA] card_micro: {"card_id":"progesterona-01","dispensada":true}');
  });
  it('ignora placeholders em streaming', () => {
    expect(montarHistorico(base).some((t) => t.content === '')).toBe(false);
  });
  it('respeita a janela', () => {
    const muitos: Mensagem[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i), autor: i % 2 ? 'serena' : 'usuaria', tipo: 'texto', payload: { texto: `m${i}` },
    }));
    expect(montarHistorico(muitos, 20)).toHaveLength(20);
  });
  it('lê dispensas do próprio histórico', () => {
    const d = dispensadasNoHistorico(montarHistorico(base));
    expect(d.has('card:progesterona-01')).toBe(true);
    expect(d.has('plano_espera')).toBe(false);
  });
});
