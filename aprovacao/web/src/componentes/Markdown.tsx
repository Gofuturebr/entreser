import type { ReactNode } from 'react';

// Markdown mínimo para o texto.md do lote: títulos (#), listas (- / 1.),
// **negrito** e *itálico*. Cada linha é um parágrafo (padrão do lote).
// Gera elementos React, nunca HTML cru.

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((parte, i) => {
    if (/^\*\*[^*]+\*\*$/.test(parte)) return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(parte)) return <em key={i}>{parte.slice(1, -1)}</em>;
    return parte;
  });
}

export function Markdown({ texto }: { texto: string }) {
  const blocos: ReactNode[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;
  const fecharLista = () => {
    if (!lista) return;
    const itens = lista.itens.map((t, i) => <li key={i}>{inline(t)}</li>);
    blocos.push(lista.ordenada ? <ol key={blocos.length}>{itens}</ol> : <ul key={blocos.length}>{itens}</ul>);
    lista = null;
  };
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    const item = /^([-*•]|\d+[.)])\s+(.*)$/.exec(linha);
    if (item) {
      const ordenada = /\d/.test(item[1] ?? '');
      if (lista && lista.ordenada !== ordenada) fecharLista();
      lista ??= { ordenada, itens: [] };
      lista.itens.push(item[2] ?? '');
      continue;
    }
    fecharLista();
    if (!linha) continue;
    const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
    if (titulo) blocos.push(<h4 key={blocos.length}>{inline(titulo[2] ?? '')}</h4>);
    else blocos.push(<p key={blocos.length}>{inline(linha)}</p>);
  }
  fecharLista();
  return <div className="markdown">{blocos}</div>;
}
