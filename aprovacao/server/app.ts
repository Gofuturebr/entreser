import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { Armazem } from './armazem.ts';
import type { Banco, DecisaoLinha, ProjetoLinha } from './db.ts';
import { exportarCsv, exportarMarkdown } from './exportar.ts';
import { slug } from './lote.ts';
import type {
  Alvo, Apontamento, DetalheConteudo, Lote, ProjetoAdmin, ProjetoPublico, ResumoConteudo, ResumoLote, StatusDecisao,
} from './tipos.ts';

export class ErroUsuario extends Error {
  status = 400;
}
class NaoEncontrado extends ErroUsuario {
  status = 404;
}

type Opcoes = { banco: Banco; armazem: Armazem; senhaAdmin: string; dataDir: string };

const ALVOS: Alvo[] = ['texto', 'formato', 'imagem'];
const LIMITE_TEXTO = 5000;

function resumir(id: string, decisoes: DecisaoLinha[], apontamentos: Apontamento[], atualizadoEm: string | null): ResumoConteudo {
  const ds = decisoes
    .filter((d) => d.conteudoId === id)
    .map((d) => ({
      revisoraId: d.revisoraId,
      revisora: d.revisora,
      status: d.status,
      em: d.em,
      desatualizada: !!atualizadoEm && d.em < atualizadoEm,
    }));
  const abertos = apontamentos.filter((a) => a.conteudoId === id && !a.resolvidoEm).length;
  const validas = ds.filter((d) => !d.desatualizada);
  const status = abertos > 0 || validas.some((d) => d.status === 'ajustes') ? 'ajustes' : validas.some((d) => d.status === 'aprovado') ? 'aprovado' : 'pendente';
  return { status, decisoes: ds, abertos, atualizadoEm };
}

