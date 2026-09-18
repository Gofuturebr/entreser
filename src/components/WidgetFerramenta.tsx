import { useState } from 'react';
import type { FerramentaCorpus, Microcopy, PassoFerramenta } from '../lib/types';

export type ResultadoWidget = { resultado: Record<string, unknown>; dispensada: boolean };

type Props = {
  ferramenta: FerramentaCorpus;
  microcopy: Microcopy;
  aoConcluir: (r: ResultadoWidget) => void;
};

type Respostas = Record<string, string | string[]>;

function Passo({ passo, valor, aoMudar }: { passo: PassoFerramenta; valor: string | string[] | undefined; aoMudar: (v: string | string[]) => void }) {
  if (passo.opcoes) {
    const selecionadas = Array.isArray(valor) ? valor : valor ? [valor] : [];
    const alternar = (opcao: string) => {
      if (!passo.multipla) return aoMudar(selecionadas[0] === opcao ? [] : opcao);
      if (selecionadas.includes(opcao)) return aoMudar(selecionadas.filter((s) => s !== opcao));
      if (passo.maximo && selecionadas.length >= passo.maximo) return;
      aoMudar([...selecionadas, opcao]);
    };
    return (
      <div className="widget__opcoes" role="group">
        {passo.opcoes.map((opcao) => (
          <button key={opcao} type="button" className="opcao" aria-pressed={selecionadas.includes(opcao)} onClick={() => alternar(opcao)}>
            {opcao}
          </button>
        ))}
      </div>
    );
  }
  if (passo.campo) {
    return (
      <textarea
        className="widget__campo"
        aria-label={passo.campo.rotulo}
        placeholder={passo.campo.rotulo}
        value={typeof valor === 'string' ? valor : ''}
        onChange={(e) => aoMudar(e.target.value)}
        rows={2}
      />
    );
  }
  return null;
}

export function WidgetFerramenta({ ferramenta, microcopy, aoConcluir }: Props) {
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const passo = ferramenta.passos[indice];
  if (!passo) return null;

  const chave = passo.chave ?? passo.campo?.chave;
  const ultimo = indice === ferramenta.passos.length - 1;

  const avancar = () => {
    if (ultimo) aoConcluir({ resultado: respostas, dispensada: false });
    else setIndice(indice + 1);
  };

  return (
    <section className="widget" aria-label={ferramenta.nome}>
      <div className="widget__cabecalho">
        <span className="widget__nome">{ferramenta.nome}</span>
        <span className="widget__passo">
          {indice + 1} · {ferramenta.passos.length}
        </span>
      </div>
      <p className="widget__texto">{passo.texto}</p>
      {chave && <Passo passo={passo} valor={respostas[chave]} aoMudar={(v) => setRespostas({ ...respostas, [chave]: v })} />}
      <div className="widget__rodape">
        <button type="button" className="botao-principal" onClick={avancar}>
          {passo.botao}
        </button>
        <button type="button" className="botao-suave" onClick={() => aoConcluir({ resultado: respostas, dispensada: true })}>
          {microcopy.agora_nao}
        </button>
      </div>
    </section>
  );
}
