// Tipos do corpus E5 e da linha do tempo do chat.
// Fonte: 01-build-spec.md §4 (corpus) e §10.2 (timeline mista).

export type Eixo = 'entender' | 'bem_estar' | 'preparar';
export type Rota = Eixo;

export type PassoFerramenta = {
  texto: string;
  botao: string;
  chave?: string;
  campo?: { rotulo: string; chave: string };
  opcoes?: string[];
  multipla?: boolean;
  maximo?: number;
};

export type FerramentaCorpus = {
  id: string;
  nome: string;
  rotulo_chip: string;
  descricao: string;
  status: string;
  passos: PassoFerramenta[];
  resumo_template: string;
  resumo_dispensada: string;
};

export type CardCorpus = {
  id: string;
  eixo: 'entender' | 'bem_estar';
  dias_sugeridos: number[];
  titulo: string;
  resumo_1_linha: string;
  status: 'mockup' | 'chancelado';
  asset: string;
};

export type Roteiro = {
  dia: number;
  tema: string;
  rotulo_travessia: string;
  mensagem_proativa: string;
  intencao: string;
  status: string;
};

export type Faq = {
  id: string;
  titulo?: string;
  pergunta?: string;
  gatilhos: string[];
  resposta_base: string;
  fonte: string;
  card_id?: string;
  ferramenta?: string;
  status: string;
};

export type Acolhimento = {
  contexto: string;
  titulo?: string;
  pergunta?: string;
  gatilhos: string[];
  frases_validadas: string[];
  card_id?: string;
  status: string;
};

export type Contato = { rotulo: string; url: string; descricao?: string; nota_pendente?: string };

export type Escalonamento = {
  termos_gatilho: string[];
  mensagem_ponte_humana: string;
  mensagem_pausa: string;
  contatos: { equipe: Contato; cvv: Contato };
  status: string;
};

export type Microcopy = Record<string, string>;

export type Onboarding = {
  saudacao: string;
  proposito: string;
  pergunta_nome: string;
  prefiro_nao_dizer: string;
  pergunta_dia: string;
  legenda_dia: string;
  disclaimer: string;
  entrar: string;
};

export type SecaoTrilha = {
  id: string;
  titulo: string;
  explicacao: string;
  base: string;
  temas?: string[];
  card_id?: string;
  ferramenta?: string;
  acao?: 'travessia';
};

export type Trilha = {
  nome: string;
  rotulo_eixo: string;
  subtitulo: string;
  intro: string;
  rotulo_base: string;
  status: string;
  secoes: SecaoTrilha[];
};

export type Corpus = {
  versao: string;
  fase: string;
  aviso: string;
  vocabulario_proibido: string[];
  trilhas: Record<Eixo, Trilha>;
  roteiros_diarios: Roteiro[];
  faq: Faq[];
  acolhimento: Acolhimento[];
  ferramentas: FerramentaCorpus[];
  cards_microlearning: CardCorpus[];
  escalonamento: Escalonamento;
  microcopy: Microcopy;
  onboarding: Onboarding;
};

// ---- Linha do tempo (01-build-spec.md §10.2) ----

export type Autor = 'serena' | 'usuaria';
export type OrigemInvocacao = 'chip' | 'serena' | 'prefiltro';

export type MensagemTexto = {
  id: string;
  autor: Autor;
  tipo: 'texto';
  payload: {
    texto: string;
    selo?: 'mensagem_do_dia';
    dia?: number;
    rota?: Rota;
    streaming?: boolean;
  };
};

export type MensagemFerramenta = {
  id: string;
  autor: 'serena';
  tipo: 'ferramenta';
  payload: {
    nome: string;
    origem: OrigemInvocacao;
    params: Record<string, string>;
    dia: number;
  };
};

export type MensagemResumo = {
  id: string;
  autor: 'serena';
  tipo: 'resumo_ferramenta';
  payload: {
    nome: string;
    resumo: string;
    resultado: Record<string, unknown>;
    dispensada: boolean;
    dia: number;
    params: Record<string, string>;
  };
};

export type MensagemErro = {
  id: string;
  autor: 'serena';
  tipo: 'erro';
  payload: { texto: string; reenviar?: string };
};

export type Mensagem = MensagemTexto | MensagemFerramenta | MensagemResumo | MensagemErro;

export type Perfil = {
  /** Etapa do Percurso (E1–E7). Só a 5 está ativa neste protótipo. */
  fase: number;
  nome?: string;
  diaInformado?: number;
  dataInformada?: string; // YYYY-MM-DD
  avisarQuandoChegar?: boolean;
};

// ---- Percurso (mapa das 7 etapas — dados mocados para a entrada) ----

export type FasePercurso = {
  numero: number;
  nome: string;
  lema: string;
  verbo: string;
  situacao: string;
  momento: string;
  ativa: boolean;
};

export type Percurso = {
  versao: string;
  aviso: string;
  fase_ativa: number;
  fases: FasePercurso[];
  microcopy: Record<string, string>;
};

export type VariacaoTravessia = 'marcador' | 'pedras';

export type Preferencias = {
  travessia: VariacaoTravessia;
  fioRota: boolean;
};

export const DIA_MIN = 1;
export const DIA_MAX = 10;
