import { storage } from './storage';
import type { Mensagem } from './types';

// Auditoria local (01-build-spec.md §6 item 7, §7): incidentes dos guardrails,
// tokens por resposta e export anonimizado para a psicóloga.

export type TipoIncidente =
  | 'crise_prefiltro'
  | 'pos_filtro'
  | 'ferramenta_desconhecida'
  | 'bloco_malformado'
  | 'widget_duplicado'
  | 'card_desconhecido'
  | 'erro_modelo';

export type Incidente = { tipo: TipoIncidente; detalhe: string; quando: string };

export type RegistroResposta = {
  quando: string;
  dia: number;
  tokens_entrada: number;
  tokens_saida: number;
  rota?: string;
  ferramenta?: string;
};

export type Auditoria = { incidentes: Incidente[]; respostas: RegistroResposta[] };

export function lerAuditoria(): Auditoria {
  // Sempre um objeto novo: o padrão nunca pode ser compartilhado (e mutado).
  return storage.lerAuditoria<Auditoria>({ incidentes: [], respostas: [] });
}

export function registrarIncidente(tipo: TipoIncidente, detalhe: string): void {
  const a = lerAuditoria();
  a.incidentes.push({ tipo, detalhe, quando: new Date().toISOString() });
  storage.salvarAuditoria(a);
}

export function registrarResposta(r: Omit<RegistroResposta, 'quando'>): void {
  const a = lerAuditoria();
  a.respostas.push({ ...r, quando: new Date().toISOString() });
  storage.salvarAuditoria(a);
}

export function contarIncidentes(): number {
  return lerAuditoria().incidentes.length;
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function anonimizarTexto(texto: string, nome: string | undefined): string {
  if (!nome || !nome.trim()) return texto;
  const re = new RegExp(`(^|[^\\p{L}])${escaparRegex(nome.trim())}(?=$|[^\\p{L}])`, 'giu');
  return texto.replace(re, '$1[nome]');
}

/** Export anonimizado na origem: sem nome, sem identificadores de dispositivo. */
export function exportarAnonimizado(timeline: Mensagem[], nome: string | undefined, auditoria: Auditoria = lerAuditoria()) {
  const conversa = timeline.map((m) => {
    if (m.tipo === 'texto') {
      return {
        autor: m.autor,
        tipo: m.tipo,
        texto: anonimizarTexto(m.payload.texto, nome),
        selo: m.payload.selo,
        rota: m.payload.rota,
        dia: m.payload.dia,
      };
    }
    if (m.tipo === 'resumo_ferramenta') {
      return {
        autor: m.autor,
        tipo: m.tipo,
        nome: m.payload.nome,
        dispensada: m.payload.dispensada,
        dia: m.payload.dia,
        resultado: JSON.parse(anonimizarTexto(JSON.stringify(m.payload.resultado), nome)) as unknown,
      };
    }
    if (m.tipo === 'ferramenta') {
      return { autor: m.autor, tipo: m.tipo, nome: m.payload.nome, origem: m.payload.origem, dia: m.payload.dia };
    }
    return { autor: m.autor, tipo: m.tipo, texto: m.payload.texto };
  });

  return {
    exportado_em: new Date().toISOString(),
    anonimizado: true,
    fase: 'E5',
    conversa,
    incidentes: auditoria.incidentes.map((i) => ({ ...i, detalhe: anonimizarTexto(i.detalhe, nome) })),
    respostas: auditoria.respostas,
  };
}

export function baixarJson(nomeArquivo: string, conteudo: unknown): void {
  const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
