// Exportação dos apontamentos em Markdown (para colar numa sessão de ajuste)
// e CSV (para planilha; separador ";" e BOM para abrir certo no Excel).
import { posix } from 'node:path';
import type { DecisaoLinha } from './db.ts';
import type { Apontamento, Lote } from './tipos.ts';

const FUSO = process.env.FUSO ?? 'America/Sao_Paulo';
const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ROTULO_ALVO = { texto: 'Texto', formato: 'Formato', imagem: 'Imagem' } as const;
const ROTULO_DECISAO = { aprovado: 'aprovou', ajustes: 'pediu ajustes' } as const;

type Entrada = {
  projeto: string;
  lotes: Lote[];
  apontamentos: Apontamento[];
  decisoes: DecisaoLinha[];
};

/** Conteúdos na ordem do lote (trilha › tema › item), sem repetir os que aparecem por referência. */
function emOrdem(l: Lote) {
  const vistos = new Set<string>();
  const out: { id: string; trilha: string; tema: string }[] = [];
  for (const t of l.trilhas)
    for (const tema of t.temas)
      for (const i of tema.itens)
        if (!i.ref && !vistos.has(i.id)) {
          vistos.add(i.id);
          out.push({ id: i.id, trilha: t.titulo, tema: tema.titulo });
        }
  return out;
}

const alvo = (a: Apontamento) => (a.alvo === 'imagem' && a.imagem ? `Imagem ${posix.basename(a.imagem)}` : ROTULO_ALVO[a.alvo]);

export function exportarMarkdown(e: Entrada): string {
  const linhas = [`# Apontamentos · ${e.projeto}`, '', `Exportado em ${data(new Date().toISOString())} · ${e.apontamentos.length} apontamento(s)`, ''];
  for (const l of e.lotes) {
    const doLote = e.apontamentos.filter((a) => a.lote === l.chave);
    const decisoesLote = e.decisoes.filter((d) => d.lote === l.chave);
    const blocos: string[] = [];
    for (const { id, trilha, tema } of emOrdem(l)) {
      const aps = doLote.filter((a) => a.conteudoId === id);
      const decs = decisoesLote.filter((d) => d.conteudoId === id);
      if (aps.length === 0 && !decs.some((d) => d.status === 'ajustes')) continue;
      const c = l.conteudos[id];
      blocos.push(`### ${id} · ${c?.titulo ?? ''}`, '', `${trilha} › ${tema}`);
      if (decs.length) blocos.push('', `Decisões: ${decs.map((d) => `${d.revisora} ${ROTULO_DECISAO[d.status]} (${data(d.em)})`).join(' · ')}`);
      blocos.push('');
      for (const a of aps)
        blocos.push(`- **${alvo(a)}** · ${a.revisora} · ${data(a.criadoEm)}${a.resolvidoEm ? ' · resolvido' : ''}`, `  ${a.texto.replace(/\n+/g, '\n  ')}`);
      blocos.push('');
    }
    if (blocos.length) linhas.push(`## ${l.nome}`, '', ...blocos);
  }
  return linhas.join('\n');
}

const celula = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function exportarCsv(e: Entrada): string {
  const cab = ['Lote', 'ID', 'Título', 'Trilha', 'Tema', 'Alvo', 'Imagem', 'Revisora', 'Data', 'Apontamento', 'Resolvido em'];
  const linhas = [cab.join(';')];
  for (const l of e.lotes)
    for (const { id, trilha, tema } of emOrdem(l))
      for (const a of e.apontamentos.filter((x) => x.lote === l.chave && x.conteudoId === id))
        linhas.push(
          [
            l.nome, id, l.conteudos[id]?.titulo ?? '', trilha, tema, ROTULO_ALVO[a.alvo],
            a.imagem ? posix.basename(a.imagem) : '', a.revisora, data(a.criadoEm), a.texto, a.resolvidoEm ? data(a.resolvidoEm) : '',
          ].map(celula).join(';'),
        );
  return `\uFEFF${linhas.join('\r\n')}\r\n`;
}
