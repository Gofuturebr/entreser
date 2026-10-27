import { Link, useParams } from 'react-router-dom';
import { QuemDecidiu, Selo } from '../../componentes/Selo.tsx';
import { rota, useProjeto } from './contexto.ts';

export function Trilha() {
  const { lote: chave = '', trilha: trilhaId = '' } = useParams();
  const { lotes, projeto } = useProjeto();
  const lote = lotes.find((l) => l.chave === chave);
  const trilha = lote?.trilhas.find((t) => t.id === trilhaId);
  if (!lote || !trilha)
    return (
      <main className="pagina">
        <p className="caixa">Esta trilha não está mais disponível.</p>
        <Link to={rota.inicio(projeto.slug)}>← Voltar</Link>
      </main>
    );

  return (
    <main className="pagina">
      <Link to={rota.inicio(projeto.slug)} className="voltar">
        ← Trilhas
      </Link>
      <h1>
        {trilha.titulo}
        {trilha.subtitulo && <span className="sub"> · {trilha.subtitulo}</span>}
      </h1>
      {trilha.descricao && <p className="suave">{trilha.descricao}</p>}
      {trilha.temas.map((tema) => (
        <section key={tema.id} className="bloco">
          <h2>
            {tema.titulo !== tema.id && <span className="mono">{tema.id} · </span>}
            {tema.titulo}
          </h2>
          {tema.descricao && <p className="suave pequeno">{tema.descricao}</p>}
          <ul className="lista-conteudos">
            {tema.itens.map((i) => {
              const c = lote.conteudos[i.id];
              return (
                <li key={`${i.id}-${i.ref}`}>
                  <Link to={rota.conteudo(projeto.slug, lote.chave, i.id)} className="linha-conteudo">
                    <span className="mono">
                      {i.id}
                      {c && c.versao > 1 && <span className="selo-versao selo-versao-mini">v{c.versao}</span>}
                    </span>
                    <span className="linha-titulo">
                      {i.titulo}
                      {c?.formato && <small>{c.formato}</small>}
                      {i.ref && <small>Também aparece em outro tema</small>}
                      {c && c.decisoes.length > 0 && <small><QuemDecidiu decisoes={c.decisoes} /></small>}
                    </span>
                    {c && <Selo status={c.status} abertos={c.abertos} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
