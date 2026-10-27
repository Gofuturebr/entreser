// Banco SQLite num arquivo (node:sqlite, sem dependência nativa).
// Conteúdos, trilhas e temas não ficam aqui: são lidos dos manifestos do lote.
// Apontamentos e decisões são presos ao ID do conteúdo, então reenviar um lote
// não apaga o que as revisoras já disseram.
import { DatabaseSync } from 'node:sqlite';
import type { Alvo, Apontamento, Manifesto, Revisora, StatusDecisao } from './tipos.ts';

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS projeto (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lote (
  projeto_id INTEGER NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  manifesto TEXT NOT NULL,
  enviado_em TEXT NOT NULL,
  PRIMARY KEY (projeto_id, chave)
);
CREATE TABLE IF NOT EXISTS revisora (
  id INTEGER PRIMARY KEY,
  projeto_id INTEGER NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT '',
  ativa INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS apontamento (
  id INTEGER PRIMARY KEY,
  projeto_id INTEGER NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
  lote TEXT NOT NULL,
  conteudo_id TEXT NOT NULL,
  alvo TEXT NOT NULL,
  imagem TEXT,
  revisora_id INTEGER NOT NULL REFERENCES revisora(id),
  texto TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  resolvido_em TEXT
);
CREATE INDEX IF NOT EXISTS apontamento_conteudo ON apontamento (projeto_id, lote, conteudo_id);
CREATE TABLE IF NOT EXISTS decisao (
  projeto_id INTEGER NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
  lote TEXT NOT NULL,
  conteudo_id TEXT NOT NULL,
  revisora_id INTEGER NOT NULL REFERENCES revisora(id),
  status TEXT NOT NULL,
  em TEXT NOT NULL,
  PRIMARY KEY (projeto_id, lote, conteudo_id, revisora_id)
);
CREATE TABLE IF NOT EXISTS versao (
  projeto_id INTEGER NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
  lote TEXT NOT NULL,
  conteudo_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  PRIMARY KEY (projeto_id, lote, conteudo_id)
);
`;

export type ProjetoLinha = { id: number; slug: string; nome: string; criadoEm: string };
export type LoteLinha = { chave: string; nome: string; manifesto: Manifesto; enviadoEm: string };
export type DecisaoLinha = {
  lote: string;
  conteudoId: string;
  revisoraId: number;
  revisora: string;
  status: StatusDecisao;
  em: string;
};

type Linha = Record<string, unknown>;
const agora = () => new Date().toISOString();

function apontamento(l: Linha): Apontamento {
  return {
    id: Number(l.id),
    lote: String(l.lote),
    conteudoId: String(l.conteudo_id),
    alvo: l.alvo as Alvo,
    imagem: l.imagem === null ? null : String(l.imagem),
    revisoraId: Number(l.revisora_id),
    revisora: String(l.revisora),
    texto: String(l.texto),
    criadoEm: String(l.criado_em),
    resolvidoEm: l.resolvido_em === null ? null : String(l.resolvido_em),
  };
}

const SELECT_APONTAMENTO = `
  SELECT a.*, r.nome AS revisora FROM apontamento a JOIN revisora r ON r.id = a.revisora_id`;

export type Banco = ReturnType<typeof abrirBanco>;

export function abrirBanco(arquivo: string) {
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(ESQUEMA);

  const projeto = (l: Linha | undefined): ProjetoLinha | null =>
    l ? { id: Number(l.id), slug: String(l.slug), nome: String(l.nome), criadoEm: String(l.criado_em) } : null;

  return {
    fechar: () => db.close(),

    criarProjeto(nome: string, slug: string): ProjetoLinha {
      const r = db.prepare('INSERT INTO projeto (slug, nome, criado_em) VALUES (?, ?, ?)').run(slug, nome, agora());
      return { id: Number(r.lastInsertRowid), slug, nome, criadoEm: agora() };
    },
    projetos(): ProjetoLinha[] {
      return db.prepare('SELECT * FROM projeto ORDER BY criado_em DESC').all().flatMap((l) => projeto(l) ?? []);
    },
    projetoPorSlug(slug: string): ProjetoLinha | null {
      return projeto(db.prepare('SELECT * FROM projeto WHERE slug = ?').get(slug));
    },
    removerProjeto(id: number): void {
      db.exec('BEGIN');
      try {
        for (const t of ['apontamento', 'decisao', 'versao', 'lote', 'revisora'])
          db.prepare(`DELETE FROM ${t} WHERE projeto_id = ?`).run(id);
        db.prepare('DELETE FROM projeto WHERE id = ?').run(id);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },

    salvarLote(projetoId: number, chave: string, nome: string, manifesto: Manifesto): void {
      db.prepare(
        `INSERT INTO lote (projeto_id, chave, nome, manifesto, enviado_em) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (projeto_id, chave) DO UPDATE SET nome = excluded.nome, manifesto = excluded.manifesto, enviado_em = excluded.enviado_em`,
      ).run(projetoId, chave, nome, manifesto, agora());
    },
    tocarLote(projetoId: number, chave: string): void {
      db.prepare('UPDATE lote SET enviado_em = ? WHERE projeto_id = ? AND chave = ?').run(agora(), projetoId, chave);
    },
    lotes(projetoId: number): LoteLinha[] {
      return db
        .prepare('SELECT * FROM lote WHERE projeto_id = ? ORDER BY enviado_em')
        .all(projetoId)
        .map((l) => ({
          chave: String(l.chave),
          nome: String(l.nome),
          manifesto: l.manifesto as Manifesto,
          enviadoEm: String(l.enviado_em),
        }));
    },
    removerLote(projetoId: number, chave: string): void {
      db.prepare('DELETE FROM lote WHERE projeto_id = ? AND chave = ?').run(projetoId, chave);
    },

    revisoras(projetoId: number, incluirInativas = false): Revisora[] {
      return db
        .prepare(`SELECT * FROM revisora WHERE projeto_id = ? ${incluirInativas ? '' : 'AND ativa = 1'} ORDER BY nome COLLATE NOCASE`)
        .all(projetoId)
        .map((l) => ({ id: Number(l.id), nome: String(l.nome), papel: String(l.papel), ativa: l.ativa === 1 }));
    },
    revisoraAtiva(projetoId: number, id: number): boolean {
      return !!db.prepare('SELECT 1 FROM revisora WHERE id = ? AND projeto_id = ? AND ativa = 1').get(id, projetoId);
    },
    criarRevisora(projetoId: number, nome: string, papel: string): number {
      return Number(
        db.prepare('INSERT INTO revisora (projeto_id, nome, papel, criado_em) VALUES (?, ?, ?, ?)').run(projetoId, nome, papel, agora())
          .lastInsertRowid,
      );
    },
    /** Revisora removida some da tela de identificação, mas o nome continua nos apontamentos. */
    desativarRevisora(projetoId: number, id: number): void {
      db.prepare('UPDATE revisora SET ativa = 0 WHERE id = ? AND projeto_id = ?').run(id, projetoId);
    },

    criarApontamento(a: { projetoId: number; lote: string; conteudoId: string; alvo: Alvo; imagem: string | null; revisoraId: number; texto: string }): void {
      db.prepare(
        'INSERT INTO apontamento (projeto_id, lote, conteudo_id, alvo, imagem, revisora_id, texto, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(a.projetoId, a.lote, a.conteudoId, a.alvo, a.imagem, a.revisoraId, a.texto, agora());
    },
    apontamentos(projetoId: number, filtro: { lote?: string; conteudoId?: string } = {}): Apontamento[] {
      let sql = `${SELECT_APONTAMENTO} WHERE a.projeto_id = ?`;
      const args: (string | number)[] = [projetoId];
      if (filtro.lote) {
        sql += ' AND a.lote = ?';
        args.push(filtro.lote);
      }
      if (filtro.conteudoId) {
        sql += ' AND a.conteudo_id = ?';
        args.push(filtro.conteudoId);
      }
      return db.prepare(`${sql} ORDER BY a.criado_em`).all(...args).map(apontamento);
    },
    resolverApontamento(projetoId: number, id: number, resolvido: boolean): boolean {
      const r = db
        .prepare('UPDATE apontamento SET resolvido_em = ? WHERE id = ? AND projeto_id = ?')
        .run(resolvido ? agora() : null, id, projetoId);
      return r.changes > 0;
    },

    decidir(projetoId: number, lote: string, conteudoId: string, revisoraId: number, status: StatusDecisao | null): void {
      if (status === null) {
        db.prepare('DELETE FROM decisao WHERE projeto_id = ? AND lote = ? AND conteudo_id = ? AND revisora_id = ?').run(
          projetoId, lote, conteudoId, revisoraId,
        );
        return;
      }
      db.prepare(
        `INSERT INTO decisao (projeto_id, lote, conteudo_id, revisora_id, status, em) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (projeto_id, lote, conteudo_id, revisora_id) DO UPDATE SET status = excluded.status, em = excluded.em`,
      ).run(projetoId, lote, conteudoId, revisoraId, status, agora());
    },
    decisoes(projetoId: number, lote?: string): DecisaoLinha[] {
      return db
        .prepare(
          `SELECT d.*, r.nome AS revisora FROM decisao d JOIN revisora r ON r.id = d.revisora_id
           WHERE d.projeto_id = ? ${lote ? 'AND d.lote = ?' : ''} ORDER BY r.nome COLLATE NOCASE`,
        )
        .all(...(lote ? [projetoId, lote] : [projetoId]))
        .map((l) => ({
          lote: String(l.lote),
          conteudoId: String(l.conteudo_id),
          revisoraId: Number(l.revisora_id),
          revisora: String(l.revisora),
          status: l.status as StatusDecisao,
          em: String(l.em),
        }));
    },

    versoes(projetoId: number, lote: string): Map<string, string> {
      const m = new Map<string, string>();
      for (const l of db.prepare('SELECT conteudo_id, atualizado_em FROM versao WHERE projeto_id = ? AND lote = ?').all(projetoId, lote))
        m.set(String(l.conteudo_id), String(l.atualizado_em));
      return m;
    },
    /** Grava o hash do conteúdo; devolve true quando ele mudou (ou é novo). */
    registrarVersao(projetoId: number, lote: string, conteudoId: string, hash: string): boolean {
      const atual = db
        .prepare('SELECT hash FROM versao WHERE projeto_id = ? AND lote = ? AND conteudo_id = ?')
        .get(projetoId, lote, conteudoId);
      if (atual && atual.hash === hash) return false;
      db.prepare(
        `INSERT INTO versao (projeto_id, lote, conteudo_id, hash, atualizado_em) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (projeto_id, lote, conteudo_id) DO UPDATE SET hash = excluded.hash, atualizado_em = excluded.atualizado_em`,
      ).run(projetoId, lote, conteudoId, hash, agora());
      return true;
    },
  };
}
