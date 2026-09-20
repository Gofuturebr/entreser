import { useState } from 'react';
import type { FasePercurso, Percurso } from '../lib/types';
import { faseDoPercurso } from '../lib/percurso';
import { MapaJornada } from './MapaJornada';

// Entrada do app: "Onde você está agora?" — a tentante se reconhece numa
// situação, não num número. Só a etapa ativa segue para a conversa.

type Props = {
  percurso: Percurso;
  faseInicial?: number | null;
  aoConfirmar: (fase: FasePercurso) => void;
};

export function EntradaJornada({ percurso, faseInicial = null, aoConfirmar }: Props) {
  const [fase, setFase] = useState<number | null>(faseInicial);
  const mc = percurso.microcopy;
  const escolhida = fase === null ? undefined : faseDoPercurso(percurso, fase);

  return (
    <main className="onboarding onboarding--jornada">
      <div className="jornada__topo">
        <h1 className="onboarding__titulo">{mc.titulo}</h1>
        <p className="onboarding__legenda">{mc.legenda}</p>
      </div>

      <MapaJornada percurso={percurso} faseAtual={fase} aoEscolher={setFase} />

      {escolhida && (
        <section className={`momento${escolhida.ativa ? ' momento--ativa' : ''}`} aria-live="polite" aria-label={`${mc.rotulo_etapa} ${escolhida.numero}`}>
          <span className="momento__eyebrow">
            {mc.rotulo_etapa} {escolhida.numero} · {escolhida.lema}
          </span>
          <h2 className="momento__nome">{escolhida.nome}</h2>
          <p className="momento__situacao">{escolhida.situacao}</p>
          <p className="momento__texto">{escolhida.momento}</p>
          <span className={`momento__status${escolhida.ativa ? ' momento__status--ativa' : ''}`}>{escolhida.ativa ? mc.ativa : mc.em_preparo}</span>
        </section>
      )}

      <div className="onboarding__acoes onboarding__acoes--fixas">
        <button type="button" className="botao-principal" disabled={!escolhida} onClick={() => escolhida && aoConfirmar(escolhida)}>
          {escolhida?.ativa ? mc.seguir : mc.confirmar}
        </button>
      </div>
    </main>
  );
}

type PropsPreparo = { percurso: Percurso; fase: FasePercurso; avisada: boolean; aoAvisar: () => void; aoMudar: () => void };

export function EtapaEmPreparo({ percurso, fase, avisada, aoAvisar, aoMudar }: PropsPreparo) {
  const mc = percurso.microcopy;
  return (
    <main className="onboarding onboarding--jornada">
      <div className="jornada__topo">
        <span className="momento__eyebrow">
          {mc.rotulo_etapa} {fase.numero} · {fase.lema}
        </span>
        <h1 className="onboarding__titulo">{fase.nome}</h1>
        <p className="onboarding__legenda">{fase.verbo}</p>
      </div>

      <MapaJornada percurso={percurso} faseAtual={fase.numero} />

      <section className="momento" aria-label={mc.em_preparo}>
        <h2 className="momento__nome">{mc.em_preparo}</h2>
        <p className="momento__texto">{mc.em_preparo_texto}</p>
        {avisada && <p className="momento__status momento__status--ativa">{mc.avisada}</p>}
      </section>

      <div className="onboarding__acoes onboarding__acoes--fixas">
        {!avisada && (
          <button type="button" className="botao-principal" onClick={aoAvisar}>
            {mc.avisar}
          </button>
        )}
        <button type="button" className="botao-suave" onClick={aoMudar}>
          {mc.mudar}
        </button>
      </div>
    </main>
  );
}
