import { describe, expect, it } from 'vitest';
import { extrairInvocacao, textoVisivelDuranteStream } from './ferramentaParser';

describe('invocação Nível 1 (10a)', () => {
  it('parseia, remove o bloco do texto e devolve nome + params', () => {
    const r = extrairInvocacao('Vamos organizar o dia? <<FERRAMENTA>>{"nome":"plano_espera","motivo":"pediu ajuda"}<<FIM>>');
    expect(r.texto).toBe('Vamos organizar o dia?');
    expect(r.invocacao).toEqual({ nome: 'plano_espera', params: { motivo: 'pediu ajuda' } });
    expect(r.malformado).toBe(false);
  });
  it('card_micro carrega card_id', () => {
    const r = extrairInvocacao('Quer ver? <<FERRAMENTA>>{"nome":"card_micro","card_id":"progesterona-01"}<<FIM>>');
    expect(r.invocacao?.params.card_id).toBe('progesterona-01');
  });
  it('bloco malformado é ignorado por completo e o texto segue valendo', () => {
    const r = extrairInvocacao('Vamos dar forma ao dia? <<FERRAMENTA>>{nome: plano_espera<<FIM>>');
    expect(r.texto).toBe('Vamos dar forma ao dia?');
    expect(r.invocacao).toBeNull();
    expect(r.malformado).toBe(true);
  });
  it('bloco sem fechamento também é descartado', () => {
    const r = extrairInvocacao('Oi. <<FERRAMENTA>>{"nome":"sos_google"}');
    expect(r.texto).toBe('Oi.');
    expect(r.malformado).toBe(true);
  });
  it('sem bloco: texto intacto', () => {
    expect(extrairInvocacao('Tô aqui.')).toEqual({ texto: 'Tô aqui.', invocacao: null, malformado: false });
  });
});

describe('texto visível durante o streaming', () => {
  it('esconde o bloco inteiro e o começo parcial dele', () => {
    expect(textoVisivelDuranteStream('Oi. <<FERRAMENTA>>{"nome"')).toBe('Oi.');
    expect(textoVisivelDuranteStream('Oi. <<FERR')).toBe('Oi.');
    expect(textoVisivelDuranteStream('Oi. <')).toBe('Oi.');
    expect(textoVisivelDuranteStream('Oi. 2 < 3')).toBe('Oi. 2 < 3');
  });
});
