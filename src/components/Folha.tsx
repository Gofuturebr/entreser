import { useEffect, type ReactNode } from 'react';

type Props = { titulo: string; aoFechar: () => void; rotuloFechar: string; children: ReactNode };

export function Folha({ titulo, aoFechar, rotuloFechar, children }: Props) {
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [aoFechar]);

  return (
    <div className="folha" onClick={aoFechar}>
      <div className="folha__painel" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <span className="folha__alca" aria-hidden="true" />
        <h2 className="folha__titulo">{titulo}</h2>
        {children}
        <button type="button" className="folha__fechar" onClick={aoFechar}>
          {rotuloFechar}
        </button>
      </div>
    </div>
  );
}
