import { useEffect, useRef, useState } from 'react';
import type { StatusAgregado } from '../../server/tipos.ts';

export const mensagem = (e: unknown) => (e instanceof Error ? e.message : 'Algo saiu do esperado. Tente de novo.');

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const ROTULO_STATUS: Record<StatusAgregado, string> = {
  aprovado: 'Aprovado',
  ajustes: 'Com ajustes',
  pendente: 'Sem revisão',
};

export const nomeArquivo = (caminho: string) => caminho.split('/').pop() ?? caminho;

type Estado<T> = { dados: T | undefined; erro: string | undefined; carregando: boolean };

/** Carrega dados quando `chave` muda; `recarregar` busca de novo, `definir` troca sem buscar. */
export function useCarregar<T>(carregar: () => Promise<T>, chave: string) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: undefined, erro: undefined, carregando: true });
  const [versao, setVersao] = useState(0);
  const fn = useRef(carregar);
  useEffect(() => {
    fn.current = carregar;
  });
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true }));
    fn.current().then(
      (dados) => vivo && setEstado({ dados, erro: undefined, carregando: false }),
      (e: unknown) => vivo && setEstado((s) => ({ ...s, erro: mensagem(e), carregando: false })),
    );
    return () => {
      vivo = false;
    };
  }, [chave, versao]);
  return {
    ...estado,
    recarregar: () => setVersao((v) => v + 1),
    definir: (dados: T) => setEstado({ dados, erro: undefined, carregando: false }),
  };
}

export function lerLocal(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarLocal(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: a escolha vale só até recarregar */
  }
}
