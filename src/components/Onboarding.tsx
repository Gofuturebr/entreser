import { useState } from 'react';
import type { Corpus, Perfil } from '../lib/types';
import { hojeISO } from '../lib/relogio';
import { CaminhoPedras } from './Travessia';

type Props = { corpus: Corpus; base: string; aoConcluir: (perfil: Perfil) => void };

type Etapa = 'abertura' | 'nome' | 'dia' | 'disclaimer';

export function Onboarding({ corpus, base, aoConcluir }: Props) {
  const ob = corpus.onboarding;
  const [etapa, setEtapa] = useState<Etapa>('abertura');
  const [nome, setNome] = useState('');
  const [dia, setDia] = useState(1);

  const concluir = () => {
    const perfil: Perfil = { diaInformado: dia, dataInformada: hojeISO() };
    if (nome.trim()) perfil.nome = nome.trim();
    aoConcluir(perfil);
  };

  if (etapa === 'abertura') {
    return (
      <main className="onboarding onboarding--abertura">
        <img className="onboarding__concha" src={`${base}concha.svg`} alt="" />
        <div className="onboarding__miolo">
          <h1 className="onboarding__titulo">{ob.saudacao}</h1>
          <p className="onboarding__texto">{ob.proposito}</p>
        </div>
        <div className="onboarding__acoes">
          <button type="button" className="botao-principal" onClick={() => setEtapa('nome')}>
            oi, Serena
          </button>
        </div>
      </main>
    );
  }

  if (etapa === 'nome') {
    return (
      <main className="onboarding">
        <div className="onboarding__miolo">
          <h1 className="onboarding__titulo">{ob.pergunta_nome}</h1>
          <input
            className="onboarding__campo"
            type="text"
            autoComplete="given-name"
            aria-label="seu nome"
            placeholder="seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEtapa('dia');
            }}
          />
        </div>
        <div className="onboarding__acoes">
          <button type="button" className="botao-principal" onClick={() => setEtapa('dia')}>
            {nome.trim() ? 'é esse' : 'seguir'}
          </button>
          <button
            type="button"
            className="botao-suave"
            onClick={() => {
              setNome('');
              setEtapa('dia');
            }}
          >
            {ob.prefiro_nao_dizer}
          </button>
        </div>
      </main>
    );
  }

  if (etapa === 'dia') {
    return (
      <main className="onboarding">
        <div className="onboarding__miolo">
          <h1 className="onboarding__titulo">{ob.pergunta_dia}</h1>
          <p className="onboarding__legenda">{ob.legenda_dia}</p>
          <CaminhoPedras dia={dia} aoEscolher={setDia} className="seletor-dia" />
          <p className="seletor-dia__atual">dia {dia} da espera</p>
        </div>
        <div className="onboarding__acoes">
          <button type="button" className="botao-principal" onClick={() => setEtapa('disclaimer')}>
            estou no dia {dia}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding">
      <div className="onboarding__miolo">
        <h1 className="onboarding__titulo">antes de entrar</h1>
        <p className="onboarding__texto">{ob.disclaimer}</p>
      </div>
      <div className="onboarding__acoes">
        <button type="button" className="botao-principal" onClick={concluir}>
          {ob.entrar}
        </button>
      </div>
    </main>
  );
}
