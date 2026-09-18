import type { Corpus } from '../lib/types';
import { DIA_MAX } from '../lib/types';

type Props = { corpus: Corpus; dia: number; widgetAtivo: boolean; aoAbrir: (nome: string) => void };

const ORDEM = ['sos_google', 'plano_espera', 'acordos_casal'] as const;

function Icone({ nome }: { nome: string }) {
  const comum = { className: 'chip__icone', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (nome) {
    case 'sos_google':
      return (
        <svg {...comum}>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-4.5-4.5M8 11h6" />
        </svg>
      );
    case 'plano_espera':
      return (
        <svg {...comum}>
          <path d="M5 12c3-5 11-5 14 0M5 16c3-5 11-5 14 0" />
          <circle cx="12" cy="7" r="1.5" />
        </svg>
      );
    case 'acordos_casal':
      return (
        <svg {...comum}>
          <circle cx="8" cy="12" r="4" />
          <circle cx="16" cy="12" r="4" />
        </svg>
      );
    default:
      return (
        <svg {...comum}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
        </svg>
      );
  }
}

export function ChipsFerramenta({ corpus, dia, widgetAtivo, aoAbrir }: Props) {
  const ultimoDia = dia === DIA_MAX;
  const ordem = ultimoDia ? ['acordos_casal', ...ORDEM.filter((n) => n !== 'acordos_casal')] : [...ORDEM];

  return (
    <nav className="chips" aria-label="ferramentas">
      {ordem.map((nome) => {
        const f = corpus.ferramentas.find((x) => x.id === nome);
        if (!f) return null;
        const evidencia = ultimoDia && nome === 'acordos_casal';
        return (
          <button key={nome} type="button" className={`chip${evidencia ? ' chip--evidencia' : ''}`} disabled={widgetAtivo} onClick={() => aoAbrir(nome)}>
            <Icone nome={nome} />
            {f.rotulo_chip}
          </button>
        );
      })}
      <button type="button" className="chip chip--humano" onClick={() => aoAbrir('ponte_humana')}>
        <Icone nome="ponte_humana" />
        {corpus.microcopy.chip_pessoa}
      </button>
    </nav>
  );
}
