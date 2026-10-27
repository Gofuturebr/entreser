// Tipos compartilhados entre o servidor e o front (importados com `import type`).

export type Peca = {
  skin: string;
  /** Caminho do HTML relativo à raiz do lote. */
  html: string;
};

export type Conteudo = {
  id: string;
  trilhaId: string;
  temaId: string;
  titulo: string;
  objetivo: string;
  introducao: string;
  conteudoPlanejado: string;
  formato: string;
  duracao: string;
  tags: string[];
  relacionados: string;
  chancela: string;
  observacoes: string;
  modificacao: string;
  /** Estado da peça no lote (pendente, gerada, pronta, erro); vazio quando não informado. */
  estado: string;
  mensagem: string;
  /** Pasta do conteúdo relativa à raiz do lote; null quando o conteúdo ainda não tem pasta. */
  pasta: string | null;
  /** Conteúdo do texto.md, quando existe. */
  texto: string | null;
  pecas: Peca[];
  /** Imagens relativas à raiz do lote, na ordem de revisão. */
  imagens: string[];
};

export type ItemTema = { id: string; titulo: string; ref: boolean };

export type Tema = { id: string; titulo: string; descricao: string; itens: ItemTema[] };

export type Trilha = {
  id: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  /** Imagem de capa relativa à raiz do lote. */
  capa: string | null;
  temas: Tema[];
};

export type Manifesto = 'json' | 'planilha';

export type Lote = {
  chave: string;
  nome: string;
  manifesto: Manifesto;
  trilhas: Trilha[];
  conteudos: Record<string, Conteudo>;
  avisos: string[];
};

export type StatusDecisao = 'aprovado' | 'ajustes';
export type StatusAgregado = StatusDecisao | 'pendente';
export type Alvo = 'texto' | 'formato' | 'imagem';

export type Revisora = { id: number; nome: string; papel: string; ativa: boolean };

export type Decisao = {
  revisoraId: number;
  revisora: string;
  status: StatusDecisao;
  em: string;
  /** A decisão é anterior à última atualização do conteúdo. */
  desatualizada: boolean;
};

export type Apontamento = {
  id: number;
  lote: string;
  conteudoId: string;
  alvo: Alvo;
  imagem: string | null;
  revisoraId: number;
  revisora: string;
  texto: string;
  criadoEm: string;
  resolvidoEm: string | null;
};

export type ResumoConteudo = {
  status: StatusAgregado;
  decisoes: Decisao[];
  abertos: number;
  atualizadoEm: string | null;
};

export type ResumoLote = {
  chave: string;
  nome: string;
  manifesto: Manifesto;
  enviadoEm: string;
  trilhas: Trilha[];
  /** Título e status de cada conteúdo, por id. */
  conteudos: Record<string, { titulo: string; formato: string; temaId: string; trilhaId: string } & ResumoConteudo>;
};

export type ProjetoPublico = {
  nome: string;
  slug: string;
  revisoras: Revisora[];
};

export type DetalheConteudo = {
  lote: { chave: string; nome: string };
  conteudo: Conteudo;
  trilha: { id: string; titulo: string } | null;
  tema: { id: string; titulo: string } | null;
  resumo: ResumoConteudo;
  apontamentos: Apontamento[];
};

export type ResultadoUpload = {
  tipo: 'lote' | 'conteudo';
  chave: string;
  nome: string;
  manifesto: Manifesto;
  conteudos: number;
  atualizados: string[];
  avisos: string[];
};

export type ProjetoAdmin = {
  id: number;
  nome: string;
  slug: string;
  criadoEm: string;
  lotes: { chave: string; nome: string; manifesto: Manifesto; enviadoEm: string }[];
};
