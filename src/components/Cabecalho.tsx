import { useRef } from 'react';
import type { VariacaoTravessia } from '../lib/types';
import { MarcadorTravessia } from './Travessia';

type Props = {
  base: string;
  dia: number;
  rotulo: string;
  cabecalhoDia: string;
  variacao: VariacaoTravessia;
  aoAbrirTravessia: () => void;
  aoAbrirMenuOculto: () => void;
};

const TOQUE_LONGO_MS = 600;

export function Cabecalho({ base, dia, rotulo, cabecalhoDia, variacao, aoAbrirTravessia, aoAbrirMenuOculto }: Props) {
  const temporizador = useRef<number | null>(null);

  const iniciar = () => {
    temporizador.current = window.setTimeout(aoAbrirMenuOculto, TOQUE_LONGO_MS);
  };
  const cancelar = () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = null;
  };

  return (
    <header className="cabecalho">
      <div
        className="cabecalho__logo"
        onPointerDown={iniciar}
        onPointerUp={cancelar}
        onPointerLeave={cancelar}
        onPointerCancel={cancelar}
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden="true"
      >
        <img src={`${base}concha.svg`} alt="" draggable={false} />
      </div>
      <div className="cabecalho__centro">
        <div className="cabecalho__nome">Serena</div>
        <MarcadorTravessia dia={dia} rotulo={rotulo} variacao={variacao} aoAbrir={aoAbrirTravessia} cabecalhoDia={cabecalhoDia} />
      </div>
    </header>
  );
}
