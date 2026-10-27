import { createContext, useContext } from 'react';
import type { ProjetoPublico, ResumoLote, Revisora } from '../../../../server/tipos.ts';

export type ContextoProjeto = {
  projeto: ProjetoPublico;
  lotes: ResumoLote[];
  revisora: Revisora;
  recarregarLotes: () => void;
};

export const Contexto = createContext<ContextoProjeto | null>(null);

export function useProjeto(): ContextoProjeto {
  const c = useContext(Contexto);
  if (!c) throw new Error('useProjeto fora do ProjetoCliente');
  return c;
}

/** Conteúdos na ordem de leitura (lote › trilha › tema › item), sem repetir referências. */
export function ordemDeLeitura(lotes: ResumoLote[]): { lote: string; id: string }[] {
  const out: { lote: string; id: string }[] = [];
  for (const l of lotes)
    for (const t of l.trilhas)
      for (const tema of t.temas)
        for (const i of tema.itens) if (!i.ref && !out.some((o) => o.lote === l.chave && o.id === i.id)) out.push({ lote: l.chave, id: i.id });
  return out;
}

const e = encodeURIComponent;
export const rota = {
  inicio: (slug: string) => `/p/${e(slug)}`,
  trilha: (slug: string, lote: string, trilha: string) => `/p/${e(slug)}/l/${e(lote)}/t/${e(trilha)}`,
  conteudo: (slug: string, lote: string, id: string) => `/p/${e(slug)}/l/${e(lote)}/c/${e(id)}`,
};
