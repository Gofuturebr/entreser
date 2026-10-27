import { Link } from 'react-router-dom';
import type { ResumoLote, StatusAgregado } from '../../../../server/tipos.ts';
import { ordemDeLeitura, rota, useProjeto } from './contexto.ts';

function contar(l: ResumoLote, trilhaId?: string) {
  const c: Record<StatusAgregado, number> = { aprovado: 0, ajustes: 0, pendente: 0 };
  for (const x of Object.values(l.conteudos)) if (!trilhaId || x.trilhaId === trilhaId) c[x.status]++;
  return c;
}

export function Inicio() {
  const { projeto, lotes, revisora } = useProjeto();
  const ordem = ordemDeLeitura(lotes);
  const minhaPendente = ordem.find(({ lote, id }) => {
    const c = lotes.find((l) => l.chave === lote)?.conteudos[id];
    return c && !c.decisoes.some((d) => d.revisoraId === revisora.id && !d.desatualizada);
  });

  return (
    <main className="pagina">
      <h1>{projeto.nome}</h1>
      {lotes.length === 0 ? (
        <p className="caixa">Ainda não há conteúdos para revisar aqui. Assim que a equipe enviar, eles aparecem nesta página.</p>
      ) : (
        <>
          <p className="suave">Escolha uma trilha. Em cada conteúdo você vê o texto, a peça e as imagens, e pode apontar ajustes ou aprovar.</p>
          {minhaPendente && (
            <Link className="botao botao-largo" to={rota.conteudo(projeto.slug, minhaPendente.lote, minhaPendente.id)}>
              Continuar de onde parei →
            </Link>
          )}
        </>
      )}
      {lotes.map((l) => {
        const total = contar(l);
        return (
          <section key={l.chave} className="bloco">
            {lotes.length > 1 && <h2>{l.nome}</h2>}
            <p className="contagem">
              {Object.keys(l.conteudos).length} conteúdos · <span className="c-aprovado">{total.aprovado} aprovados</span> ·{' '}
              <span className="c-ajustes">{total.ajustes} com ajustes</span> · <span className="c-pendente">{total.pendente} sem revisão</span>
            </p>
            <ul className="grade-trilhas">
              {l.trilhas.map((t) => {
                const c = contar(l, t.id);
                const n = c.aprovado + c.ajustes + c.pendente;
                return (
                  <li key={t.id}>
                    <Link to={rota.trilha(projeto.slug, l.chave, t.id)} className="cartao-trilha">
                      <span className="trilha-titulo">{t.titulo}</span>
                      {t.subtitulo && <span className="trilha-sub">{t.subtitulo}</span>}
                      {t.descricao && <span className="trilha-desc">{t.descricao}</span>}
                      <span className="trilha-conta">
                        {t.temas.length} {t.temas.length === 1 ? 'tema' : 'temas'} · {n} conteúdos
                      </span>
                      <span className="barra" aria-label={`${c.aprovado} aprovados, ${c.ajustes} com ajustes, ${c.pendente} sem revisão`}>
                        <span className="b-aprovado" style={{ flexGrow: c.aprovado }} />
                        <span className="b-ajustes" style={{ flexGrow: c.ajustes }} />
                        <span className="b-pendente" style={{ flexGrow: c.pendente }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
