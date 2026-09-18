import type { Corpus, VariacaoTravessia } from '../lib/types';
import { DIA_MAX } from '../lib/types';

// Marcador da travessia (02-design-spec.md §2.3): duas variações para teste
// com as fundadoras — "marcador" (texto discreto) e "pedras" (linha de 10 pontos).

type PropsMarcador = { dia: number; rotulo: string; variacao: VariacaoTravessia; aoAbrir: () => void; cabecalhoDia: string };

export function MarcadorTravessia({ dia, rotulo, variacao, aoAbrir, cabecalhoDia }: PropsMarcador) {
  return (
    <button type="button" className="marcador-travessia" onClick={aoAbrir} aria-label={`${cabecalhoDia}, ${rotulo}. ver a travessia`}>
      {variacao === 'marcador' ? (
        <span className="marcador-travessia__mono">D{dia} · {DIA_MAX}</span>
      ) : (
        <span className="pedras" aria-hidden="true">
          {Array.from({ length: DIA_MAX }, (_, i) => i + 1).map((d) => (
            <span key={d} className={`pedras__pedra${d < dia ? ' pedras__pedra--passada' : ''}${d === dia ? ' pedras__pedra--atual' : ''}`} />
          ))}
        </span>
      )}
      <span className="marcador-travessia__rotulo">
        {cabecalhoDia} · {rotulo}
      </span>
    </button>
  );
}

/** Caminho de pedras: usado na folha da travessia e no seletor do onboarding. */
export function CaminhoPedras({ dia, aoEscolher, className }: { dia: number; aoEscolher?: (d: number) => void; className?: string }) {
  const largura = 340;
  const altura = 96;
  const pontos = Array.from({ length: DIA_MAX }, (_, i) => {
    const t = i / (DIA_MAX - 1);
    const x = 22 + t * (largura - 44);
    const y = altura / 2 + Math.sin(t * Math.PI * 2) * 22;
    return { d: i + 1, x, y };
  });
  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg className={className ?? 'travessia__caminho'} viewBox={`0 0 ${largura} ${altura}`} role={aoEscolher ? 'radiogroup' : 'img'} aria-label="travessia de dez dias">
      <path d={caminho} fill="none" stroke="var(--cor-berinjela-linha)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7" />
      {pontos.map((p) => {
        const atual = p.d === dia;
        const passada = p.d < dia;
        const raio = atual ? 13 : 9;
        const fill = atual ? 'var(--cor-berinjela)' : passada ? 'var(--cor-rose-1)' : 'var(--cor-creme-escuro)';
        return (
          <g key={p.d} className={aoEscolher ? 'seletor-dia__pedra' : undefined} onClick={aoEscolher ? () => aoEscolher(p.d) : undefined} role={aoEscolher ? 'radio' : undefined} aria-checked={aoEscolher ? atual : undefined} aria-label={aoEscolher ? `dia ${p.d}` : undefined} tabIndex={aoEscolher ? 0 : undefined} onKeyDown={aoEscolher ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoEscolher(p.d); } } : undefined}>
            {aoEscolher && <circle cx={p.x} cy={p.y} r="22" fill="transparent" />}
            <ellipse cx={p.x} cy={p.y} rx={raio + 1} ry={raio - 1} fill={fill} stroke="var(--cor-berinjela-linha)" strokeWidth={atual ? 0 : 1} />
            {atual && <text x={p.x} y={p.y + 4} textAnchor="middle" fontFamily="var(--fonte-mono)" fontSize="11" fill="var(--cor-creme)">{p.d}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function FolhaTravessia({ corpus, dia }: { corpus: Corpus; dia: number }) {
  return (
    <div className="travessia">
      <CaminhoPedras dia={dia} />
      <p className="travessia__legenda">sem contagem regressiva — só para a gente saber onde está</p>
      <ol className="travessia__lista">
        {corpus.roteiros_diarios.map((r) => (
          <li key={r.dia} className={`travessia__item${r.dia === dia ? ' travessia__item--atual' : ''}`} aria-current={r.dia === dia ? 'step' : undefined}>
            <span className="mono">D{r.dia}</span>
            <span>{r.tema}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
