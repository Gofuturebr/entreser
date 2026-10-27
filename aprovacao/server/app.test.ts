import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp, tratarErros } from './app.ts';
import { criarArmazem } from './armazem.ts';
import { abrirBanco } from './db.ts';
import type { DetalheConteudo, ProjetoAdmin, ResultadoUpload, ResumoLote, Revisora } from './tipos.ts';

const exemplo = resolve(import.meta.dirname, '..', 'exemplo');
const SENHA = 'segredo';
let base = '';
let dataDir = '';
let fechar: () => void = () => undefined;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'aprov-app-'));
  const banco = abrirBanco(join(dataDir, 'db.sqlite'));
  const app = criarApp({ banco, armazem: criarArmazem(dataDir, banco), senhaAdmin: SENHA, dataDir });
  app.use(tratarErros);
  const servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  fechar = () => {
    servidor.close();
    banco.fechar();
    rmSync(dataDir, { recursive: true, force: true });
  };
});
afterAll(() => fechar());

const admin = (caminho: string, init: RequestInit = {}) =>
  fetch(base + caminho, { ...init, headers: { 'x-admin-senha': SENHA, ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...init.headers } });
const json = (caminho: string, metodo: string, corpo: unknown) =>
  fetch(base + caminho, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });

function zipDe(pasta: string, destino: string): string {
  const z = new AdmZip();
  z.addLocalFolder(pasta);
  z.writeZip(destino);
  return destino;
}

async function enviar(slug: string, arquivos: { zip?: string; planilhas?: string[] }, lote?: string) {
  const form = new FormData();
  if (lote) form.append('lote', lote);
  if (arquivos.zip) form.append('zip', new Blob([readFileSync(arquivos.zip)]), 'lote.zip');
  for (const p of arquivos.planilhas ?? []) form.append('planilhas', new Blob([readFileSync(p)]), basename(p));
  return admin(`/api/admin/projetos/${slug}/upload`, { method: 'POST', body: form });
}

