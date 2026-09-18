import type { MensagemModelo } from './historico';

// Contrato do cliente de chat. O mock (Fase 1–2) e o proxy (Fase 3) implementam
// a mesma interface: o front consome eventos no formato do streaming da API
// Anthropic (Messages API) e não sabe quem está do outro lado.

export type EstadoConversa = { nome?: string; dia: number; data: string };

export type RequisicaoChat = { mensagens: MensagemModelo[]; estado: EstadoConversa };

export type EventoStream =
  | {
      type: 'message_start';
      message: { id: string; model: string; usage: { input_tokens: number; output_tokens: number } };
      /** Extensão só do mock: rota classificada. A Fase 3 decide se o proxy a expõe. */
      metadata?: { rota?: string };
    }
  | { type: 'content_block_start'; index: number; content_block: { type: 'text'; text: string } }
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason: 'end_turn' | 'max_tokens' }; usage: { output_tokens: number } }
  | { type: 'message_stop' }
  | { type: 'error'; error: { type: string; message: string } };

export type ClienteSerena = {
  enviar(req: RequisicaoChat, sinal?: AbortSignal): AsyncIterable<EventoStream>;
};
