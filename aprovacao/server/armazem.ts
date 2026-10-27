// Onde os lotes moram em disco e como um upload vira lote instalado.
// data/projetos/<slug>/<chave-do-lote>/  ← lote extraído (manifesto + pastas)
import { createHash } from 'node:crypto';
import {
  copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Banco, ProjetoLinha } from './db.ts';
import { ARQUIVO_PLANILHA, lerLote, slug } from './lote.ts';
import type { Conteudo, Lote, ResultadoUpload } from './tipos.ts';
import { extrairZip } from './zip.ts';

export type Upload = {
  projeto: ProjetoLinha;
  /** Nome digitado no admin ou chave de um lote existente. */
  lote?: string | undefined;
  planilha?: { caminho: string; nome: string } | undefined;
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

  /** Hash do que a revisora vê: textos do manifesto + arquivos da peça, imagens e texto. */
  function hashConteudo(dir: string, c: Conteudo): string {
    const h = createHash('sha1');
    h.update(JSON.stringify({ ...c, pasta: undefined }));
    for (const r of [...c.pecas.map((p) => p.html), ...c.imagens]) {
      h.update(r);
      h.update(readFileSync(join(dir, r)));
    }
    return h.digest('hex');
  }

  function registrarVersoes(projetoId: number, l: Lote, dir: string, existia: boolean): string[] {
    const atualizados: string[] = [];
    for (const c of Object.values(l.conteudos))
      if (banco.registrarVersao(projetoId, l.chave, c.id, hashConteudo(dir, c)) && existia) atualizados.push(c.id);
    return atualizados;
  }

  async function instalar(u: Upload): Promise<ResultadoUpload> {
    const tmp = mkdtempSync(join(raizTmp, 'up-'));
    try {
      const novo = join(tmp, 'lote');
      if (u.zip) extrairZip(u.zip, novo);
      else mkdirSync(novo, { recursive: true });

      if (existsSync(join(novo, 'trilhas.json'))) return await instalarLoteJson(u, novo);
      if (existsSync(join(novo, 'conteudo.json')) && !u.planilha) return await instalarConteudoIsolado(u, novo);
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
    const avisos = u.planilha ? ['A planilha foi ignorada: o ZIP já traz o manifesto trilhas.json.'] : [];
    return concluir(u, novo, chave, nome, avisos);
  }

  async function instalarLotePlanilha(u: Upload, novo: string): Promise<ResultadoUpload> {
    const xlsxNoZip = readdirSync(novo).filter((n) => /\.xlsx$/i.test(n) && !n.startsWith('~$') && n !== ARQUIVO_PLANILHA);
    const lotes = banco.lotes(u.projeto.id);
    const nomeBase = (u.lote || (u.planilha ? u.planilha.nome : xlsxNoZip[0]))?.replace(/\.xlsx$/i, '').trim();
    if (!nomeBase)
      throw new Error('Escolha o lote que este ZIP atualiza, ou envie a planilha junto: sem ela não sei quais conteúdos mostrar.');
    const anterior = lotes.find((l) => l.chave === nomeBase || l.nome === nomeBase || l.chave === slug(nomeBase));
    const chave = anterior?.chave ?? (slug(nomeBase) || 'lote');
    const dirAnterior = dirLote(u.projeto.slug, chave);

    // Sem ZIP, os arquivos do lote anterior continuam (troca-se só a planilha).
    if (!u.zip && anterior && existsSync(dirAnterior)) cpSync(dirAnterior, novo, { recursive: true });

    const destinoPlanilha = join(novo, ARQUIVO_PLANILHA);
    const primeiraNoZip = xlsxNoZip[0];
    if (u.planilha) copyFileSync(u.planilha.caminho, destinoPlanilha);
    else if (primeiraNoZip) renameSync(join(novo, primeiraNoZip), destinoPlanilha);
    else if (!existsSync(destinoPlanilha) && existsSync(join(dirAnterior, ARQUIVO_PLANILHA)))
      copyFileSync(join(dirAnterior, ARQUIVO_PLANILHA), destinoPlanilha);
    if (!existsSync(destinoPlanilha))
      throw new Error('Falta a planilha: envie o .xlsx junto (no campo da planilha ou dentro do ZIP).');

    return concluir(u, novo, chave, anterior?.nome ?? nomeBase, []);
  }

  async function instalarConteudoIsolado(u: Upload, novo: string): Promise<ResultadoUpload> {
    const cj = JSON.parse(readFileSync(join(novo, 'conteudo.json'), 'utf8')) as { id?: string };
    const id = String(cj.id ?? '').trim();
    if (!id) throw new Error('O conteudo.json do ZIP não tem id.');

    const candidatos = banco.lotes(u.projeto.id).filter((l) => !u.lote || l.chave === u.lote || l.nome === u.lote);
    for (const info of candidatos) {
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
      const mudou = conteudo ? banco.registrarVersao(u.projeto.id, info.chave, id, hashConteudo(dir, conteudo)) : false;
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