describe('fluxo de aprovação', () => {
  let slug = '';
  let ana: Revisora;

  it('admin exige senha', async () => {
    expect((await fetch(`${base}/api/admin/projetos`)).status).toBe(401);
    expect((await json('/api/admin/entrar', 'POST', { senha: 'errada' })).status).toBe(401);
    expect((await json('/api/admin/entrar', 'POST', { senha: SENHA })).status).toBe(200);
  });

  it('cria projeto, sobe o lote JSON e cadastra revisoras', async () => {
    const p = (await (await admin('/api/admin/projetos', { method: 'POST', body: JSON.stringify({ nome: 'Cliente Exemplo' }) })).json()) as ProjetoAdmin;
    slug = p.slug;
    expect(slug).toMatch(/^cliente-exemplo-[0-9a-f]{6}$/);

    const r = await enviar(slug, { zip: zipDe(join(exemplo, 'lote-exemplo'), join(dataDir, 'l.zip')) });
    const up = (await r.json()) as ResultadoUpload;
    expect(up).toMatchObject({ tipo: 'lote', chave: 'f1', manifesto: 'json', conteudos: 4, avisos: [] });

    for (const nome of ['Ana', 'Carla'])
      await admin(`/api/admin/projetos/${slug}/revisoras`, { method: 'POST', body: JSON.stringify({ nome }) });
    const pub = (await (await fetch(`${base}/api/p/${slug}`)).json()) as { revisoras: Revisora[] };
    expect(pub.revisoras.map((x) => x.nome)).toEqual(['Ana', 'Carla']);
    ana = pub.revisoras[0]!;
  });

  it('revisora aponta ajuste numa imagem e decide', async () => {
    const d0 = (await (await fetch(`${base}/api/p/${slug}/l/f1/c/C1.1`)).json()) as DetalheConteudo;
    const img = d0.conteudo.imagens[2]!;
    const r = await json(`/api/p/${slug}/l/f1/c/C1.1/apontamentos`, 'POST', { revisoraId: ana.id, alvo: 'imagem', imagem: img, texto: 'Trocar a cor de fundo' });
    expect(r.status).toBe(201);
    await json(`/api/p/${slug}/l/f1/c/C1.1/apontamentos`, 'POST', { revisoraId: ana.id, alvo: 'texto', texto: 'Encurtar a introdução' });
    await json(`/api/p/${slug}/l/f1/c/C1.2/decisao`, 'PUT', { revisoraId: ana.id, status: 'aprovado' });

    const lotes = (await (await fetch(`${base}/api/p/${slug}/lotes`)).json()) as ResumoLote[];
    expect(lotes[0]!.conteudos['C1.1']).toMatchObject({ status: 'ajustes', abertos: 2 });
    expect(lotes[0]!.conteudos['C1.2']).toMatchObject({ status: 'aprovado' });
    expect(lotes[0]!.conteudos['C2.1']).toMatchObject({ status: 'pendente' });
  });

  it('recusa revisora desconhecida, texto vazio e imagem fora do conteúdo', async () => {
    const url = `/api/p/${slug}/l/f1/c/C1.1/apontamentos`;
    expect((await json(url, 'POST', { revisoraId: 999, alvo: 'texto', texto: 'x' })).status).toBe(400);
    expect((await json(url, 'POST', { revisoraId: ana.id, alvo: 'texto', texto: '  ' })).status).toBe(400);
    expect((await json(url, 'POST', { revisoraId: ana.id, alvo: 'imagem', imagem: '../x.jpg', texto: 'x' })).status).toBe(400);
  });

  it('serve peça em sandbox e esconde rastro de produção', async () => {
    const d = (await (await fetch(`${base}/api/p/${slug}/l/f1/c/C1.1`)).json()) as DetalheConteudo;
    const peca = await fetch(`${base}/arquivos/${slug}/f1/${d.conteudo.pecas[0]!.html}`);
    expect(peca.status).toBe(200);
    expect(peca.headers.get('content-security-policy')).toContain('sandbox');
    const img = await fetch(`${base}/arquivos/${slug}/f1/${encodeURI(d.conteudo.imagens[0]!)}`);
    expect(img.headers.get('content-type')).toBe('image/jpeg');
    expect((await fetch(`${base}/arquivos/${slug}/f1/${d.conteudo.pasta}/_mapa.md`)).status).toBe(404);
    expect((await fetch(`${base}/arquivos/${slug}/f1/..%2F..%2Faprovacao.db`)).status).toBe(404);
  });

  it('reenviar um conteúdo isolado marca decisões antigas como desatualizadas e mantém apontamentos', async () => {
    await json(`/api/p/${slug}/l/f1/c/C1.1/decisao`, 'PUT', { revisoraId: ana.id, status: 'ajustes' });
    await new Promise((r) => setTimeout(r, 5));
    const pasta = mkdtempSync(join(dataDir, 'iso-'));
    const z = new AdmZip();
    z.addLocalFolder(join(exemplo, 'lote-exemplo/TR-ENT/t1-luz-e-agua/C1.1-quanta-luz-cada-planta-pede'));
    z.updateFile('texto.md', Buffer.from('Texto revisado.'));
    z.writeZip(join(pasta, 'c.zip'));
    const up = (await (await enviar(slug, { zip: join(pasta, 'c.zip') })).json()) as ResultadoUpload;
    expect(up).toMatchObject({ tipo: 'conteudo', chave: 'f1', atualizados: ['C1.1'] });

    const d = (await (await fetch(`${base}/api/p/${slug}/l/f1/c/C1.1`)).json()) as DetalheConteudo;
    expect(d.conteudo.texto).toBe('Texto revisado.');
    expect(d.apontamentos).toHaveLength(2);
    expect(d.resumo.decisoes[0]).toMatchObject({ status: 'ajustes', desatualizada: true });
    // Só o texto mudou: ele vai para a v2; peça e imagens continuam na v1.
    expect(d.resumo.versao).toBe(2);
    expect(d.itens.texto!.versao).toBe(2);
    expect(d.itens[`imagem:${d.conteudo.imagens[0]}`]!.versao).toBe(1);
    expect(d.apontamentos.find((a) => a.alvo === 'texto')).toMatchObject({ versao: 1, versaoAtual: 2 });
    expect(d.apontamentos.find((a) => a.alvo === 'imagem')).toMatchObject({ versao: 1, versaoAtual: 1 });
  });

  it('"Aprovado" num item guarda a versão e vira "versão anterior" quando a imagem é corrigida', async () => {
    const url = `/api/p/${slug}/l/f1/c/C1.1/itens`;
    const d0 = (await (await fetch(`${base}/api/p/${slug}/l/f1/c/C1.1`)).json()) as DetalheConteudo;
    const item = `imagem:${d0.conteudo.imagens[0]}`;
    const d1 = (await (await json(url, 'PUT', { revisoraId: ana.id, item, aprovado: true })).json()) as DetalheConteudo;
    expect(d1.itens[item]!.aprovacoes).toMatchObject([{ revisora: 'Ana', versao: 1, desatualizada: false }]);
    expect((await json(url, 'PUT', { revisoraId: ana.id, item: 'imagem:inventada.jpg', aprovado: true })).status).toBe(400);

    const pasta = mkdtempSync(join(dataDir, 'img-'));
    const z = new AdmZip();
    z.addLocalFolder(join(exemplo, 'lote-exemplo/TR-ENT/t1-luz-e-agua/C1.1-quanta-luz-cada-planta-pede'));
    z.updateFile('texto.md', Buffer.from('Texto revisado.'));
    z.updateFile('imagens/quanta-luz-01.jpg', readFileSync(join(exemplo, 'lote-exemplo/TR-PRA/t2-primeiros-vasos/C2.1-montando-o-primeiro-vaso/imagens/montando-o-01.jpg')));
    z.writeZip(join(pasta, 'c.zip'));
    expect(((await (await enviar(slug, { zip: join(pasta, 'c.zip') })).json()) as ResultadoUpload).atualizados).toEqual(['C1.1']);

    const d2 = (await (await fetch(`${base}/api/p/${slug}/l/f1/c/C1.1`)).json()) as DetalheConteudo;
    expect(d2.resumo.versao).toBe(3);
    expect(d2.itens.texto!.versao).toBe(2);
    expect(d2.itens[item]).toMatchObject({ versao: 2, aprovacoes: [{ versao: 1, desatualizada: true }] });

    const d3 = (await (await json(url, 'PUT', { revisoraId: ana.id, item, aprovado: false })).json()) as DetalheConteudo;
    expect(d3.itens[item]!.aprovacoes).toEqual([]);
  });

  it('sobe lote por planilha + ZIP de pastas e depois troca só a planilha', async () => {
    const pasta = mkdtempSync(join(dataDir, 'pl-'));
    const zip = zipDe(join(exemplo, 'planilha-exemplo/pastas'), join(pasta, 'pastas.zip'));
    const planilha = join(exemplo, 'planilha-exemplo/Planilha-exemplo.xlsx');
    const up = (await (await enviar(slug, { zip, planilhas: [planilha] }, 'Entender e Praticar')).json()) as ResultadoUpload;
    expect(up).toMatchObject({ tipo: 'lote', chave: 'entender-e-praticar', manifesto: 'planilha', conteudos: 4 });

    const so = (await (await enviar(slug, { planilhas: [planilha] }, 'entender-e-praticar')).json()) as ResultadoUpload;
    expect(so).toMatchObject({ chave: 'entender-e-praticar', nome: 'Entender e Praticar', atualizados: [] });
    const d = (await (await fetch(`${base}/api/p/${slug}/l/entender-e-praticar/c/C1.1`)).json()) as DetalheConteudo;
    expect(d.conteudo.imagens).toHaveLength(4); // arquivos do envio anterior continuam
  });

  it('conteúdo isolado com ID em dois lotes pede a escolha do lote', async () => {
    const pasta = mkdtempSync(join(dataDir, 'amb-'));
    const zip = zipDe(join(exemplo, 'lote-exemplo/TR-ENT/t1-luz-e-agua/C1.2-regar-sem-afogar'), join(pasta, 'c.zip'));
    const r = await enviar(slug, { zip });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { erro: string }).erro).toMatch(/mais de um lote/);
    const ok = (await (await enviar(slug, { zip }, 'f1')).json()) as ResultadoUpload;
    expect(ok).toMatchObject({ tipo: 'conteudo', chave: 'f1' });
  });

  it('upload sem manifesto devolve mensagem clara', async () => {
    const pasta = mkdtempSync(join(dataDir, 'vazio-'));
    writeFileSync(join(pasta, 'leia.txt'), 'nada');
    const r = await enviar(slug, { zip: zipDe(pasta, join(dataDir, 'vazio.zip')) });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { erro: string }).erro).toMatch(/planilha/i);
  });

  it('exporta apontamentos em Markdown e CSV', async () => {
    const md = await (await admin(`/api/admin/projetos/${slug}/exportar?formato=md`)).text();
    expect(md).toContain('### C1.1 · Quanta luz cada planta pede');
    expect(md).toContain('**Imagem quanta-luz-03.jpg** · Ana');
    expect(md).toMatch(/\*\*Texto\*\* · Ana · .* · v1 \(já há v2\)/);
    const bytes = Buffer.from(await (await admin(`/api/admin/projetos/${slug}/exportar?formato=csv`)).arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM: acentos certos no Excel
    const csv = bytes.toString('utf8');
    expect(csv).toContain('C1.1;Quanta luz cada planta pede;Entender;Luz e água;Texto;;Ana');
  });

  it('resolver apontamento tira da contagem de abertos', async () => {
    const aps = (await (await admin(`/api/admin/projetos/${slug}/apontamentos`)).json()) as { id: number }[];
    for (const a of aps) await admin(`/api/admin/projetos/${slug}/apontamentos/${a.id}`, { method: 'PATCH', body: JSON.stringify({ resolvido: true }) });
    const lotes = (await (await fetch(`${base}/api/p/${slug}/lotes`)).json()) as ResumoLote[];
    expect(lotes.find((l) => l.chave === 'f1')!.conteudos['C1.1']!.abertos).toBe(0);
  });

  it('lote com uma planilha por trilha: envia junto, atualiza uma e tira outra', async () => {
    const pasta = mkdtempSync(join(dataDir, 'trilhas-'));
    const zip = zipDe(join(exemplo, 'planilha-exemplo/pastas'), join(pasta, 'pastas.zip'));
    const entender = join(exemplo, 'planilhas-por-trilha/Conteudos-Entender.xlsx');
    const praticar = join(exemplo, 'planilhas-por-trilha/Conteudos-Praticar.xlsx');
    const up = (await (await enviar(slug, { zip, planilhas: [entender, praticar] }, 'Trilhas separadas')).json()) as ResultadoUpload;
    expect(up).toMatchObject({ chave: 'trilhas-separadas', manifesto: 'planilha', conteudos: 4, avisos: [] });

    const lotes = async () => ((await (await fetch(`${base}/api/p/${slug}/lotes`)).json()) as ResumoLote[]).find((l) => l.chave === 'trilhas-separadas')!;
    expect((await lotes()).trilhas.map((t) => t.titulo)).toEqual(['Entender', 'Praticar']);

    // Reenviar só uma planilha (mesmo nome) mantém a outra.
    expect(((await (await enviar(slug, { planilhas: [praticar] }, 'trilhas-separadas')).json()) as ResultadoUpload).conteudos).toBe(4);
    const proj = (await (await admin(`/api/admin/projetos/${slug}`)).json()) as ProjetoAdmin;
    expect(proj.lotes.find((l) => l.chave === 'trilhas-separadas')!.planilhas).toEqual(['Conteudos-Entender.xlsx', 'Conteudos-Praticar.xlsx']);

    // Tirar uma planilha tira a trilha dela.
    const r = await admin(`/api/admin/projetos/${slug}/lotes/trilhas-separadas/planilhas/Conteudos-Praticar.xlsx`, { method: 'DELETE' });
    expect(((await r.json()) as ResultadoUpload).conteudos).toBe(2);
    expect((await lotes()).trilhas.map((t) => t.titulo)).toEqual(['Entender']);
    const ultima = await admin(`/api/admin/projetos/${slug}/lotes/trilhas-separadas/planilhas/Conteudos-Entender.xlsx`, { method: 'DELETE' });
    expect(ultima.status).toBe(400);
  });
});
