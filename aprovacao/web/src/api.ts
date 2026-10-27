import type {
  Alvo, Apontamento, DetalheConteudo, ProjetoAdmin, ProjetoPublico, ResultadoUpload, ResumoLote, Revisora, StatusDecisao,
} from '../../server/tipos.ts';

export class ErroApi extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Confira a internet e tente de novo.', 0);
  }
  if (r.status === 204) return undefined as T;
  const corpo: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi((corpo as { erro?: string } | null)?.erro ?? 'Algo saiu do esperado. Tente de novo.', r.status);
  return corpo as T;
}

const enc = encodeURIComponent;
const comJson = (method: string, corpo: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corpo),
});

export const api = {
  projeto: (slug: string) => pedir<ProjetoPublico>(`/api/p/${enc(slug)}`),
  lotes: (slug: string) => pedir<ResumoLote[]>(`/api/p/${enc(slug)}/lotes`),
  conteudo: (slug: string, lote: string, id: string) => pedir<DetalheConteudo>(`/api/p/${enc(slug)}/l/${enc(lote)}/c/${enc(id)}`),
  apontar: (slug: string, lote: string, id: string, corpo: { revisoraId: number; alvo: Alvo; imagem?: string; texto: string }) =>
    pedir<DetalheConteudo>(`/api/p/${enc(slug)}/l/${enc(lote)}/c/${enc(id)}/apontamentos`, comJson('POST', corpo)),
  decidir: (slug: string, lote: string, id: string, revisoraId: number, status: StatusDecisao | null) =>
    pedir<DetalheConteudo>(`/api/p/${enc(slug)}/l/${enc(lote)}/c/${enc(id)}/decisao`, comJson('PUT', { revisoraId, status })),
};

export const urlArquivo = (slug: string, lote: string, relativo: string) =>
  `/arquivos/${enc(slug)}/${enc(lote)}/${relativo.split('/').map(enc).join('/')}`;

// ---------- admin ----------

const CHAVE_SENHA = 'aprovacao:admin';

export const senhaAdmin = {
  ler(): string {
    try {
      return sessionStorage.getItem(CHAVE_SENHA) ?? '';
    } catch {
      return '';
    }
  },
  salvar(s: string) {
    try {
      sessionStorage.setItem(CHAVE_SENHA, s);
    } catch {
      /* sem armazenamento: pede a senha de novo ao recarregar */
    }
  },
  limpar() {
    try {
      sessionStorage.removeItem(CHAVE_SENHA);
    } catch {
      /* nada a limpar */
    }
  },
};

/** Avisado quando a senha expira, para a tela voltar ao login. */
export const aoSairAdmin = new EventTarget();

async function adm<T>(url: string, init: RequestInit = {}): Promise<T> {
  try {
    return await pedir<T>(url, {
      ...init,
      headers: { ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), 'x-admin-senha': senhaAdmin.ler(), ...init.headers },
    });
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) {
      senhaAdmin.limpar();
      aoSairAdmin.dispatchEvent(new Event('sair'));
    }
    throw e;
  }
}

const corpo = (method: string, dados: unknown): RequestInit => ({ method, body: JSON.stringify(dados) });

export const admin = {
  entrar: (senha: string) => pedir<{ ok: true }>('/api/admin/entrar', comJson('POST', { senha })),
  projetos: () => adm<ProjetoAdmin[]>('/api/admin/projetos'),
  criarProjeto: (nome: string) => adm<ProjetoAdmin>('/api/admin/projetos', corpo('POST', { nome })),
  projeto: (slug: string) => adm<ProjetoAdmin>(`/api/admin/projetos/${enc(slug)}`),
  removerProjeto: (slug: string) => adm<undefined>(`/api/admin/projetos/${enc(slug)}`, { method: 'DELETE' }),
  removerLote: (slug: string, chave: string) => adm<undefined>(`/api/admin/projetos/${enc(slug)}/lotes/${enc(chave)}`, { method: 'DELETE' }),
  revisoras: (slug: string) => adm<Revisora[]>(`/api/admin/projetos/${enc(slug)}/revisoras`),
  criarRevisora: (slug: string, nome: string, papel: string) =>
    adm<Revisora[]>(`/api/admin/projetos/${enc(slug)}/revisoras`, corpo('POST', { nome, papel })),
  removerRevisora: (slug: string, id: number) => adm<Revisora[]>(`/api/admin/projetos/${enc(slug)}/revisoras/${id}`, { method: 'DELETE' }),
  apontamentos: (slug: string) => adm<Apontamento[]>(`/api/admin/projetos/${enc(slug)}/apontamentos`),
  resolver: (slug: string, id: number, resolvido: boolean) =>
    adm<undefined>(`/api/admin/projetos/${enc(slug)}/apontamentos/${id}`, corpo('PATCH', { resolvido })),

  async exportar(slug: string, formato: 'md' | 'csv', comResolvidos: boolean) {
    const r = await fetch(`/api/admin/projetos/${enc(slug)}/exportar?formato=${formato}${comResolvidos ? '&resolvidos=1' : ''}`, {
      headers: { 'x-admin-senha': senhaAdmin.ler() },
    });
    if (!r.ok) throw new ErroApi('Não consegui gerar a exportação. Tente de novo.', r.status);
    const nome = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? `apontamentos.${formato}`;
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Upload com progresso (fetch ainda não informa progresso de envio). */
  enviar(slug: string, form: FormData, aoProgredir: (fracao: number) => void): Promise<ResultadoUpload> {
    return new Promise((resolver, rejeitar) => {
      const x = new XMLHttpRequest();
      x.open('POST', `/api/admin/projetos/${enc(slug)}/upload`);
      x.setRequestHeader('x-admin-senha', senhaAdmin.ler());
      x.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total);
      x.onerror = () => rejeitar(new ErroApi('A conexão caiu durante o envio. Tente de novo.', 0));
      x.onload = () => {
        let dados: unknown = null;
        try {
          dados = JSON.parse(x.responseText);
        } catch {
          /* resposta sem JSON */
        }
        if (x.status >= 200 && x.status < 300) resolver(dados as ResultadoUpload);
        else {
          if (x.status === 401) {
            senhaAdmin.limpar();
            aoSairAdmin.dispatchEvent(new Event('sair'));
          }
          rejeitar(new ErroApi((dados as { erro?: string } | null)?.erro ?? 'Não consegui enviar. Tente de novo.', x.status));
        }
      };
      x.send(form);
    });
  },
};
