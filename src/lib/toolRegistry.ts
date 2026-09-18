import type { ComponentType } from 'react';
import type { PropsComponenteRegistry } from '../components/adaptadoresRegistry';
import { AcordosWidget, CardMicrolearningWidget, PlanoEsperaWidget, PonteHumanaCard, SosGoogleWidget } from '../components/adaptadoresRegistry';

// ToolRegistry (01-build-spec.md §10.1, §10.5, §10.8).
// O LLM só invoca nomes registrados; o conteúdo interno vem sempre do corpus.
// A fronteira é limpa: trocar o transporte (Nível 1 → tool use nativo) não toca aqui.

export type EntradaRegistry = {
  versao: 'corpus';
  schemaEntrada: Record<string, 'string'>;
  componente: ComponentType<PropsComponenteRegistry>;
  conteudo: string;
  /** Ponte Humana: suspende a timeline e nunca colapsa sozinha. */
  privilegiada?: boolean;
  /** Card de microlearning: não conta como widget ativo. */
  leve?: boolean;
};

export const TOOL_REGISTRY = {
  sos_google: { versao: 'corpus', schemaEntrada: {}, componente: SosGoogleWidget, conteudo: 'corpus.ferramentas[id=sos_google]' },
  plano_espera: { versao: 'corpus', schemaEntrada: {}, componente: PlanoEsperaWidget, conteudo: 'corpus.ferramentas[id=plano_espera]' },
  acordos_casal: { versao: 'corpus', schemaEntrada: {}, componente: AcordosWidget, conteudo: 'corpus.ferramentas[id=acordos_casal]' },
  ponte_humana: { versao: 'corpus', schemaEntrada: {}, componente: PonteHumanaCard, conteudo: 'corpus.escalonamento', privilegiada: true },
  card_micro: { versao: 'corpus', schemaEntrada: { card_id: 'string' }, componente: CardMicrolearningWidget, conteudo: 'corpus.cards_microlearning[id=card_id]', leve: true },
} as const satisfies Record<string, EntradaRegistry>;

export type NomeFerramenta = keyof typeof TOOL_REGISTRY;

export function ehRegistrada(nome: string): nome is NomeFerramenta {
  return Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, nome);
}

export function entradaRegistry(nome: string): EntradaRegistry | null {
  return ehRegistrada(nome) ? TOOL_REGISTRY[nome] : null;
}

/** Só ferramentas comuns ocupam a vaga de "1 widget ativo por vez" (§10.2). */
export function contaComoWidgetAtivo(nome: string): boolean {
  const e = entradaRegistry(nome);
  return e !== null && !e.privilegiada && !e.leve;
}
