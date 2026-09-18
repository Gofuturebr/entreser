import type { ClienteSerena, EventoStream, RequisicaoChat } from '../lib/cliente';
import { normalizar } from '../lib/guardrails';
import { dispensadasNoHistorico, MARCADOR_CONCLUIDA, type MensagemModelo } from '../lib/historico';
import { ABRE, FECHA } from '../lib/ferramentaParser';
import type { Corpus, Rota } from '../lib/types';
import fixturePadrao from '../../specs/fixtures/respostas_mock.json';

// Mock de streaming (Fase 1–2). Imita a API Anthropic com streaming e decide a
// resposta a partir do corpus + fixture. Não há modelo aqui: é bancada de interface.

type RespostaFixture = {
  id: string;
  rota: Rota;
  gatilhos: string[];
  texto: string;
  ferramenta?: { nome: string; motivo?: string };
  requer_concluida?: string;
};

export type FixtureMock = {
  tempos: { primeiro_token_ms: number; intervalo_token_ms: number; demora_ms: number };
  convite_card: string;
  convite_ferramenta: string;
  respostas: RespostaFixture[];
  bancada: { comandos: Record<string, string>; respostas: Record<string, string> };
};

export type Decisao = { texto: string; rota: Rota; atrasoMs?: number; erro?: boolean };

function casaGatilho(alvo: string, gatilho: string): boolean {
  const g = normalizar(gatilho);
  if (!g) return false;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u');
  return re.test(alvo);
}

