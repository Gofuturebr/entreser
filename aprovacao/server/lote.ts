// Leitura de um lote extraído em disco. Dois manifestos possíveis:
// - JSON do lote (trilhas.json → <trilha>/temas.json → conteudo.json), formato 1.1;
// - Planilha de Conteúdo (.xlsx, salva como _manifesto.xlsx), em que a coluna
//   Eixo vira a trilha, a coluna Trilha vira o tema e cada linha encontra a sua
//   pasta pelo ID no começo do nome (C7.2-… ou C7.2).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import type { Conteudo, Lote, Peca, Tema, Trilha } from './tipos.ts';

/** Pasta do lote onde ficam as planilhas (uma ou mais; não é servida). */
export const PASTA_PLANILHAS = '_planilhas';
/** Nome usado por lotes da primeira versão, com uma planilha só. */
export const ARQUIVO_PLANILHA = '_manifesto.xlsx';
const EXT_IMAGEM = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

type Json = Record<string, unknown>;

export async function lerLote(dir: string, chave: string): Promise<Lote> {
  if (existsSync(join(dir, 'trilhas.json'))) return lerLoteJson(dir, chave);
  const planilhas = planilhasDoLote(dir);
  if (planilhas.length > 0) return lerLotePlanilhas(dir, chave, planilhas);
  throw new Error('O lote não tem manifesto: envie um ZIP com trilhas.json na raiz ou a Planilha de Conteúdo (.xlsx).');
}

/** Planilhas do lote, em ordem alfabética (a ordem das trilhas segue a das planilhas). */
export function planilhasDoLote(dir: string): string[] {
  const pasta = join(dir, PASTA_PLANILHAS);
  const novas = existsSync(pasta)
    ? readdirSync(pasta)
        .filter((n) => /\.xlsx$/i.test(n) && !n.startsWith('~$') && !n.startsWith('.'))
        .sort(colator.compare)
        .map((n) => posix.join(PASTA_PLANILHAS, n))
    : [];
  return existsSync(join(dir, ARQUIVO_PLANILHA)) ? [ARQUIVO_PLANILHA, ...novas] : novas;
}

// ---------- utilitários ----------

export function texto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(texto).filter(Boolean).join(', ');
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (v instanceof Date) return v.toLocaleDateString('pt-BR');
  if (typeof v === 'object') return '';
  return String(v).trim();
}

function lista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(texto).filter(Boolean);
  const s = texto(v);
  return s ? s.split(/\s*[·,;]\s*/).filter(Boolean) : [];
}

