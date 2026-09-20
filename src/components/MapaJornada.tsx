import type { Percurso } from '../lib/types';

// Mapa do Percurso: um caminho de 7 pedras, de cima para baixo. A etapa
// escolhida cresce; as anteriores ficam rosê (atravessadas); as seguintes,
// em creme. É uma travessia, não uma régua (02-design-spec.md §2.3).

type Props = {
  percurso: Percurso;
  faseAtual: number | null;
  aoEscolher?: (numero: number) => void;
};

export function MapaJornada({ percurso, faseAtual, aoEscolher }: Props) {
  const passo = 76;
  const largura = 340;
  const altura = passo * percurso.fases.length + 16;
  const pontos = percurso.fases.map((f, i) => {
    const y = 40 + i * passo;
    const x = 44 + (i % 2 === 0 ? 0 : 28) + Math.sin(i * 1.3) * 6;
    return { f, x, y };
  });
  const caminho = pontos
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const a = pontos[i - 1];
      if (!a) return '';
      return `C${a.x},${a.y + passo / 2} ${p.x},${p.y - passo / 2} ${p.x},${p.y}`;
    })
    .join(' ');
  const interativo = Boolean(aoEscolher);

  return (
    <svg className="mapa-jornada" viewBox={`0 0 ${largura} ${altura}`} role={interativo ? 'radiogroup' : 'img'} aria-label={percurso.microcopy.jornada_titulo}>
      <path d={caminho} fill="none" stroke="var(--cor-berinjela-linha)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7" />
      {pontos.map(({ f, x, y }) => {
        const atual = faseAtual === f.numero;
        const passada = faseAtual !== null && f.numero < faseAtual;
        const raio = atual ? 15 : 10;
        const fill = atual ? 'var(--cor-berinjela)' : passada ? 'var(--cor-rose-1)' : 'var(--cor-creme-escuro)';
        return (
          <g
            key={f.numero}
            className={interativo ? 'mapa-jornada__pedra' : undefined}
            role={interativo ? 'radio' : undefined}
            aria-checked={interativo ? atual : undefined}
            aria-label={interativo ? `${percurso.microcopy.rotulo_etapa} ${f.numero}: ${f.situacao}` : undefined}
            tabIndex={interativo ? 0 : undefined}
            onClick={aoEscolher ? () => aoEscolher(f.numero) : undefined}
            onKeyDown={
              aoEscolher
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      aoEscolher(f.numero);
                    }
                  }
                : undefined
            }
          >
            <rect x="0" y={y - passo / 2} width={largura} height={passo} fill="transparent" />
            {f.ativa && <circle cx={x} cy={y} r={raio + 6} fill="none" stroke="var(--cor-verde-mar-linha)" strokeWidth="1.5" strokeDasharray="2 4" />}
            <ellipse cx={x} cy={y} rx={raio + 1} ry={raio - 1} fill={fill} stroke="var(--cor-berinjela-linha)" strokeWidth={atual ? 0 : 1} />
            {atual && (
              <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--fonte-mono)" fontSize="11" fill="var(--cor-creme)">
                {f.numero}
              </text>
            )}
            <text x={x + 30} y={y - 6} fontFamily="var(--fonte-mono)" fontSize="11" letterSpacing="0.04em" fill={atual ? 'var(--cor-berinjela)' : 'var(--cor-berinjela-suave)'}>
              E{f.numero} · {f.lema}
            </text>
            <text x={x + 30} y={y + 12} fontFamily="var(--fonte-titulo)" fontWeight={atual ? 700 : 600} fontSize={atual ? 15 : 14} fill={atual ? 'var(--cor-berinjela)' : 'var(--cor-berinjela-suave)'}>
              {f.nome}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
