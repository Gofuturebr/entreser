import { useEffect, useState } from 'react';
import type { Microcopy } from '../lib/types';

const LIMIAR_LENTO_MS = 5000;

export function Escrevendo({ microcopy, desde }: { microcopy: Microcopy; desde: number }) {
  const [lento, setLento] = useState(() => Date.now() - desde >= LIMIAR_LENTO_MS);

  useEffect(() => {
    const restante = Math.max(0, LIMIAR_LENTO_MS - (Date.now() - desde));
    const t = setTimeout(() => setLento(true), restante);
    return () => clearTimeout(t);
  }, [desde]);

  return (
    <div className="escrevendo" role="status">
      <span className="escrevendo__respiro" aria-hidden="true" />
      <span>{lento ? microcopy.escrevendo_lento : microcopy.escrevendo}</span>
    </div>
  );
}
