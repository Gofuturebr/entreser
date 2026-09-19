import type { Corpus, Eixo, SecaoTrilha } from '../lib/types';
import { DIA_MAX } from '../lib/types';
import { cardDoCorpus } from '../lib/corpus';

// Trilhas de conteúdo de E5 (Percurso Entre Ser): Entender · Bem-estar · Cuidar.
// Uma linha de chips; cada um abre uma tela sobre a conversa com as seções,
// a explicação, a base e os temas tocáveis. Tudo vem do corpus.

const ORDEM: Eixo[] = ['entender', 'bem_estar', 'preparar'];

function IconePessoa() {
  return (
    <svg className="chip__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    </svg>
  );
}

type PropsChips = { corpus: Corpus; dia: number; aoAbrirTrilha: (eixo: Eixo) => void; aoAbrirPessoa: () => void };

export function ChipsTrilhas({ corpus, dia, aoAbrirTrilha, aoAbrirPessoa }: PropsChips) {
  return (
    <nav className="chips" aria-label="trilhas">
      {ORDEM.map((eixo) => {
        const t = corpus.trilhas[eixo];
        const evidencia = dia === DIA_MAX && eixo === 'preparar';
        return (
          <button key={eixo} type="button" className={`chip chip--trilha chip--${eixo}${evidencia ? ' chip--evidencia' : ''}`} onClick={() => aoAbrirTrilha(eixo)}>
            <span className="chip__ponto" aria-hidden="true" />
            {t.nome}
          </button>
        );
      })}
      <button type="button" className="chip chip--humano chip--icone" onClick={aoAbrirPessoa} aria-label={corpus.microcopy.chip_pessoa}>
        <IconePessoa />
      </button>
    </nav>
  );
}

type Tema = { id: string; titulo: string; pergunta: string };

function resolverTemas(corpus: Corpus, ids: string[] | undefined): Tema[] {
  if (!ids) return [];
  const temas: Tema[] = [];
  for (const id of ids) {
    const f = corpus.faq.find((x) => x.id === id);
    if (f?.titulo && f.pergunta) {
      temas.push({ id, titulo: f.titulo, pergunta: f.pergunta });
      continue;
    }
    const a = corpus.acolhimento.find((x) => x.contexto === id);
    if (a?.titulo && a.pergunta) temas.push({ id, titulo: a.titulo, pergunta: a.pergunta });
  }
  return temas;
}

type PropsTela = {
  corpus: Corpus;
  eixo: Eixo;
  dia: number;
  widgetAtivo: boolean;
  aoFechar: () => void;
  aoPerguntar: (pergunta: string) => void;
  aoAbrirFerramenta: (nome: string) => void;
  aoVerCard: (cardId: string) => void;
  aoVerTravessia: () => void;
};

export function TelaTrilha({ corpus, eixo, dia, widgetAtivo, aoFechar, aoPerguntar, aoAbrirFerramenta, aoVerCard, aoVerTravessia }: PropsTela) {
  const t = corpus.trilhas[eixo];
  const mc = corpus.microcopy;
  const secoes = eixo === 'preparar' && dia === DIA_MAX ? [...t.secoes].sort((a, b) => (a.id === 'acordos' ? -1 : b.id === 'acordos' ? 1 : 0)) : t.secoes;

  const acaoDaSecao = (s: SecaoTrilha) => {
    if (s.ferramenta) {
      const f = corpus.ferramentas.find((x) => x.id === s.ferramenta);
      const rotulo = s.ferramenta === 'ponte_humana' ? mc.chip_pessoa : `${mc.trilha_abrir} ${f?.nome ?? ''}`.trim();
      const bloqueada = s.ferramenta !== 'ponte_humana' && widgetAtivo;
      return (
        <button type="button" className="tela-trilha__acao" disabled={bloqueada} onClick={() => aoAbrirFerramenta(s.ferramenta ?? '')}>
          {rotulo}
        </button>
      );
    }
    if (s.acao === 'travessia') {
      return (
        <button type="button" className="tela-trilha__acao" onClick={aoVerTravessia}>
          {mc.trilha_ver_travessia}
        </button>
      );
    }
    return null;
  };

  return (
    <div className={`tela-trilha tela-trilha--${eixo}`} role="dialog" aria-modal="true" aria-label={`${t.nome} · ${t.subtitulo}`}>
      <header className="tela-trilha__cabecalho">
        <div>
          <span className="tela-trilha__eixo">
            <span className="chip__ponto" aria-hidden="true" />
            {t.rotulo_eixo}
          </span>
          <h2 className="tela-trilha__titulo">{t.nome}</h2>
          <p className="tela-trilha__subtitulo">{t.subtitulo}</p>
        </div>
        <button type="button" className="tela-trilha__fechar" onClick={aoFechar}>
          {mc.fechar}
        </button>
      </header>

      <p className="tela-trilha__intro">{t.intro}</p>

      <ol className="tela-trilha__secoes">
        {secoes.map((s) => {
          const temas = resolverTemas(corpus, s.temas);
          const card = s.card_id ? cardDoCorpus(corpus, s.card_id) : undefined;
          return (
            <li key={s.id} className="secao">
              <h3 className="secao__titulo">{s.titulo}</h3>
              <p className="secao__explicacao">{s.explicacao}</p>
              <details className="secao__base">
                <summary>{t.rotulo_base}</summary>
                <p>{s.base}</p>
              </details>
              {temas.length > 0 && (
                <div className="secao__temas">
                  <span className="secao__rotulo">{mc.trilha_temas}</span>
                  {temas.map((tema) => (
                    <button key={tema.id} type="button" className={`tema tema--${eixo}`} onClick={() => aoPerguntar(tema.pergunta)}>
                      {tema.titulo}
                    </button>
                  ))}
                </div>
              )}
              <div className="secao__acoes">
                {acaoDaSecao(s)}
                {card && (
                  <button type="button" className="tela-trilha__acao tela-trilha__acao--suave" onClick={() => aoVerCard(card.id)}>
                    {mc.trilha_ver_card}: {card.titulo}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
