import type { Mensagem } from './types';

// Histórico enviado ao modelo (01-build-spec.md §6 item 4 e §10.4 — loop de retorno).
// A montagem do prompt de sistema é da Fase 3 (proxy); aqui só o histórico de turnos.

export type Papel = 'user' | 'assistant';
export type MensagemModelo = { role: Papel; content: string };

export const MARCADOR_CONCLUIDA = '[FERRAMENTA_CONCLUIDA]';

export function linhaFerramentaConcluida(nome: string, resultado: Record<string, unknown>, dispensada: boolean): string {
  return `${MARCADOR_CONCLUIDA} ${nome}: ${JSON.stringify({ ...resultado, dispensada })}`;
}

export function montarHistorico(timeline: Mensagem[], janela = 20): MensagemModelo[] {
  const turnos: MensagemModelo[] = [];
  for (const m of timeline) {
    if (m.tipo === 'texto') {
      if (m.payload.streaming) continue;
      if (!m.payload.texto.trim()) continue;
      turnos.push({ role: m.autor === 'usuaria' ? 'user' : 'assistant', content: m.payload.texto });
    } else if (m.tipo === 'resumo_ferramenta') {
      turnos.push({
        role: 'user',
        content: linhaFerramentaConcluida(m.payload.nome, { ...m.payload.params, ...m.payload.resultado }, m.payload.dispensada),
      });
    }
    // 'ferramenta' (widget aberto) e 'erro' não vão ao modelo.
  }

  // Junta turnos consecutivos do mesmo papel (a API espera alternância).
  const unidos: MensagemModelo[] = [];
  for (const t of turnos) {
    const anterior = unidos[unidos.length - 1];
    if (anterior && anterior.role === t.role) anterior.content = `${anterior.content}\n\n${t.content}`;
    else unidos.push({ ...t });
  }
  return unidos.slice(-janela);
}

/** Ferramentas/cards dispensados na sessão, lidos do próprio histórico. */
export function dispensadasNoHistorico(historico: MensagemModelo[]): Set<string> {
  const dispensadas = new Set<string>();
  const re = /\[FERRAMENTA_CONCLUIDA\] (\S+): (\{[^\n]*\})/g;
  for (const t of historico) {
    if (t.role !== 'user') continue;
    for (const m of t.content.matchAll(re)) {
      try {
        const obj = JSON.parse(m[2] ?? '{}') as Record<string, unknown>;
        if (obj.dispensada === true) {
          dispensadas.add(m[1] === 'card_micro' && typeof obj.card_id === 'string' ? `card:${obj.card_id}` : (m[1] ?? ''));
        }
      } catch {
        /* linha ilegível: ignora */
      }
    }
  }
  return dispensadas;
}
