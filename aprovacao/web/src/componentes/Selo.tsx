import type { Decisao, StatusAgregado } from '../../../server/tipos.ts';
import { ROTULO_STATUS } from '../util.ts';

export function Selo({ status, abertos = 0 }: { status: StatusAgregado; abertos?: number }) {
  return (
    <span className={`selo selo-${status}`}>
      {ROTULO_STATUS[status]}
      {abertos > 0 && ` · ${abertos}`}
    </span>
  );
}

/** "Ana aprovou · Carla pediu ajustes" */
export function QuemDecidiu({ decisoes }: { decisoes: Decisao[] }) {
  if (decisoes.length === 0) return null;
  return (
    <span className="quem">
      {decisoes.map((d, i) => (
        <span key={d.revisoraId} className={d.desatualizada ? 'desatualizada' : ''} title={d.desatualizada ? 'Decisão anterior à última atualização do conteúdo' : undefined}>
          {i > 0 && ' · '}
          {d.revisora} {d.status === 'aprovado' ? 'aprovou' : 'pediu ajustes'}
          {d.desatualizada && ' (versão anterior)'}
        </span>
      ))}
    </span>
  );
}
