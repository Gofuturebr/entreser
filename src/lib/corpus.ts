import type { Corpus, CardCorpus, FerramentaCorpus, Roteiro } from './types';

export const CAMINHO_CORPUS = 'corpus_e5.exemplo.json';

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Validação leve do contrato do corpus (01-build-spec.md §4). Lança em pt-BR. */
export function validarCorpus(dado: unknown): Corpus {
  if (!ehObjeto(dado)) throw new Error('corpus inválido: não é um objeto');
  const chaves = [
    'versao',
    'vocabulario_proibido',
    'roteiros_diarios',
    'faq',
    'acolhimento',
    'ferramentas',
    'cards_microlearning',
    'escalonamento',
    'microcopy',
    'onboarding',
  ];
  for (const chave of chaves) {
    if (!(chave in dado)) throw new Error(`corpus inválido: falta "${chave}"`);
  }
  const roteiros = dado.roteiros_diarios;
  if (!Array.isArray(roteiros) || roteiros.length !== 10) {
    throw new Error('corpus inválido: são esperados 10 roteiros diários (D1–D10)');
  }
  const esc = dado.escalonamento;
  if (!ehObjeto(esc) || !Array.isArray(esc.termos_gatilho) || typeof esc.mensagem_ponte_humana !== 'string') {
    throw new Error('corpus inválido: escalonamento incompleto');
  }
  return dado as Corpus;
}

export async function carregarCorpus(base = import.meta.env.BASE_URL): Promise<Corpus> {
  const resposta = await fetch(`${base}${CAMINHO_CORPUS}`, { cache: 'no-store' });
  if (!resposta.ok) throw new Error(`corpus indisponível (${resposta.status})`);
  return validarCorpus(await resposta.json());
}

export function corpusNaoChancelado(corpus: Pick<Corpus, 'versao'>): boolean {
  return corpus.versao.includes('NAO-CHANCELADO');
}

export function roteiroDoDia(corpus: Corpus, dia: number): Roteiro | undefined {
  return corpus.roteiros_diarios.find((r) => r.dia === dia);
}

export function ferramentaDoCorpus(corpus: Corpus, id: string): FerramentaCorpus | undefined {
  return corpus.ferramentas.find((f) => f.id === id);
}

export function cardDoCorpus(corpus: Corpus, id: string): CardCorpus | undefined {
  return corpus.cards_microlearning.find((c) => c.id === id);
}

/** Substitui {chave} por valores; listas viram "a, b e c". */
export function preencherTemplate(template: string, valores: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, chave: string) => {
    const v = valores[chave];
    if (Array.isArray(v)) return listarEmPortugues(v.map(String));
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  });
}

export function listarEmPortugues(itens: string[]): string {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
