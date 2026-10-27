import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Alvo, DetalheConteudo, StatusDecisao } from '../../../../server/tipos.ts';
import { api, urlArquivo } from '../../api.ts';
import { FormApontamento, ListaApontamentos } from '../../componentes/Apontamentos.tsx';
import { Markdown } from '../../componentes/Markdown.tsx';
import { QuemDecidiu, Selo } from '../../componentes/Selo.tsx';
import { AprovarItem, SeloVersao } from '../../componentes/Versao.tsx';
import { ITEM_TEXTO, itemImagem, itemPeca } from '../../../../server/itens.ts';
import { mensagem, nomeArquivo, useCarregar } from '../../util.ts';
import { ordemDeLeitura, rota, useProjeto } from './contexto.ts';

const TEXTO_LONGO = 1400;

export function Conteudo() {
  const { lote = '', id = '' } = useParams();
  const { projeto, lotes, revisora, recarregarLotes } = useProjeto();
  const det = useCarregar(() => api.conteudo(projeto.slug, lote, id), `${lote}/${id}`);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [lote, id]);

  if (det.erro && !det.dados)
    return (
      <main className="pagina">
        <p className="caixa">{det.erro}</p>
        <Link to={rota.inicio(projeto.slug)}>← Voltar às trilhas</Link>
      </main>
    );
  // Ao trocar de conteúdo, os dados antigos não podem aparecer com o novo endereço.
  if (!det.dados || det.dados.conteudo.id !== id || det.dados.lote.chave !== lote)
    return <main className="pagina carregando">Carregando…</main>;

  const d = det.dados;
  const c = d.conteudo;
  const atualizar = (novo: DetalheConteudo) => {
    det.definir(novo);
    recarregarLotes();
  };
  const apontar = async (alvo: Alvo, texto: string, imagem?: string) =>
    atualizar(await api.apontar(projeto.slug, lote, id, { revisoraId: revisora.id, alvo, texto, ...(imagem ? { imagem } : {}) }));
  const aprovar = (item: string) => async (aprovado: boolean) =>
    atualizar(await api.aprovarItem(projeto.slug, lote, id, revisora.id, item, aprovado));
  const botaoAprovado = (item: string) => <AprovarItem info={d.itens[item]} revisoraId={revisora.id} aoMudar={aprovar(item)} />;
  const aprovadoPorMim = (item: string) => !!d.itens[item]?.aprovacoes.some((a) => a.revisoraId === revisora.id && !a.desatualizada);

  const ordem = ordemDeLeitura(lotes);
  const pos = ordem.findIndex((o) => o.lote === lote && o.id === id);
  const anterior = pos > 0 ? ordem[pos - 1] : undefined;
  const proximo = pos >= 0 ? ordem[pos + 1] : undefined;
  const apontamentosTexto = d.apontamentos.filter((a) => a.alvo !== 'imagem');

  return (
    <main className="pagina pagina-conteudo" key={`${lote}/${id}`}>
      <nav className="migalhas">
        {d.trilha ? (
          <Link to={rota.trilha(projeto.slug, lote, d.trilha.id)}>← {d.trilha.titulo}</Link>
        ) : (
          <Link to={rota.inicio(projeto.slug)}>← Trilhas</Link>
        )}
        {d.tema && <span> › {d.tema.titulo}</span>}
      </nav>

      <header className="cabecalho-conteudo">
        <div className="fichas">
          <span className="ficha mono">{c.id}</span>
          {c.formato && <span className="ficha">{c.formato}</span>}
          {c.duracao && <span className="ficha">{c.duracao}</span>}
        </div>
        <h1>{c.titulo}</h1>
        <div className="estado-conteudo">
          <Selo status={d.resumo.status} abertos={d.resumo.abertos} />
          <SeloVersao versao={d.resumo.versao} atualizadoEm={d.resumo.atualizadoEm} rotulo="atualizado" />
          <QuemDecidiu decisoes={d.resumo.decisoes} />
        </div>
        {d.resumo.decisoes.some((x) => x.desatualizada) && (
          <p className="caixa caixa-info">Este conteúdo foi atualizado depois da última revisão. Vale olhar de novo.</p>
        )}
      </header>

      {c.modificacao && (
        <p className="caixa caixa-info">
          <strong>Modificação pós revisão:</strong> {c.modificacao}
        </p>
      )}

      <section className={`secao ${aprovadoPorMim(ITEM_TEXTO) ? 'aprovada' : ''}`}>
        <h2 className="titulo-com-selo">
          Texto
          <SeloVersao versao={d.itens[ITEM_TEXTO]?.versao ?? 1} atualizadoEm={d.itens[ITEM_TEXTO]?.atualizadoEm ?? null} />
        </h2>
        {c.objetivo && (
          <div className="campo">
            <span className="rotulo">Objetivo</span>
            <p>{c.objetivo}</p>
          </div>
        )}
        {c.introducao && (
          <div className="campo">
            <span className="rotulo">Introdução</span>
            <p>{c.introducao}</p>
          </div>
        )}
        {c.texto ? (
          <div className="campo">
            <span className="rotulo">Conteúdo</span>
            <TextoLongo texto={c.texto} />
          </div>
        ) : (
          c.conteudoPlanejado && (
            <div className="campo">
              <span className="rotulo">Conteúdo</span>
              <p>{c.conteudoPlanejado}</p>
            </div>
          )
        )}
        <MaisDetalhes d={d} />
        <ListaApontamentos itens={apontamentosTexto} mostrarAlvo />
        <FormApontamento
          alvos={['texto', 'formato']}
          rotulo="Pedir ajuste de texto ou formato"
          dica="Ex.: trocar a palavra X por Y no 2º parágrafo; este conteúdo funcionaria melhor como carrossel…"
          aoEnviar={(alvo, texto) => apontar(alvo, texto)}
          extra={botaoAprovado(ITEM_TEXTO)}
        />
      </section>

      <Pecas d={d} slug={projeto.slug} lote={lote} botaoAprovado={botaoAprovado} aprovadoPorMim={aprovadoPorMim} />

      {c.imagens.length > 0 && (
        <section className="secao">
          <h2>Imagens ({c.imagens.length})</h2>
          <p className="suave pequeno">Aprove ou aponte ajustes em cada imagem, uma a uma.</p>
          <ol className="imagens">
            {c.imagens.map((img, i) => {
              const url = urlArquivo(projeto.slug, lote, img);
              return (
                <li key={img} className={`imagem ${aprovadoPorMim(itemImagem(img)) ? 'aprovada' : ''}`}>
                  <span className="imagem-numero">
                    Imagem {i + 1} de {c.imagens.length}
                    <SeloVersao versao={d.itens[itemImagem(img)]?.versao ?? 1} atualizadoEm={d.itens[itemImagem(img)]?.atualizadoEm ?? null} />
                  </span>
                  <a href={url} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                    <img src={url} alt={`Imagem ${i + 1}: ${nomeArquivo(img)}`} loading="lazy" />
                  </a>
                  <ListaApontamentos itens={d.apontamentos.filter((a) => a.imagem === img)} />
                  <FormApontamento
                    alvos={['imagem']}
                    rotulo={`Ajuste na imagem ${i + 1}`}
                    dica="O que mudar nesta imagem?"
                    aoEnviar={(alvo, texto) => apontar(alvo, texto, img)}
                    extra={botaoAprovado(itemImagem(img))}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <nav className="vizinhos">
        {anterior ? <Link to={rota.conteudo(projeto.slug, anterior.lote, anterior.id)}>← {anterior.id}</Link> : <span />}
        {proximo && <Link to={rota.conteudo(projeto.slug, proximo.lote, proximo.id)}>{proximo.id} →</Link>}
      </nav>

      <Decisao d={d} revisoraId={revisora.id} aoDecidir={async (s) => atualizar(await api.decidir(projeto.slug, lote, id, revisora.id, s))} />
    </main>
  );
}

function TextoLongo({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(texto.length <= TEXTO_LONGO);
  return (
    <div className={aberto ? '' : 'recolhido'}>
      <Markdown texto={texto} />
      {!aberto && (
        <button type="button" className="link ler-tudo" onClick={() => setAberto(true)}>
          Ler o texto completo
        </button>
      )}
    </div>
  );
}

function MaisDetalhes({ d }: { d: DetalheConteudo }) {
  const c = d.conteudo;
  const linhas: [string, string][] = [
    ['Conteúdo planejado', c.texto ? c.conteudoPlanejado : ''],
    ['Tags', c.tags.join(' · ')],
    ['Conteúdos relacionados', c.relacionados],
    ['Chancela', c.chancela],
    ['Observações', c.observacoes],
  ];
  const visiveis = linhas.filter(([, v]) => v);
  if (visiveis.length === 0) return null;
  return (
    <details className="detalhes">
      <summary>Mais detalhes da planilha</summary>
      <dl>
        {visiveis.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

type PropsPecas = {
  d: DetalheConteudo;
  slug: string;
  lote: string;
  botaoAprovado: (item: string) => ReactNode;
  aprovadoPorMim: (item: string) => boolean;
};

function Pecas({ d, slug, lote, botaoAprovado, aprovadoPorMim }: PropsPecas) {
  const c = d.conteudo;
  const [aba, setAba] = useState(0);
  if (c.pecas.length === 0) {
    if (c.estado === 'erro')
      return (
        <section className="secao">
          <h2>Peça</h2>
          <p className="caixa">A peça deste conteúdo não pôde ser gerada{c.mensagem ? `: ${c.mensagem}` : '.'}</p>
        </section>
      );
    if (c.estado === 'pendente' || c.estado === 'gerada')
      return (
        <section className="secao">
          <h2>Peça</h2>
          <p className="caixa">A peça deste conteúdo ainda está em produção.</p>
        </section>
      );
    return null;
  }
  const peca = c.pecas[Math.min(aba, c.pecas.length - 1)];
  if (!peca) return null;
  const url = urlArquivo(slug, lote, peca.html);
  const item = itemPeca(peca.html);
  const info = d.itens[item];
  return (
    <section className={`secao ${aprovadoPorMim(item) ? 'aprovada' : ''}`}>
      <h2 className="titulo-com-selo">
        {c.pecas.length > 1 ? 'Peças' : 'Peça'}
        <SeloVersao versao={info?.versao ?? 1} atualizadoEm={info?.atualizadoEm ?? null} />
      </h2>
      {c.pecas.length > 1 && (
        <div className="alternar">
          {c.pecas.map((p, i) => (
            <button key={p.html} type="button" className={i === aba ? 'ativo' : ''} onClick={() => setAba(i)}>
              {p.skin || `Peça ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div className="moldura-peca">
        <iframe key={url} src={url} title={`Peça ${peca.skin || ''} de ${c.titulo}`} sandbox="allow-scripts allow-popups" loading="lazy" />
      </div>
      <div className="acoes-peca">
        {botaoAprovado(item)}
        <a className="link pequeno" href={url} target="_blank" rel="noreferrer">
          Abrir em tela cheia ↗
        </a>
      </div>
    </section>
  );
}

function Decisao({ d, revisoraId, aoDecidir }: { d: DetalheConteudo; revisoraId: number; aoDecidir: (s: StatusDecisao) => Promise<void> }) {
  const minha = d.resumo.decisoes.find((x) => x.revisoraId === revisoraId);
  const atual = minha && !minha.desatualizada ? minha.status : null;
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function decidir(s: StatusDecisao) {
    if (atual === s) return; // tocar de novo não desfaz: para mudar, toca-se no outro botão
    setEnviando(true);
    setErro('');
    try {
      await aoDecidir(s);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="barra-decisao">
      {erro && <p className="erro">{erro}</p>}
      <p className="pequeno">
        {atual === 'aprovado' ? 'Você aprovou este conteúdo.' : atual === 'ajustes' ? 'Você pediu ajustes neste conteúdo.' : 'Sua decisão sobre este conteúdo:'}
      </p>
      <div className="decisao-botoes">
        <button type="button" className={`botao botao-ajustes ${atual === 'ajustes' ? 'ativo' : ''}`} disabled={enviando} aria-pressed={atual === 'ajustes'} onClick={() => decidir('ajustes')}>
          Pedir ajustes
        </button>
        <button type="button" className={`botao botao-aprovar ${atual === 'aprovado' ? 'ativo' : ''}`} disabled={enviando} aria-pressed={atual === 'aprovado'} onClick={() => decidir('aprovado')}>
          {atual === 'aprovado' ? '✓ Aprovado' : 'Aprovar'}
        </button>
      </div>
    </div>
  );
}
