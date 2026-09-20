import type { Mensagem, Perfil, Preferencias } from './types';

// Persistência local apenas (01-build-spec.md §3, §7 — LGPD por desenho).
// Toda leitura/escrita é protegida: localStorage pode não existir ou estar bloqueado.

const CHAVES = {
  perfil: 'serena.perfil',
  timeline: 'serena.timeline',
  ultimoDiaMensagem: 'serena.ultimoDiaMensagem',
  preferencias: 'serena.preferencias',
  dispensadas: 'serena.dispensadas',
  auditoria: 'serena.auditoria',
} as const;

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto === null ? padrao : (JSON.parse(bruto) as T);
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem persistência disponível — a sessão segue em memória */
  }
}

export const PREFERENCIAS_PADRAO: Preferencias = { travessia: 'marcador', fioRota: true };

export const storage = {
  lerPerfil: (): Perfil | null => {
    const p = ler<(Partial<Perfil> & { diaInformado?: number }) | null>(CHAVES.perfil, null);
    if (!p) return null;
    // Perfis anteriores à entrada do Percurso não tinham fase: eram todos da espera.
    return { ...p, fase: typeof p.fase === 'number' ? p.fase : 5 } as Perfil;
  },
  salvarPerfil: (p: Perfil) => gravar(CHAVES.perfil, p),

  lerTimeline: (): Mensagem[] => ler<Mensagem[]>(CHAVES.timeline, []),
  salvarTimeline: (t: Mensagem[]) => gravar(CHAVES.timeline, t),

  lerUltimoDiaMensagem: (): number | null => ler<number | null>(CHAVES.ultimoDiaMensagem, null),
  salvarUltimoDiaMensagem: (dia: number) => gravar(CHAVES.ultimoDiaMensagem, dia),

  lerPreferencias: (): Preferencias => ({ ...PREFERENCIAS_PADRAO, ...ler<Partial<Preferencias>>(CHAVES.preferencias, {}) }),
  salvarPreferencias: (p: Preferencias) => gravar(CHAVES.preferencias, p),

  lerDispensadas: (): string[] => ler<string[]>(CHAVES.dispensadas, []),
  salvarDispensadas: (lista: string[]) => gravar(CHAVES.dispensadas, lista),

  lerAuditoria: <T>(padrao: T): T => ler<T>(CHAVES.auditoria, padrao),
  salvarAuditoria: (a: unknown) => gravar(CHAVES.auditoria, a),

  limparTudo: () => {
    try {
      Object.values(CHAVES).forEach((c) => localStorage.removeItem(c));
    } catch {
      /* nada a limpar */
    }
  },
};
