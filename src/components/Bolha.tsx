import type { MensagemTexto, Microcopy } from '../lib/types';

type Props = { mensagem: MensagemTexto; microcopy: Microcopy; fioRota: boolean };

function Concha() {
  return (
    <svg viewBox="0 0 64 64" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M32 8C18 8 8 22 8 36c0 6 3 12 8 16l16 4 16-4c5-4 8-10 8-16C56 22 46 8 32 8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 8v48M32 8c-8 10-12 22-14 44M32 8c8 10 12 22 14 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function Bolha({ mensagem, microcopy, fioRota }: Props) {
  const { texto, selo, dia, rota, streaming } = mensagem.payload;
  const ehSerena = mensagem.autor === 'serena';
  const classes = ['bolha', ehSerena ? 'bolha--serena' : 'bolha--usuaria'];
  if (selo === 'mensagem_do_dia') classes.push('bolha--dia');
  if (fioRota && ehSerena && rota && !selo) classes.push(`bolha--fio-${rota}`);

  return (
    <div className={classes.join(' ')} aria-live={streaming ? 'polite' : undefined}>
      {selo === 'mensagem_do_dia' && (
        <div className="selo-dia">
          <Concha />
          <span>{microcopy.selo_dia ?? 'mensagem do dia'}</span>
          {dia !== undefined && <span className="selo-dia__mono">· D{dia}</span>}
        </div>
      )}
      <p>{texto}</p>
    </div>
  );
}
