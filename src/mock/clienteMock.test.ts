import { describe, expect, it } from 'vitest';
import { validarCorpus } from '../lib/corpus';
import corpusJson from '../../specs/fixtures/corpus_e5.exemplo.json';
import { criarClienteMock, decidirResposta } from './clienteMock';
import type { EventoStream } from '../lib/cliente';

const corpus = validarCorpus(corpusJson);
const estado = { nome: 'Ana', dia: 6, data: '2026-09-18' };

describe('decisão do mock', () => {
  it('rota Entender: FAQ + convite de card com invocação card_micro', () => {
    const d = decidirResposta({ mensagens: [{ role: 'user', content: 'tô com cólica' }], estado }, corpus);
    expect(d.rota).toBe('entender');
    expect(d.texto).toContain('equipe médica');
    expect(d.texto).toContain('<<FERRAMENTA>>{"nome":"card_micro","card_id":"progesterona-01"}<<FIM>>');
  });
  it('card dispensado não é reoferecido na sessão', () => {
    const d = decidirResposta(
      { mensagens: [{ role: 'user', content: '[FERRAMENTA_CONCLUIDA] card_micro: {"card_id":"progesterona-01","dispensada":true}\n\ntô com cólica' }], estado },
      corpus,
    );
    expect(d.texto).not.toContain('card_micro');
  });
  it('rota Preparar: invoca a ferramenta; dispensada não é reoferecida', () => {
    const a = decidirResposta({ mensagens: [{ role: 'user', content: 'não sei o que fazer hoje' }], estado }, corpus);
    expect(a.texto).toContain('"nome":"plano_espera"');
    const b = decidirResposta(
      { mensagens: [{ role: 'user', content: '[FERRAMENTA_CONCLUIDA] plano_espera: {"dispensada":true}\n\nnão sei o que fazer hoje' }], estado },
      corpus,
    );
    expect(b.texto).not.toContain('<<FERRAMENTA>>');
  });
  it('retoma o conteúdo de uma ferramenta concluída (10d)', () => {
    const d = decidirResposta(
      { mensagens: [{ role: 'user', content: '[FERRAMENTA_CONCLUIDA] plano_espera: {"ancoras":["caminhada","uma série"],"dispensada":false}\n\nconsegui!' }], estado },
      corpus,
    );
    expect(d.texto).toContain('caminhada');
  });
  it('rota Bem-Estar: acolhimento do corpus', () => {
    const d = decidirResposta({ mensagens: [{ role: 'user', content: 'tô com muito medo do resultado' }], estado }, corpus);
    expect(d.rota).toBe('bem_estar');
    expect(corpus.acolhimento.flatMap((a) => a.frases_validadas).some((f) => d.texto.startsWith(f))).toBe(true);
  });
  it('bancada: #erro sinaliza erro', () => {
    expect(decidirResposta({ mensagens: [{ role: 'user', content: '#erro' }], estado }, corpus).erro).toBe(true);
  });
});

describe('streaming do mock (formato Messages API)', () => {
  it('emite a sequência de eventos e o texto completo', async () => {
    const cliente = criarClienteMock(corpus, undefined, { primeiro_token_ms: 0, intervalo_token_ms: 0, demora_ms: 0 });
    const eventos: EventoStream[] = [];
    for await (const ev of cliente.enviar({ mensagens: [{ role: 'user', content: 'oi' }], estado })) eventos.push(ev);
    expect(eventos.map((e) => e.type)).toEqual([
      'message_start',
      ...['content_block_start'],
      ...eventos.filter((e) => e.type === 'content_block_delta').map(() => 'content_block_delta'),
      'content_block_stop',
      'message_delta',
      'message_stop',
    ]);
    const texto = eventos.filter((e) => e.type === 'content_block_delta').map((e) => (e.type === 'content_block_delta' ? e.delta.text : '')).join('');
    expect(texto).toContain('Ana');
    const fim = eventos.find((e) => e.type === 'message_delta');
    expect(fim && fim.type === 'message_delta' ? fim.usage.output_tokens : 0).toBeGreaterThan(0);
  });
  it('para ao abortar', async () => {
    const cliente = criarClienteMock(corpus, undefined, { primeiro_token_ms: 0, intervalo_token_ms: 0, demora_ms: 0 });
    const ctl = new AbortController();
    let deltas = 0;
    for await (const ev of cliente.enviar({ mensagens: [{ role: 'user', content: 'oi' }], estado }, ctl.signal)) {
      if (ev.type === 'content_block_delta') {
        deltas++;
        ctl.abort();
      }
    }
    expect(deltas).toBe(1);
  });
});