export function criarApp({ banco, armazem, senhaAdmin, dataDir }: Opcoes) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  // ---------- ajudantes ----------

  const projetoOu404 = (slugProjeto: string): ProjetoLinha => {
    const p = banco.projetoPorSlug(slugProjeto);
    if (!p) throw new NaoEncontrado('Projeto não encontrado. Confira o link com quem enviou.');
    return p;
  };

  const loteOu404 = async (p: ProjetoLinha, chave: string): Promise<Lote> => {
    if (!banco.lotes(p.id).some((l) => l.chave === chave)) throw new NaoEncontrado('Lote não encontrado.');
    return armazem.lote(p.slug, chave);
  };

  const param = (req: Request, nome: string) => String(req.params[nome] ?? '');

  const detalhe = async (p: ProjetoLinha, chave: string, id: string): Promise<DetalheConteudo> => {
    const l = await loteOu404(p, chave);
    const c = l.conteudos[id];
    if (!c) throw new NaoEncontrado('Conteúdo não encontrado neste lote.');
    const info = banco.lotes(p.id).find((x) => x.chave === chave);
    const trilha = l.trilhas.find((t) => t.id === c.trilhaId);
    const tema = trilha?.temas.find((t) => t.id === c.temaId);
    const apontamentos = banco.apontamentos(p.id, { lote: chave, conteudoId: id });
    const versao = banco.versoes(p.id, chave).get(id) ?? null;
    return {
      lote: { chave, nome: info?.nome ?? l.nome },
      conteudo: c,
      trilha: trilha ? { id: trilha.id, titulo: trilha.titulo } : null,
      tema: tema ? { id: tema.id, titulo: tema.titulo } : null,
      resumo: resumir(id, banco.decisoes(p.id, chave), apontamentos, versao),
      apontamentos,
    };
  };

  const revisoraValida = (p: ProjetoLinha, v: unknown): number => {
    const id = Number(v);
    if (!Number.isInteger(id) || !banco.revisoraAtiva(p.id, id))
      throw new ErroUsuario('Escolha de novo quem está revisando: este nome não está mais na lista.');
    return id;
  };

  // ---------- área das revisoras (sem login) ----------

  app.get('/api/p/:slug', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const corpo: ProjetoPublico = { nome: p.nome, slug: p.slug, revisoras: banco.revisoras(p.id) };
    res.json(corpo);
  });

  app.get('/api/p/:slug/lotes', async (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const todasDecisoes = banco.decisoes(p.id);
    const todosApontamentos = banco.apontamentos(p.id);
    const out: ResumoLote[] = [];
    for (const info of banco.lotes(p.id)) {
      let l: Lote;
      try {
        l = await armazem.lote(p.slug, info.chave);
      } catch (e) {
        console.error(`[lote ${p.slug}/${info.chave}]`, e);
        continue;
      }
      const decisoes = todasDecisoes.filter((d) => d.lote === info.chave);
      const aps = todosApontamentos.filter((a) => a.lote === info.chave);
      const versoes = banco.versoes(p.id, info.chave);
      const conteudos: ResumoLote['conteudos'] = {};
      for (const c of Object.values(l.conteudos))
        conteudos[c.id] = {
          titulo: c.titulo,
          formato: c.formato,
          temaId: c.temaId,
          trilhaId: c.trilhaId,
          ...resumir(c.id, decisoes, aps, versoes.get(c.id) ?? null),
        };
      out.push({ chave: info.chave, nome: info.nome, manifesto: info.manifesto, enviadoEm: info.enviadoEm, trilhas: l.trilhas, conteudos });
    }
    res.json(out);
  });

  app.get('/api/p/:slug/l/:lote/c/:id', async (req, res) => {
    res.json(await detalhe(projetoOu404(param(req, 'slug')), param(req, 'lote'), param(req, 'id')));
  });

  app.post('/api/p/:slug/l/:lote/c/:id/apontamentos', async (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const chave = param(req, 'lote');
    const id = param(req, 'id');
    const atual = await detalhe(p, chave, id);
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const revisoraId = revisoraValida(p, corpo.revisoraId);
    const alvo = corpo.alvo as Alvo;
    if (!ALVOS.includes(alvo)) throw new ErroUsuario('Tipo de apontamento desconhecido.');
    const texto = String(corpo.texto ?? '').trim();
    if (!texto) throw new ErroUsuario('Escreva o ajuste antes de enviar.');
    if (texto.length > LIMITE_TEXTO) throw new ErroUsuario(`O apontamento passa de ${LIMITE_TEXTO} caracteres; divida em partes.`);
    let imagem: string | null = null;
    if (alvo === 'imagem') {
      imagem = String(corpo.imagem ?? '');
      if (!atual.conteudo.imagens.includes(imagem)) throw new ErroUsuario('Esta imagem não está mais no conteúdo; recarregue a página.');
    }
    banco.criarApontamento({ projetoId: p.id, lote: chave, conteudoId: id, alvo, imagem, revisoraId, texto });
    res.status(201).json(await detalhe(p, chave, id));
  });

  app.put('/api/p/:slug/l/:lote/c/:id/decisao', async (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const chave = param(req, 'lote');
    const id = param(req, 'id');
    await detalhe(p, chave, id);
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const revisoraId = revisoraValida(p, corpo.revisoraId);
    const status = corpo.status === null ? null : (corpo.status as StatusDecisao);
    if (status !== null && status !== 'aprovado' && status !== 'ajustes') throw new ErroUsuario('Decisão desconhecida.');
    banco.decidir(p.id, chave, id, revisoraId, status);
    res.json(await detalhe(p, chave, id));
  });

  // Arquivos do lote (peças e imagens). Pastas e arquivos com "_" (rastro de
  // produção, planilha) não são servidos. O HTML da peça roda em sandbox.
  app.use('/arquivos/:slug/:lote', (req, res, next) => {
    const p = banco.projetoPorSlug(param(req, 'slug'));
    const chave = param(req, 'lote');
    if (!p || !banco.lotes(p.id).some((l) => l.chave === chave)) return next();
    let caminho: string;
    try {
      caminho = decodeURIComponent(req.path).replace(/^\/+/, '');
    } catch {
      return next();
    }
    if (!caminho || caminho.split('/').some((s) => s.startsWith('_') || s.startsWith('.'))) return next();
    if (/\.html?$/i.test(caminho)) res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-popups');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(caminho, { root: armazem.dirLote(p.slug, chave), dotfiles: 'deny', maxAge: '5m' }, (e) => {
      if (e && !res.headersSent) next();
    });
  });

  // ---------- admin (senha única) ----------

  const hashSenha = (s: string) => createHash('sha256').update(s).digest();
  const senhaCerta = hashSenha(senhaAdmin);
  const autorizado = (s: unknown) => typeof s === 'string' && timingSafeEqual(hashSenha(s), senhaCerta);

  app.post('/api/admin/entrar', (req, res) => {
    if (!autorizado((req.body as { senha?: unknown } | undefined)?.senha)) {
      res.status(401).json({ erro: 'Senha incorreta.' });
      return;
    }
    res.json({ ok: true });
  });

  app.use('/api/admin', (req, res, next) => {
    if (!autorizado(req.get('x-admin-senha'))) {
      res.status(401).json({ erro: 'Entre de novo com a senha do admin.' });
      return;
    }
    next();
  });

  const projetoAdmin = (p: ProjetoLinha): ProjetoAdmin => ({ ...p, lotes: banco.lotes(p.id) });

  app.get('/api/admin/projetos', (_req, res) => {
    res.json(banco.projetos().map(projetoAdmin));
  });

  app.post('/api/admin/projetos', (req, res) => {
    const nome = String((req.body as { nome?: unknown } | undefined)?.nome ?? '').trim();
    if (!nome) throw new ErroUsuario('Dê um nome ao projeto.');
    // Sufixo aleatório: o link das revisoras não é adivinhável a partir do nome.
    const s = `${slug(nome) || 'projeto'}-${randomBytes(3).toString('hex')}`;
    res.status(201).json(projetoAdmin(banco.criarProjeto(nome.slice(0, 120), s)));
  });

  app.get('/api/admin/projetos/:slug', (req, res) => {
    res.json(projetoAdmin(projetoOu404(param(req, 'slug'))));
  });

  app.delete('/api/admin/projetos/:slug', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    banco.removerProjeto(p.id);
    armazem.removerProjeto(p.slug);
    res.status(204).end();
  });

  const receber = multer({
    dest: join(dataDir, 'tmp'),
    limits: { fileSize: 2 * 1024 ** 3, files: 2 },
  }).fields([
    { name: 'planilha', maxCount: 1 },
    { name: 'zip', maxCount: 1 },
  ]);

  app.post('/api/admin/projetos/:slug/upload', receber, async (req, res) => {
    const arquivos = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
    const planilha = arquivos.planilha?.[0];
    const zip = arquivos.zip?.[0];
    try {
      const p = projetoOu404(param(req, 'slug'));
      if (!planilha && !zip) throw new ErroUsuario('Escolha a planilha (.xlsx), o ZIP com as pastas, ou os dois.');
      if (planilha && !/\.xlsx$/i.test(planilha.originalname)) throw new ErroUsuario('A planilha precisa ser um arquivo .xlsx.');
      if (zip && !/\.zip$/i.test(zip.originalname)) throw new ErroUsuario('As pastas precisam vir num arquivo .zip.');
      const lote = String((req.body as { lote?: unknown } | undefined)?.lote ?? '').trim() || undefined;
      try {
        res.json(
          await armazem.instalar({
            projeto: p,
            lote,
            planilha: planilha ? { caminho: planilha.path, nome: Buffer.from(planilha.originalname, 'latin1').toString('utf8') } : undefined,
            zip: zip?.path,
          }),
        );
      } catch (e) {
        if (e instanceof ErroUsuario) throw e;
        console.error('[upload]', e);
        throw new ErroUsuario(e instanceof Error ? e.message : 'Não consegui instalar o lote.');
      }
    } finally {
      for (const f of [planilha, zip]) if (f) rmSync(f.path, { force: true });
    }
  });

  app.delete('/api/admin/projetos/:slug/lotes/:chave', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const chave = param(req, 'chave');
    banco.removerLote(p.id, chave);
    armazem.removerLote(p.slug, chave);
    res.status(204).end();
  });

  app.get('/api/admin/projetos/:slug/revisoras', (req, res) => {
    res.json(banco.revisoras(projetoOu404(param(req, 'slug')).id));
  });

  app.post('/api/admin/projetos/:slug/revisoras', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const corpo = (req.body ?? {}) as Record<string, unknown>;
    const nome = String(corpo.nome ?? '').trim();
    if (!nome) throw new ErroUsuario('Escreva o nome da revisora.');
    if (banco.revisoras(p.id).some((r) => r.nome.toLowerCase() === nome.toLowerCase()))
      throw new ErroUsuario('Já existe uma revisora com este nome neste projeto.');
    banco.criarRevisora(p.id, nome.slice(0, 80), String(corpo.papel ?? '').trim().slice(0, 80));
    res.status(201).json(banco.revisoras(p.id));
  });

  app.delete('/api/admin/projetos/:slug/revisoras/:id', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    banco.desativarRevisora(p.id, Number(param(req, 'id')));
    res.json(banco.revisoras(p.id));
  });

  app.get('/api/admin/projetos/:slug/apontamentos', (req, res) => {
    res.json(banco.apontamentos(projetoOu404(param(req, 'slug')).id));
  });

  app.patch('/api/admin/projetos/:slug/apontamentos/:id', (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const resolvido = !!(req.body as { resolvido?: unknown } | undefined)?.resolvido;
    if (!banco.resolverApontamento(p.id, Number(param(req, 'id')), resolvido)) throw new NaoEncontrado('Apontamento não encontrado.');
    res.status(204).end();
  });

  app.get('/api/admin/projetos/:slug/exportar', async (req, res) => {
    const p = projetoOu404(param(req, 'slug'));
    const comResolvidos = req.query.resolvidos === '1';
    const lotes: Lote[] = [];
    for (const info of banco.lotes(p.id)) {
      try {
        lotes.push({ ...(await armazem.lote(p.slug, info.chave)), nome: info.nome });
      } catch (e) {
        console.error(`[exportar ${p.slug}/${info.chave}]`, e);
      }
    }
    const entrada = {
      projeto: p.nome,
      lotes,
      apontamentos: banco.apontamentos(p.id).filter((a) => comResolvidos || !a.resolvidoEm),
      decisoes: banco.decisoes(p.id),
    };
    const csv = req.query.formato === 'csv';
    const nome = `apontamentos-${slug(p.nome)}-${new Date().toISOString().slice(0, 10)}.${csv ? 'csv' : 'md'}`;
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.type(csv ? 'text/csv; charset=utf-8' : 'text/markdown; charset=utf-8');
    res.send(csv ? exportarCsv(entrada) : exportarMarkdown(entrada));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ erro: 'Endereço não encontrado.' });
  });

  return app;
}

/** Erros viram JSON em pt-BR; os inesperados ficam só no log do servidor. */
export function tratarErros(e: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(e);
  if (e instanceof ErroUsuario) {
    res.status(e.status).json({ erro: e.message });
    return;
  }
  if (e instanceof multer.MulterError) {
    res.status(400).json({ erro: e.code === 'LIMIT_FILE_SIZE' ? 'O arquivo passa de 2 GB.' : 'Não consegui receber o arquivo.' });
    return;
  }
  console.error(e);
  res.status(500).json({ erro: 'Algo saiu do esperado aqui. Tente de novo em instantes.' });
}
