// Onde os lotes moram em disco e como um upload vira lote instalado.
// data/projetos/<slug>/<chave-do-lote>/  ← lote extraído (manifesto + pastas)
import { createHash } from 'node:crypto';
import {
  copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import type { Banco, ProjetoLinha } from './db.ts';
import { ITEM_TEXTO, itemImagem, itemPeca } from './itens.ts';
import { ARQUIVO_PLANILHA, PASTA_PLANILHAS, lerLote, planilhasDoLote, slug } from './lote.ts';
import type { Conteudo, Lote, ResultadoUpload } from './tipos.ts';
import { extrairZip } from './zip.ts';

export type Upload = {
  projeto: ProjetoLinha;
  /** Nome digitado no admin ou chave de um lote existente. */
  lote?: string | undefined;
  /** Uma planilha por trilha, se for o caso. Mesmo nome de arquivo = substitui aquela planilha. */
  planilhas?: { caminho: string; nome: string }[] | undefined;
  zip?: string | undefined;
};

export type Armazem = ReturnType<typeof criarArmazem>;

export function criarArmazem(dataDir: string, banco: Banco) {
  const raizProjetos = join(dataDir, 'projetos');
  const raizTmp = join(dataDir, 'tmp');
  mkdirSync(raizProjetos, { recursive: true });
  rmSync(raizTmp, { recursive: true, force: true });
  mkdirSync(raizTmp, { recursive: true });

  const cache = new Map<string, Promise<Lote>>();
  const dirProjeto = (slugProjeto: string) => join(raizProjetos, slugProjeto);
  const dirLote = (slugProjeto: string, chave: string) => join(dirProjeto(slugProjeto), chave);

  function lote(slugProjeto: string, chave: string): Promise<Lote> {
    const k = `${slugProjeto}/${chave}`;
    let p = cache.get(k);
    if (!p) {
      p = lerLote(dirLote(slugProjeto, chave), chave);
      p.catch(() => cache.delete(k));
      cache.set(k, p);
    }
    return p;
  }

  /** Troca a pasta de destino pela nova de uma vez; a antiga só some depois. */
  function substituir(nova: string, destino: string): void {
    const antiga = `${destino}.antiga-${Date.now()}`;
    if (existsSync(destino)) renameSync(destino, antiga);
    mkdirSync(join(destino, '..'), { recursive: true });
    renameSync(nova, destino);
    rmSync(antiga, { recursive: true, force: true });
  }

  const sha1 = (dados: string | Buffer) => createHash('sha1').update(dados).digest('hex');

  /** Hash de cada item que a revisora vê: os textos juntos, cada peça e cada imagem. */
  function hashesDosItens(dir: string, c: Conteudo): Map<string, string> {
    const textos = [
      c.titulo, c.objetivo, c.introducao, c.conteudoPlanejado, c.texto ?? '', c.formato, c.duracao,
      c.tags.join('|'), c.relacionados, c.chancela, c.observacoes, c.modificacao,
    ];
    const m = new Map<string, string>([[ITEM_TEXTO, sha1(JSON.stringify(textos))]]);
    for (const p of c.pecas) m.set(itemPeca(p.html), sha1(readFileSync(join(dir, p.html))));
    for (const i of c.imagens) m.set(itemImagem(i), sha1(readFileSync(join(dir, i))));
    return m;
  }

  /** Registra a versão do conteúdo e de cada item; devolve true se o conteúdo mudou. */
  function registrarConteudo(projetoId: number, chave: string, dir: string, c: Conteudo): boolean {
    const itens = hashesDosItens(dir, c);
    for (const [item, hash] of itens) banco.registrarVersaoItem(projetoId, chave, c.id, item, hash);
    return banco.registrarVersao(projetoId, chave, c.id, sha1(JSON.stringify([...itens])));
  }

  function registrarVersoes(projetoId: number, l: Lote, dir: string, existia: boolean): string[] {
    const atualizados: string[] = [];
    for (const c of Object.values(l.conteudos))
      if (registrarConteudo(projetoId, l.chave, dir, c) && existia) atualizados.push(c.id);
    return atualizados;
  }

  async function instalar(u: Upload): Promise<ResultadoUpload> {
    const tmp = mkdtempSync(join(raizTmp, 'up-'));
    try {
      const novo = join(tmp, 'lote');
      if (u.zip) extrairZip(u.zip, novo);
      else mkdirSync(novo, { recursive: true });

      if (existsSync(join(novo, 'trilhas.json'))) return await instalarLoteJson(u, novo);
      if (existsSync(join(novo, 'conteudo.json')) && !u.planilhas?.length) return await instalarConteudoIsolado(u, novo);
      return await instalarLotePlanilha(u, novo);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  async function concluir(u: Upload, novo: string, chave: string, nome: string, avisosExtras: string[]): Promise<ResultadoUpload> {
    const l = await lerLote(novo, chave); // manifesto inválido para aqui, sem tocar no lote atual
    const destino = dirLote(u.projeto.slug, chave);
    const existia = banco.lotes(u.projeto.id).some((x) => x.chave === chave);
    substituir(novo, destino);
    cache.delete(`${u.projeto.slug}/${chave}`);
    banco.salvarLote(u.projeto.id, chave, nome, l.manifesto);
    const atualizados = registrarVersoes(u.projeto.id, l, destino, existia);
    return {
      tipo: 'lote',
      chave,
      nome,
      manifesto: l.manifesto,
      conteudos: Object.keys(l.conteudos).length,
      atualizados,
      avisos: [...avisosExtras, ...l.avisos],
    };
  }

  async function instalarLoteJson(u: Upload, novo: string): Promise<ResultadoUpload> {
    const trilhas = JSON.parse(readFileSync(join(novo, 'trilhas.json'), 'utf8')) as { lote?: { nome?: string; fase?: string } };
    const chave = slug(u.lote || trilhas.lote?.fase || 'lote') || 'lote';
    const nome = trilhas.lote?.nome || u.lote || chave;
    const avisos = u.planilhas?.length ? ['As planilhas foram ignoradas: o ZIP já traz o manifesto trilhas.json.'] : [];
    return concluir(u, novo, chave, nome, avisos);
  }

  /** Nome com que a planilha fica guardada: é ele que diz qual planilha um novo envio substitui. */
  const nomePlanilha = (n: string) => {
    const base = basename(n.replace(/\\/g, '/')).replace(/[<>:"/\\|?*]/g, '').replace(/^[._~$]+/, '').trim() || 'planilha';
    return /\.xlsx$/i.test(base) ? base : `${base}.xlsx`;
  };

  /** Nomes das planilhas de um lote (lotes antigos, de planilha única, aparecem com o nome do lote). */
  function planilhas(slugProjeto: string, chave: string, nomeLote: string): string[] {
    return planilhasDoLote(dirLote(slugProjeto, chave)).map((r) => (r === ARQUIVO_PLANILHA ? nomePlanilha(nomeLote) : basename(r)));
  }

  async function instalarLotePlanilha(u: Upload, novo: string): Promise<ResultadoUpload> {
    const xlsxNoZip = readdirSync(novo).filter((n) => /\.xlsx$/i.test(n) && !n.startsWith('~$') && n !== ARQUIVO_PLANILHA);
    const enviadas = [
      ...(u.planilhas ?? []).map((p) => ({ caminho: p.caminho, nome: nomePlanilha(p.nome) })),
      ...xlsxNoZip.map((n) => ({ caminho: join(novo, n), nome: nomePlanilha(n) })),
    ];
    const lotes = banco.lotes(u.projeto.id);
    const nomeBase = (u.lote || enviadas[0]?.nome)?.replace(/\.xlsx$/i, '').trim();
    if (!nomeBase)
      throw new Error('Escolha o lote que este ZIP atualiza, ou envie as planilhas junto: sem elas não sei quais conteúdos mostrar.');
    const anterior = lotes.find((l) => l.chave === nomeBase || l.nome === nomeBase || l.chave === slug(nomeBase));
    const chave = anterior?.chave ?? (slug(nomeBase) || 'lote');
    const dirAnterior = dirLote(u.projeto.slug, chave);

    // Sem ZIP, os arquivos do lote anterior continuam (troca-se só planilha).
    if (!u.zip && anterior && existsSync(dirAnterior)) cpSync(dirAnterior, novo, { recursive: true });

    // As planilhas do lote anterior continuam; uma enviada com o mesmo nome substitui a antiga.
    const pasta = join(novo, PASTA_PLANILHAS);
    mkdirSync(pasta, { recursive: true });
    if (anterior && existsSync(dirAnterior))
      for (const [i, nome] of planilhas(u.projeto.slug, chave, anterior.nome).entries()) {
        const origem = join(dirAnterior, planilhasDoLote(dirAnterior)[i] ?? '');
        if (!existsSync(join(pasta, nome))) copyFileSync(origem, join(pasta, nome));
      }
    rmSync(join(novo, ARQUIVO_PLANILHA), { force: true });
    for (const e of enviadas) copyFileSync(e.caminho, join(pasta, e.nome));
    for (const n of xlsxNoZip) rmSync(join(novo, n), { force: true });
    if (planilhasDoLote(novo).length === 0)
      throw new Error('Falta a planilha: envie o .xlsx junto (no campo das planilhas ou dentro do ZIP).');

    return concluir(u, novo, chave, anterior?.nome ?? nomeBase, []);
  }

  /** Tira uma planilha (e as trilhas que só ela trazia) de um lote com mais de uma. */
  async function removerPlanilha(projeto: ProjetoLinha, chave: string, nome: string): Promise<ResultadoUpload> {
    const info = banco.lotes(projeto.id).find((l) => l.chave === chave);
    if (!info) throw new Error('Lote não encontrado.');
    const dir = dirLote(projeto.slug, chave);
    const nomes = planilhas(projeto.slug, chave, info.nome);
    const i = nomes.indexOf(nome);
    const relativo = planilhasDoLote(dir)[i];
    if (i < 0 || !relativo) throw new Error('Esta planilha não está mais no lote; recarregue a página.');
    if (nomes.length === 1) throw new Error('É a única planilha deste lote. Para tirar o lote inteiro, use "remover" no lote.');

    const guardada = join(raizTmp, `planilha-${Date.now()}.xlsx`);
    renameSync(join(dir, relativo), guardada);
    let l: Lote;
    try {
      l = await lerLote(dir, chave);
    } catch (e) {
      renameSync(guardada, join(dir, relativo));
      throw e;
    }
    rmSync(guardada, { force: true });
    cache.delete(`${projeto.slug}/${chave}`);
    banco.tocarLote(projeto.id, chave);
    return {
      tipo: 'lote',
      chave,
      nome: info.nome,
      manifesto: l.manifesto,
      conteudos: Object.keys(l.conteudos).length,
      atualizados: registrarVersoes(projeto.id, l, dir, true),
      avisos: l.avisos,
    };
  }

  async function instalarConteudoIsolado(u: Upload, novo: string): Promise<ResultadoUpload> {
    const cj = JSON.parse(readFileSync(join(novo, 'conteudo.json'), 'utf8')) as { id?: string };
    const id = String(cj.id ?? '').trim();
    if (!id) throw new Error('O conteudo.json do ZIP não tem id.');

    const candidatos = banco.lotes(u.projeto.id).filter((l) => !u.lote || l.chave === u.lote || l.nome === u.lote);
    const comEsteId: typeof candidatos = [];
    for (const info of candidatos) if ((await lote(u.projeto.slug, info.chave)).conteudos[id]) comEsteId.push(info);
    if (comEsteId.length > 1)
      throw new Error(`${id} está em mais de um lote (${comEsteId.map((l) => l.nome).join(', ')}). Escolha no campo "Lote" qual deles atualizar.`);
    for (const info of comEsteId) {
      const atual = await lote(u.projeto.slug, info.chave);
      const c = atual.conteudos[id];
      if (!c) continue;
      const pasta = c.pasta ?? (atual.manifesto === 'planilha' ? id : null);
      if (!pasta) throw new Error(`${id} está no lote "${info.nome}", mas sem pasta: envie o lote completo.`);
      const dir = dirLote(u.projeto.slug, info.chave);
      substituir(novo, join(dir, pasta));
      cache.delete(`${u.projeto.slug}/${info.chave}`);
      const recarregado = await lote(u.projeto.slug, info.chave);
      const conteudo = recarregado.conteudos[id];
      const mudou = conteudo ? registrarConteudo(u.projeto.id, info.chave, dir, conteudo) : false;
      banco.tocarLote(u.projeto.id, info.chave);
      return {
        tipo: 'conteudo',
        chave: info.chave,
        nome: info.nome,
        manifesto: recarregado.manifesto,
        conteudos: 1,
        atualizados: mudou ? [id] : [],
        avisos: recarregado.avisos.filter((a) => a.startsWith(`${id}:`)),
      };
    }
    throw new Error(`${id} não está em nenhum lote deste projeto. Envie primeiro o lote completo (ou a planilha).`);
  }

  return {
    dirLote,
    lote,
    instalar,
    planilhas,
    removerPlanilha,
    removerProjeto(slugProjeto: string) {
      for (const k of cache.keys()) if (k.startsWith(`${slugProjeto}/`)) cache.delete(k);
      rmSync(dirProjeto(slugProjeto), { recursive: true, force: true });
    },
    removerLote(slugProjeto: string, chave: string) {
      cache.delete(`${slugProjeto}/${chave}`);
      rmSync(dirLote(slugProjeto, chave), { recursive: true, force: true });
    },
  };
}
