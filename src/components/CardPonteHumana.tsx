import { useState } from 'react';
import type { Escalonamento } from '../lib/types';

export function CardPonteHumana({ escalonamento }: { escalonamento: Escalonamento }) {
  const { equipe, cvv } = escalonamento.contatos;
  const [notaEquipe, setNotaEquipe] = useState(false);

  return (
    <section className="ponte" aria-label="Ponte Humana" role="region">
      <p className="ponte__texto">{escalonamento.mensagem_ponte_humana}</p>

      {equipe.url ? (
        <a className="ponte__acao ponte__acao--equipe" href={equipe.url}>
          {equipe.rotulo}
        </a>
      ) : (
        <button type="button" className="ponte__acao ponte__acao--equipe" onClick={() => setNotaEquipe(true)}>
          {equipe.rotulo}
        </button>
      )}
      {notaEquipe && equipe.nota_pendente && <p className="ponte__nota">{equipe.nota_pendente}</p>}

      <a className="ponte__acao ponte__acao--cvv" href={cvv.url}>
        {cvv.rotulo}
        {cvv.descricao && <small>{cvv.descricao}</small>}
      </a>
    </section>
  );
}
