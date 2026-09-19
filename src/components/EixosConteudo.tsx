import type { Corpus, Eixo } from '../lib/types';

// Estrutura de conteúdo visível: Corpo (Entender · clareza clínica) e
// Coração (Bem-Estar · bem-estar emocional). Ações (Preparar) são os chips.

export type EixoConteudoAberto = Extract<Eixo, 'entender' | 'bem_estar'>;

type PropsFaixa = { corpus: Corpus; desabilitado: boolean; aoAbrir: (eixo: EixoConteudoAberto) => void };

export function FaixaEixos({ corpus, desabilitado, aoAbrir }: PropsFaixa) {
  const eixos: EixoConteudoAberto[] = ['entender', 'bem_estar'];
  return (
    <nav className="eixos" aria-label={corpus.microcopy.eixos_rotulo ?? 'conversar sobre'}>
      {eixos.map((eixo) => {
        const e = corpus.eixos[eixo];
        return (
          <button key={eixo} type="button" className={`eixo eixo--${eixo}`} disabled={desabilitado} onClick={() => aoAbrir(eixo)}>
            <span className="eixo__nome">
              <span className="eixo__ponto" aria-hidden="true" />
              {e.nome}
            </span>
            <span className="eixo__sub">{e.subtitulo}</span>
          </button>
        );
      })}
    </nav>
  );
}

type PropsFolha = { corpus: Corpus; eixo: EixoConteudoAberto; aoEscolher: (pergunta: string) => void };

export function FolhaEixo({ corpus, eixo, aoEscolher }: PropsFolha) {
  const e = corpus.eixos[eixo];
  const temas =
    eixo === 'entender'
      ? corpus.faq.filter((f) => f.titulo && f.pergunta).map((f) => ({ id: f.id, titulo: f.titulo ?? '', pergunta: f.pergunta ?? '' }))
      : corpus.acolhimento.filter((a) => a.titulo && a.pergunta).map((a) => ({ id: a.contexto, titulo: a.titulo ?? '', pergunta: a.pergunta ?? '' }));

  return (
    <div className="folha-eixo">
      <p className="folha-eixo__descricao">{e.descricao}</p>
      <p className="folha-eixo__dica">{corpus.microcopy.eixo_tocar}</p>
      <ul className="folha-eixo__lista">
        {temas.map((t) => (
          <li key={t.id}>
            <button type="button" className={`tema tema--${eixo}`} onClick={() => aoEscolher(t.pergunta)}>
              {t.titulo}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
