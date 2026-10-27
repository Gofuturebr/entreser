// Chaves dos itens revisáveis de um conteúdo. Cada item tem versão própria
// e pode receber "Aprovado" separadamente. Usado no servidor e no front.
import type { Alvo, Conteudo } from './tipos.ts';

export const ITEM_TEXTO = 'texto';
export const itemPeca = (html: string) => `peca:${html}`;
export const itemImagem = (imagem: string) => `imagem:${imagem}`;

export function itensDoConteudo(c: Pick<Conteudo, 'pecas' | 'imagens'>): string[] {
  return [ITEM_TEXTO, ...c.pecas.map((p) => itemPeca(p.html)), ...c.imagens.map(itemImagem)];
}

/** Item a que um apontamento se refere; null = o conteúdo como um todo (ajuste de formato). */
export function itemDoApontamento(alvo: Alvo, imagem: string | null): string | null {
  if (alvo === 'imagem' && imagem) return itemImagem(imagem);
  if (alvo === 'texto') return ITEM_TEXTO;
  return null;
}
