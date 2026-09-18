import { useState } from 'react';
import type { CardCorpus, Microcopy } from '../lib/types';

type Props = { card: CardCorpus; microcopy: Microcopy; base: string; aoDispensar: () => void };

const ROTULO_EIXO: Record<CardCorpus['eixo'], string> = { entender: 'entender', bem_estar: 'bem-estar' };

export function CardMicrolearning({ card, microcopy, base, aoDispensar }: Props) {
  const [aberto, setAberto] = useState(false);
  const src = `${base}${card.asset}`;
  const mockup = card.status === 'mockup';

  return (
    <>
      <article className="card-micro" aria-label={`card: ${card.titulo}`}>
        <button type="button" className="card-micro__capa" onClick={() => setAberto(true)} aria-label={`${microcopy.card_convite_ver}: ${card.titulo}`}>
          <img src={src} alt="" />
          <span className={`card-micro__eixo card-micro__eixo--${card.eixo}`} aria-hidden="true" />
          {mockup && <span className="card-micro__selo">{microcopy.card_em_breve}</span>}
        </button>
        <div className="card-micro__corpo">
          <h3 className="card-micro__titulo">{card.titulo}</h3>
          <p className="card-micro__resumo">{card.resumo_1_linha}</p>
        </div>
        <div className="card-micro__acoes">
          <button type="button" className="card-micro__acao card-micro__acao--suave" onClick={aoDispensar}>
            {microcopy.agora_nao}
          </button>
          <button type="button" className="card-micro__acao" onClick={() => setAberto(true)}>
            {microcopy.card_convite_ver}
          </button>
        </div>
      </article>

      {aberto && (
        <div className="card-cheio" role="dialog" aria-modal="true" aria-label={card.titulo}>
          <div className="card-cheio__capa">
            <img src={src} alt="" />
          </div>
          <span className={`card-cheio__eixo card-cheio__eixo--${card.eixo}`}>{ROTULO_EIXO[card.eixo]}</span>
          <h2 className="card-cheio__titulo">{card.titulo}</h2>
          <p className="onboarding__texto">{card.resumo_1_linha}</p>
          {mockup && <p className="card-cheio__pendente">{microcopy.card_em_breve}</p>}
          <button type="button" className="botao-principal" onClick={() => setAberto(false)}>
            {microcopy.fechar}
          </button>
        </div>
      )}
    </>
  );
}