function obj(v: unknown): Json {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

function lerJson(arquivo: string): Json {
  try {
    return obj(JSON.parse(readFileSync(arquivo, 'utf8')));
  } catch {
    throw new Error(`Não consegui ler ${arquivo.split(sep).slice(-3).join('/')}: o JSON está inválido.`);
  }
}

/** Junta caminhos relativos do lote, recusando qualquer coisa que saia da raiz. */
function rel(...partes: string[]): string | null {
  const junto = posix.normalize(partes.filter(Boolean).join('/').replace(/\\/g, '/'));
  if (junto.startsWith('..') || posix.isAbsolute(junto)) return null;
  return junto.replace(/^\.\//, '');
}

function existe(dir: string, relativo: string): boolean {
  const abs = resolve(dir, relativo);
  return (abs === dir || abs.startsWith(dir + sep)) && existsSync(abs);
}

const colator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function slug(s: string): string {
  return normalizar(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ---------- arquivos de uma pasta de conteúdo ----------

type Arquivos = Pick<Conteudo, 'texto' | 'pecas' | 'imagens'>;

/** Usa o bloco `arquivos` do conteudo.json quando existe; senão, procura na pasta. */
function arquivosDaPasta(dir: string, pasta: string, cj: Json, id: string, avisos: string[]): Arquivos {
  const arq = obj(cj.arquivos);
  if (Object.keys(arq).length === 0) return arquivosPorBusca(dir, pasta);

  const citado = (r: unknown): string | null => {
    const nome = texto(r);
    if (!nome) return null;
    const caminho = rel(pasta, nome);
    if (!caminho || !existe(dir, caminho)) {
      avisos.push(`${id}: arquivo citado e ausente: ${nome}`);
      return null;
    }
    return caminho;
  };

  const textoRel = citado(arq.texto);
  const pecas: Peca[] = [];
  const brutas = Array.isArray(arq.pecas) ? arq.pecas : arq.pecas ? [arq.pecas] : [];
  for (const p of brutas) {
    const o = obj(p);
    const html = citado(typeof p === 'string' ? p : o.html);
    if (html) pecas.push({ skin: texto(o.skin) || texto(cj.skin), html });
  }
  const imagens: string[] = [];
  for (const i of [arq.capa, ...(Array.isArray(arq.imagens) ? arq.imagens : [])]) {
    const caminho = citado(i);
    if (caminho && !imagens.includes(caminho)) imagens.push(caminho);
  }
  return { texto: textoRel ? readFileSync(join(dir, textoRel), 'utf8') : null, pecas, imagens };
}

function arquivosPorBusca(dir: string, pasta: string): Arquivos {
  const abs = join(dir, pasta);
  const visiveis = (d: string) =>
    existsSync(d) ? readdirSync(d).filter((n) => !n.startsWith('.') && !n.startsWith('_')) : [];
  const raiz = visiveis(abs).sort(colator.compare);

  const htmls = raiz.filter((n) => /\.html?$/i.test(n) && statSync(join(abs, n)).isFile());
  htmls.sort((a, b) => (a === 'peca.html' ? -1 : b === 'peca.html' ? 1 : colator.compare(a, b)));
  const pecas = htmls.map((n) => ({
    skin: n.replace(/\.html?$/i, '').replace(/^peca-?/, ''),
    html: posix.join(pasta, n),
  }));

  const imagens = [
    ...visiveis(join(abs, 'imagens'))
      .sort(colator.compare)
      .filter((n) => EXT_IMAGEM.test(n))
      .map((n) => posix.join(pasta, 'imagens', n)),
    ...raiz.filter((n) => EXT_IMAGEM.test(n)).map((n) => posix.join(pasta, n)),
  ];

  const md = raiz.find((n) => n.toLowerCase() === 'texto.md');
  return { texto: md ? readFileSync(join(abs, md), 'utf8') : null, pecas, imagens };
}

function duracao(cj: Json): string {
  if (typeof cj.duracao_min === 'number') return `${texto(cj.duracao_min)} min`;
  return texto(cj.duracao ?? cj.duracao_min);
}

// ---------- manifesto JSON ----------

async function lerLoteJson(dir: string, chave: string): Promise<Lote> {
  const raiz = lerJson(join(dir, 'trilhas.json'));
  const avisos: string[] = [];
  const conteudos: Record<string, Conteudo> = {};
  const trilhas: Trilha[] = [];
  const refs: { trilha: string; id: string }[] = [];

  for (const t of Array.isArray(raiz.trilhas) ? raiz.trilhas.map(obj) : []) {
    const trilhaId = texto(t.id);
    const pastaT = rel(texto(t.pasta) || trilhaId);
    if (!trilhaId || !pastaT) continue;
    const arquivoTemas = join(dir, pastaT, 'temas.json');
    const temasJson = existsSync(arquivoTemas) ? lerJson(arquivoTemas) : {};
    if (!existsSync(arquivoTemas)) avisos.push(`Trilha ${trilhaId}: não encontrei ${pastaT}/temas.json.`);

    const brutos = (Array.isArray(temasJson.temas) ? temasJson.temas.map(obj) : [])
      .map((tema, i) => ({ tema, ordem: typeof tema.ordem === 'number' ? tema.ordem : i }))
      .sort((a, b) => a.ordem - b.ordem);

    const temas: Tema[] = [];
    for (const { tema } of brutos) {
      const temaId = texto(tema.id);
      const pastaTema = rel(pastaT, texto(tema.pasta) || temaId);
      const itens: Tema['itens'] = [];
      for (const c of Array.isArray(tema.conteudos) ? tema.conteudos.map(obj) : []) {
        if (c.pasta && pastaTema) {
          const pasta = rel(pastaTema, texto(c.pasta));
          if (!pasta) continue;
          const conteudo = lerConteudoJson(dir, pasta, { ...c, trilha: trilhaId, tema: temaId }, avisos);
          if (conteudos[conteudo.id]) avisos.push(`${conteudo.id}: aparece com pasta em mais de um tema; usei a primeira.`);
          else conteudos[conteudo.id] = conteudo;
          itens.push({ id: conteudo.id, titulo: conteudo.titulo, ref: false });
        } else if (c.ref || c.id) {
          const id = texto(c.ref) || texto(c.id);
          itens.push({ id, titulo: texto(c.titulo), ref: true });
          refs.push({ trilha: trilhaId, id });
        }
      }
      temas.push({ id: temaId, titulo: texto(tema.titulo) || temaId, descricao: texto(tema.descricao_breve ?? tema.descricao), itens });
    }

    const capaNome = texto(t.capa);
    const capa = capaNome
      ? [rel(pastaT, capaNome), rel(capaNome)].find((c): c is string => !!c && existe(dir, c)) ?? null
      : null;
    trilhas.push({
      id: trilhaId,
      titulo: texto(t.titulo) || trilhaId,
      subtitulo: texto(t.subtitulo),
      descricao: texto(t.descricao),
      capa,
      temas,
    });
  }

  // Referências a conteúdos que não existem no lote saem da lista.
  for (const r of refs) {
    if (conteudos[r.id]) continue;
    avisos.push(`Trilha ${r.trilha}: referência a ${r.id}, que não está neste lote.`);
    for (const t of trilhas) for (const tema of t.temas) tema.itens = tema.itens.filter((i) => !(i.ref && i.id === r.id));
  }
  for (const t of trilhas) for (const tema of t.temas) for (const i of tema.itens) if (i.ref) i.titulo = conteudos[i.id]?.titulo ?? i.titulo;

  return { chave, nome: texto(obj(raiz.lote).nome) || chave, manifesto: 'json', trilhas, conteudos, avisos };
}

function lerConteudoJson(dir: string, pasta: string, doTema: Json, avisos: string[]): Conteudo {
  const arquivo = join(dir, pasta, 'conteudo.json');
  const cj = existsSync(arquivo) ? lerJson(arquivo) : {};
  const id = texto(cj.id) || texto(doTema.id);
  if (!existsSync(arquivo)) avisos.push(`${id}: a pasta ${pasta} não tem conteudo.json.`);
  if (!existsSync(join(dir, pasta))) avisos.push(`${id}: a pasta ${pasta} não está no ZIP.`);
  const peca = obj(cj.peca);
  return {
    id,
    trilhaId: texto(cj.trilha) || texto(doTema.trilha),
    temaId: texto(cj.tema) || texto(doTema.tema),
    titulo: texto(cj.titulo) || texto(doTema.titulo) || id,
    objetivo: texto(cj.objetivo ?? cj.descricao) || texto(doTema.descricao),
    introducao: texto(cj.introducao),
    conteudoPlanejado: texto(cj.conteudo_planejado ?? cj.conteudo),
    formato: texto(cj.formato_planejado ?? cj.formato) || texto(cj.skin),
    duracao: duracao(cj),
    tags: lista(cj.tags),
    relacionados: texto(cj.relacionados),
    chancela: texto(cj.chancela),
    observacoes: texto(cj.observacoes),
    modificacao: texto(cj.modificacao_pos_revisao ?? cj.modificacao),
    estado: texto(peca.estado),
    mensagem: texto(peca.mensagem),
    pasta,
    ...arquivosDaPasta(dir, pasta, cj, id, avisos),
  };
}

// ---------- manifesto Planilha ----------

type Coluna =
  | 'id' | 'tema' | 'eixo' | 'titulo' | 'objetivo' | 'introducao' | 'conteudo' | 'formato'
  | 'duracao' | 'relacionados' | 'tags' | 'chancela' | 'observacoes' | 'modificacao';

function coluna(cabecalho: string): Coluna | null {
  const h = normalizar(cabecalho);
  if (h === 'id') return 'id';
  if (h === 'trilha' || h === 'tema') return 'tema';
  if (h === 'eixo') return 'eixo';
  if (h.startsWith('titulo')) return 'titulo';
  if (h.startsWith('objetivo')) return 'objetivo';
  if (h.startsWith('introducao')) return 'introducao';
  if (h === 'conteudo') return 'conteudo';
  if (h.startsWith('formato')) return 'formato';
  if (h.startsWith('duracao')) return 'duracao';
  if (h.includes('relacionad')) return 'relacionados';
  if (h === 'tags') return 'tags';
  if (h.startsWith('chancela')) return 'chancela';
  if (h.startsWith('observ')) return 'observacoes';
  if (h.startsWith('modificac')) return 'modificacao';
  return null;
}

type Celulas = unknown[];

/** Acha a linha de cabeçalho (até a 10ª) que tem a coluna ID e devolve o mapa de colunas. */
function cabecalho(linhas: Celulas[]): { inicio: number; mapa: Map<Coluna, number> } | null {
  for (let i = 0; i < Math.min(linhas.length, 10); i++) {
    const mapa = new Map<Coluna, number>();
    (linhas[i] ?? []).forEach((c, j) => {
      const k = coluna(texto(c));
      if (k && !mapa.has(k)) mapa.set(k, j);
    });
    if (mapa.has('id') && (mapa.has('titulo') || mapa.has('tema'))) return { inicio: i + 1, mapa };
  }
  return null;
}

/** "Entender (Corpo)" → { titulo: "Entender", subtitulo: "Corpo" } */
function eixo(s: string): { titulo: string; subtitulo: string } {
  const m = s.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { titulo: m[1] ?? s, subtitulo: m[2] ?? '' } : { titulo: s, subtitulo: '' };
}

/** Índice ID → pasta, procurando pastas cujo nome começa com o ID. */
function indicePastas(dir: string): Map<string, string> {
  const indice = new Map<string, string>();
  const visitar = (relativo: string, nivel: number) => {
    if (nivel > 6) return;
    for (const nome of readdirSync(join(dir, relativo)).sort(colator.compare)) {
      if (nome.startsWith('.') || nome.startsWith('_') || nome === 'templates') continue;
      const r = relativo ? posix.join(relativo, nome) : nome;
      if (!statSync(join(dir, r)).isDirectory()) continue;
      const candidato = nome.split('-')[0]?.trim().toUpperCase();
      if (candidato && !indice.has(candidato)) indice.set(candidato, r);
      const cj = join(dir, r, 'conteudo.json');
      if (existsSync(cj)) {
        const id = texto(obj(safeJson(cj)).id).toUpperCase();
        if (id && !indice.has(id)) indice.set(id, r);
      }
      visitar(r, nivel + 1);
    }
  };
  visitar('', 0);
  return indice;
}

function safeJson(arquivo: string): unknown {
  try {
    return JSON.parse(readFileSync(arquivo, 'utf8'));
  } catch {
    return {};
  }
}

type Aba = { sheet: string; data: Celulas[] };

/** Lê uma planilha e devolve a aba de conteúdos (com o cabeçalho) e os nomes de tema da aba "Trilhas". */
async function abrirPlanilha(arquivo: string, nome: string) {
  let abas: Aba[];
  try {
    abas = await readXlsxFile(arquivo);
  } catch {
    throw new Error(`Não consegui abrir a planilha "${nome}": confira se é um arquivo .xlsx válido.`);
  }

  const candidatas = [...abas].sort(
    (a, b) => Number(normalizar(b.sheet).startsWith('conteudo')) - Number(normalizar(a.sheet).startsWith('conteudo')),
  );
  let aba: { cab: NonNullable<ReturnType<typeof cabecalho>>; linhas: Celulas[] } | null = null;
  for (const a of candidatas) {
    const cab = cabecalho(a.data);
    if (cab) {
      aba = { cab, linhas: a.data };
      break;
    }
  }
  if (!aba) throw new Error(`A planilha "${nome}" não tem uma aba com as colunas ID e Título do conteúdo.`);

  // Aba opcional "Trilhas" da Planilha (na plataforma, os temas): ID + nome.
  const nomesTema = new Map<string, { titulo: string; descricao: string }>();
  const abaTemas = abas.find((a) => ['trilhas', 'temas'].includes(normalizar(a.sheet)));
  if (abaTemas) {
    const cab = abaTemas.data[0]?.map((c) => normalizar(texto(c))) ?? [];
    const iId = cab.indexOf('id');
    const iNome = cab.findIndex((c) => /^(titulo|nome|trilha|tema)/.test(c));
    const iDesc = cab.findIndex((c) => c.startsWith('descri'));
    if (iId >= 0 && iNome >= 0)
      for (const l of abaTemas.data.slice(1)) {
        const id = texto(l[iId]);
        if (id) nomesTema.set(id, { titulo: texto(l[iNome]), descricao: iDesc >= 0 ? texto(l[iDesc]) : '' });
      }
  }
  return { ...aba, nomesTema };
}

/**
 * Lote com uma ou mais planilhas (tipicamente uma por trilha/eixo). As linhas
 * de todas se somam: o Eixo de cada linha diz a trilha, e um mesmo Eixo em
 * planilhas diferentes vira uma trilha só.
 */
async function lerLotePlanilhas(dir: string, chave: string, planilhas: string[]): Promise<Lote> {
  const pastas = indicePastas(dir);
  const avisos: string[] = [];
  const conteudos: Record<string, Conteudo> = {};
  const origem = new Map<string, string>();
  const trilhas: Trilha[] = [];

  for (const relativo of planilhas) {
    const nome = posix.basename(relativo);
    const { cab, linhas, nomesTema } = await abrirPlanilha(join(dir, relativo), nome);
    const val = (l: Celulas, k: Coluna) => {
      const j = cab.mapa.get(k);
      return j === undefined ? '' : texto(l[j]);
    };

    for (const l of linhas.slice(cab.inicio)) {
      const id = val(l, 'id');
      if (!id) continue;
      if (conteudos[id]) {
        const primeira = origem.get(id);
        avisos.push(
          primeira === nome
            ? `${id}: aparece mais de uma vez na planilha "${nome}"; usei a primeira linha.`
            : `${id}: aparece nas planilhas "${primeira}" e "${nome}"; usei a de "${primeira}".`,
        );
        continue;
      }
      const eixoBruto = val(l, 'eixo') || nome.replace(/\.xlsx$/i, '');
      const trilhaId = slug(eixoBruto) || 'conteudos';
      let trilha = trilhas.find((t) => t.id === trilhaId);
      if (!trilha) {
        trilha = { id: trilhaId, ...eixo(eixoBruto), descricao: '', capa: null, temas: [] };
        trilhas.push(trilha);
      }
      const temaId = val(l, 'tema') || 'Sem tema';
      let tema = trilha.temas.find((t) => t.id === temaId);
      if (!tema) {
        const nomeTema = nomesTema.get(temaId);
        tema = { id: temaId, titulo: nomeTema?.titulo || temaId, descricao: nomeTema?.descricao ?? '', itens: [] };
        trilha.temas.push(tema);
      }

      const pasta = pastas.get(id.toUpperCase()) ?? null;
      const cj = pasta && existsSync(join(dir, pasta, 'conteudo.json')) ? obj(safeJson(join(dir, pasta, 'conteudo.json'))) : {};
      const arquivos: Arquivos = pasta ? arquivosDaPasta(dir, pasta, cj, id, avisos) : { texto: null, pecas: [], imagens: [] };
      const peca = obj(cj.peca);
      const titulo = val(l, 'titulo') || id;
      conteudos[id] = {
        id,
        trilhaId,
        temaId,
        titulo,
        objetivo: val(l, 'objetivo'),
        introducao: val(l, 'introducao'),
        conteudoPlanejado: val(l, 'conteudo'),
        formato: val(l, 'formato'),
        duracao: val(l, 'duracao'),
        tags: lista(val(l, 'tags')),
        relacionados: val(l, 'relacionados'),
        chancela: val(l, 'chancela'),
        observacoes: val(l, 'observacoes'),
        modificacao: val(l, 'modificacao'),
        estado: texto(peca.estado),
        mensagem: texto(peca.mensagem),
        pasta,
        ...arquivos,
      };
      origem.set(id, nome);
      tema.itens.push({ id, titulo, ref: false });
    }
  }

  if (Object.keys(conteudos).length === 0) throw new Error('As planilhas não têm nenhuma linha de conteúdo com ID.');
  return { chave, nome: chave, manifesto: 'planilha', trilhas, conteudos, avisos };
}