function bloco(nome: string, extra: Record<string, string> = {}): string {
  return `${ABRE}${JSON.stringify({ nome, ...extra })}${FECHA}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function ultimaFalaDaUsuaria(mensagens: MensagemModelo[]): string {
  const ultimo = [...mensagens].reverse().find((m) => m.role === 'user');
  if (!ultimo) return '';
  const linhas = ultimo.content.split('\n').filter((l) => l.trim() && !l.startsWith(MARCADOR_CONCLUIDA));
  return linhas[linhas.length - 1] ?? '';
}

function ancoraDoPlano(mensagens: MensagemModelo[]): string | null {
  const re = /\[FERRAMENTA_CONCLUIDA\] plano_espera: (\{[^\n]*\})/g;
  let ultima: string | null = null;
  for (const m of mensagens) {
    if (m.role !== 'user') continue;
    for (const casamento of m.content.matchAll(re)) {
      try {
        const obj = JSON.parse(casamento[1] ?? '{}') as { ancoras?: unknown; dispensada?: boolean };
        if (obj.dispensada) continue;
        if (Array.isArray(obj.ancoras) && typeof obj.ancoras[0] === 'string') ultima = obj.ancoras[0];
      } catch {
        /* ignora */
      }
    }
  }
  return ultima;
}

export function decidirResposta(req: RequisicaoChat, corpus: Corpus, fixture: FixtureMock = fixturePadrao as FixtureMock): Decisao {
  const fala = ultimaFalaDaUsuaria(req.mensagens);
  const alvo = normalizar(fala);
  const dispensadas = dispensadasNoHistorico(req.mensagens);

  // Bancada de teste (comandos exatos)
  if (alvo === '#erro') return { texto: '', rota: 'bem_estar', erro: true };
  if (alvo === '#demora') {
    return { texto: 'Desculpa a demora. Eu tô aqui — pode continuar de onde você estava.', rota: 'bem_estar', atrasoMs: fixture.tempos.demora_ms };
  }
  const bancada = fixture.bancada.respostas[alvo];
  if (bancada !== undefined) return { texto: bancada, rota: alvo === '#ponte' ? 'preparar' : 'bem_estar' };

  const convidarCard = (cardId: string | undefined): string => {
    if (!cardId || dispensadas.has(`card:${cardId}`)) return '';
    if (!corpus.cards_microlearning.some((c) => c.id === cardId)) return '';
    return ` ${fixture.convite_card} ${bloco('card_micro', { card_id: cardId })}`;
  };

  // Entender — FAQ do corpus
  for (const faq of corpus.faq) {
    if (!faq.gatilhos.some((g) => casaGatilho(alvo, g))) continue;
    let texto = faq.resposta_base;
    let rota: Rota = 'entender';
    if (faq.ferramenta && !dispensadas.has(faq.ferramenta)) {
      texto += ` ${fixture.convite_ferramenta} ${bloco(faq.ferramenta, { motivo: `faq ${faq.id}` })}`;
      rota = 'preparar';
    } else {
      texto += convidarCard(faq.card_id);
    }
    return { texto, rota };
  }

  // Bem-Estar — biblioteca de acolhimento
  for (const ac of corpus.acolhimento) {
    if (ac.gatilhos.length === 0) continue;
    if (!ac.gatilhos.some((g) => casaGatilho(alvo, g))) continue;
    const frase = ac.frases_validadas[hash(alvo) % ac.frases_validadas.length] ?? '';
    return { texto: `${frase}${convidarCard(ac.card_id)}`, rota: 'bem_estar' };
  }

  // Costuras de conversa e Preparar — fixture
  for (const r of fixture.respostas) {
    if (r.requer_concluida && ancoraDoPlano(req.mensagens) === null) continue;
    if (!r.gatilhos.some((g) => casaGatilho(alvo, g))) continue;
    let texto = r.texto
      .replace('{nome}', req.estado.nome ? `, ${req.estado.nome}` : '')
      .replace('{dia}', String(req.estado.dia))
      .replace('{ancora}', ancoraDoPlano(req.mensagens) ?? 'aquilo que você tinha combinado');
    if (r.ferramenta) {
      if (dispensadas.has(r.ferramenta.nome)) texto += ' Quando quiser, é só me chamar.';
      else texto += ` ${bloco(r.ferramenta.nome, r.ferramenta.motivo ? { motivo: r.ferramenta.motivo } : {})}`;
    }
    return { texto, rota: r.rota };
  }

  // Fallback — acolhimento geral, em rodízio
  const geral = corpus.acolhimento.find((a) => a.contexto === 'geral');
  const frases = geral?.frases_validadas ?? ['Tô aqui.'];
  const vez = req.mensagens.filter((m) => m.role === 'user').length;
  return { texto: frases[vez % frases.length] ?? 'Tô aqui.', rota: 'bem_estar' };
}

function esperar(ms: number, sinal?: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    if (sinal?.aborted) return resolver();
    const t = setTimeout(resolver, ms);
    sinal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolver();
    }, { once: true });
  });
}

function estimarTokens(texto: string): number {
  return Math.max(1, Math.round(texto.length / 4));
}

export function criarClienteMock(corpus: Corpus, fixture: FixtureMock = fixturePadrao as FixtureMock, tempos = fixture.tempos): ClienteSerena {
  return {
    async *enviar(req: RequisicaoChat, sinal?: AbortSignal): AsyncIterable<EventoStream> {
      const decisao = decidirResposta(req, corpus, fixture);
      const entrada = estimarTokens(req.mensagens.map((m) => m.content).join('\n'));

      yield {
        type: 'message_start',
        message: { id: `mock_${Date.now().toString(36)}`, model: 'mock-serena-degrau-b', usage: { input_tokens: entrada, output_tokens: 0 } },
        metadata: { rota: decisao.rota },
      };

      await esperar(decisao.atrasoMs ?? tempos.primeiro_token_ms, sinal);
      if (sinal?.aborted) return;

      if (decisao.erro) {
        yield { type: 'error', error: { type: 'overloaded_error', message: 'simulação de indisponibilidade (bancada)' } };
        return;
      }

      yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };

      const pedacos = decisao.texto.split(/(\s+)/).filter((p) => p.length > 0);
      let saida = 0;
      for (const pedaco of pedacos) {
        if (sinal?.aborted) return;
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: pedaco } };
        if (/\S/.test(pedaco)) {
          saida += 1;
          await esperar(tempos.intervalo_token_ms, sinal);
        }
      }

      yield { type: 'content_block_stop', index: 0 };
      yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: saida } };
      yield { type: 'message_stop' };
    },
  };
}
