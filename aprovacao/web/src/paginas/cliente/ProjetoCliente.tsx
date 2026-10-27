import { useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { api } from '../../api.ts';
import { gravarLocal, lerLocal, useCarregar } from '../../util.ts';
import { Contexto } from './contexto.ts';

export function ProjetoCliente() {
  const slug = useParams().slug ?? '';
  const projeto = useCarregar(() => api.projeto(slug), slug);
  const lotes = useCarregar(() => api.lotes(slug), slug);
  const chaveLocal = `aprovacao:${slug}:revisora`;
  const [revisoraId, setRevisoraId] = useState<number | null>(() => Number(lerLocal(chaveLocal)) || null);

  if (projeto.erro) return <Aviso texto={projeto.erro} />;
  if (lotes.erro && !lotes.dados) return <Aviso texto={lotes.erro} />;
  if (!projeto.dados || !lotes.dados) return <main className="pagina estreita carregando">Carregando…</main>;

  const p = projeto.dados;
  const revisora = p.revisoras.find((r) => r.id === revisoraId);
  const escolher = (id: number | null) => {
    gravarLocal(chaveLocal, id === null ? null : String(id));
    setRevisoraId(id);
  };

  if (!revisora)
    return (
      <main className="pagina estreita">
        <p className="suave pequeno">{p.nome}</p>
        <h1>Quem está revisando?</h1>
        <p className="suave">Toque no seu nome. Seus apontamentos e aprovações ficam registrados com ele.</p>
        {p.revisoras.length === 0 ? (
          <p className="caixa">Ainda não há revisoras cadastradas neste projeto. Avise a equipe que enviou o link.</p>
        ) : (
          <ul className="lista-nomes">
            {p.revisoras.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => escolher(r.id)}>
                  <span className="avatar" aria-hidden>
                    {r.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    {r.nome}
                    {r.papel && <small>{r.papel}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    );

  return (
    <Contexto.Provider value={{ projeto: p, lotes: lotes.dados, revisora, recarregarLotes: lotes.recarregar }}>
      <header className="topo">
        <Link to={`/p/${slug}`} className="topo-projeto">
          {p.nome}
        </Link>
        <span className="topo-revisora">
          {revisora.nome}
          <button type="button" className="link" onClick={() => escolher(null)}>
            trocar
          </button>
        </span>
      </header>
      <Outlet />
    </Contexto.Provider>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <main className="pagina estreita centro">
      <h1>Não consegui abrir</h1>
      <p className="suave">{texto}</p>
    </main>
  );
}
