import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Apontamento, ProjetoAdmin as Projeto, ResultadoUpload, ResumoLote, Revisora } from '../../../../server/tipos.ts';
import { admin, api, urlArquivo } from '../../api.ts';
import { dataCurta, mensagem, nomeArquivo, useCarregar } from '../../util.ts';
import { VersaoDoApontamento } from '../../componentes/Apontamentos.tsx';
import { ordemDeLeitura, rota } from '../cliente/contexto.ts';
import { ComSenha } from './Entrada.tsx';

export function ProjetoAdmin() {
  return (
    <ComSenha>
      <Painel />
    </ComSenha>
  );
}

function Painel() {
  const slug = useParams().slug ?? '';
  const projeto = useCarregar(() => admin.projeto(slug), slug);
  const lotes = useCarregar(() => api.lotes(slug), slug);
  const revisoras = useCarregar(() => admin.revisoras(slug), slug);
  const apontamentos = useCarregar(() => admin.apontamentos(slug), slug);
  const ir = useNavigate();

  if (projeto.erro) return <main className="pagina larga"><p className="erro">{projeto.erro}</p><Link to="/admin">← Projetos</Link></main>;
  if (!projeto.dados) return <main className="pagina larga carregando">Carregando…</main>;
  const p = projeto.dados;

  const aposEnvio = () => {
    projeto.recarregar();
    lotes.recarregar();
    apontamentos.recarregar();
  };

  async function removerProjeto() {
    if (!window.confirm(`Apagar o projeto "${p.nome}" com todos os lotes, revisoras e apontamentos? Não dá para desfazer.`)) return;
    await admin.removerProjeto(slug);
    ir('/admin');
  }

  return (
    <main className="pagina larga">
      <Link to="/admin" className="voltar">← Projetos</Link>
      <h1>{p.nome}</h1>
      <LinkRevisoras slug={slug} />

      <div className="colunas">
        <div>
          <Envio projeto={p} aoEnviar={aposEnvio} />
          <Lotes projeto={p} aoMudar={aposEnvio} />
          <Revisoras slug={slug} lista={revisoras.dados ?? []} definir={revisoras.definir} />
        </div>
        <div>
          <Resumo lotes={lotes.dados ?? []} revisoras={revisoras.dados ?? []} />
          <Apontamentos slug={slug} lotes={lotes.dados ?? []} revisoras={revisoras.dados ?? []} lista={apontamentos.dados ?? []} aoMudar={apontamentos.recarregar} />
        </div>
      </div>

      <p className="rodape-perigo">
        <button type="button" className="link perigo" onClick={removerProjeto}>Apagar este projeto</button>
      </p>
    </main>
  );
}

function LinkRevisoras({ slug }: { slug: string }) {
  const url = `${window.location.origin}${rota.inicio(slug)}`;
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o link:', url);
    }
  }
  return (
    <div className="caixa caixa-link">
      <span className="rotulo">Link para as revisoras</span>
      <code>{url}</code>
      <div className="form-acoes">
        <a className="link" href={url} target="_blank" rel="noreferrer">Abrir</a>
        <button type="button" className="botao botao-secundario" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
      </div>
    </div>
  );
}

function Envio({ projeto, aoEnviar }: { projeto: Projeto; aoEnviar: () => void }) {
  const [lote, setLote] = useState('');
  const [nomeNovo, setNomeNovo] = useState('');
  const [planilha, setPlanilha] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoUpload | null>(null);
  const [erro, setErro] = useState('');
  const [chaveForm, setChaveForm] = useState(0);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const form = new FormData();
    const alvo = lote || nomeNovo.trim();
    if (alvo) form.append('lote', alvo);
    if (planilha) form.append('planilha', planilha);
    if (zip) form.append('zip', zip);
    setErro('');
    setResultado(null);
    setProgresso(0);
    try {
      setResultado(await admin.enviar(projeto.slug, form, setProgresso));
      setPlanilha(null);
      setZip(null);
      setChaveForm((k) => k + 1);
      aoEnviar();
    } catch (e2) {
      setErro(mensagem(e2));
    } finally {
      setProgresso(null);
    }
  }

  return (
    <section className="secao">
      <h2>Enviar conteúdos</h2>
      <form key={chaveForm} className="form-pilha" onSubmit={enviar}>
        <label htmlFor="lote">Lote</label>
        <select id="lote" value={lote} onChange={(e) => setLote(e.target.value)}>
          <option value="">Novo lote (ou o nome que vier no manifesto)</option>
          {projeto.lotes.map((l) => (
            <option key={l.chave} value={l.chave}>Atualizar: {l.nome}</option>
          ))}
        </select>
        {!lote && (
          <input aria-label="Nome do novo lote" placeholder="Nome do lote (ex.: Entender · F1)" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
        )}

        <label htmlFor="planilha">Planilha de Conteúdo (.xlsx)</label>
        <input
          id="planilha"
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setPlanilha(f);
            if (f && !lote && !nomeNovo) setNomeNovo(f.name.replace(/\.xlsx$/i, ''));
          }}
        />
        <label htmlFor="zip">Pastas de conteúdo (.zip)</label>
        <input id="zip" type="file" accept=".zip" onChange={(e) => setZip(e.target.files?.[0] ?? null)} />

        <details className="ajuda">
          <summary>O que posso enviar?</summary>
          <ul>
            <li><strong>Planilha + ZIP com as pastas</strong>: a planilha diz o que mostrar (Eixo → trilha, Trilha → tema) e cada linha encontra a pasta que começa com o ID (ex.: <code>C7.2-…</code>).</li>
            <li><strong>ZIP do lote com <code>trilhas.json</code></strong>: lido pelo manifesto JSON; o nome vem do próprio lote.</li>
            <li><strong>Só a planilha ou só o ZIP</strong>, num lote existente: troca essa parte e mantém a outra.</li>
            <li><strong>ZIP de um conteúdo</strong> (<code>conteudo.json</code> na raiz): substitui só esse conteúdo.</li>
          </ul>
          <p>Apontamentos e aprovações não se perdem: ficam presos ao ID do conteúdo. Se o conteúdo mudar, as aprovações antigas aparecem como “versão anterior”.</p>
        </details>

        {progresso !== null && (
          <div className="progresso" role="progressbar" aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.round(progresso * 100)}%` }} />
            <small>{progresso < 1 ? `Enviando… ${Math.round(progresso * 100)}%` : 'Lendo o lote…'}</small>
          </div>
        )}
        {erro && <p className="erro">{erro}</p>}
        <button className="botao" type="submit" disabled={(!planilha && !zip) || progresso !== null}>Enviar</button>
      </form>
      {resultado && <Resultado r={resultado} />}
    </section>
  );
}

function Resultado({ r }: { r: ResultadoUpload }) {
  return (
    <div className="caixa caixa-ok">
      <p>
        <strong>{r.tipo === 'conteudo' ? 'Conteúdo atualizado' : 'Lote instalado'}:</strong> {r.nome} · {r.conteudos}{' '}
        {r.conteudos === 1 ? 'conteúdo' : 'conteúdos'} · manifesto {r.manifesto === 'planilha' ? 'planilha' : 'JSON'}
      </p>
      {r.atualizados.length > 0 && <p>Mudaram desde o último envio: {r.atualizados.join(', ')}</p>}
      {r.avisos.length > 0 && (
        <details open={r.avisos.length <= 5}>
          <summary>{r.avisos.length} aviso(s)</summary>
          <ul className="pequeno">{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

function Lotes({ projeto, aoMudar }: { projeto: Projeto; aoMudar: () => void }) {
  if (projeto.lotes.length === 0) return null;
  async function remover(chave: string, nome: string) {
    if (!window.confirm(`Tirar o lote "${nome}" do projeto? Os apontamentos ficam guardados e voltam se o lote for enviado de novo.`)) return;
    await admin.removerLote(projeto.slug, chave);
    aoMudar();
  }
  return (
    <section className="secao">
      <h2>Lotes</h2>
      <ul className="lista-simples">
        {projeto.lotes.map((l) => (
          <li key={l.chave}>
            <span>
              <strong>{l.nome}</strong>
              <small>manifesto {l.manifesto === 'planilha' ? 'planilha' : 'JSON'} · enviado {dataCurta(l.enviadoEm)}</small>
            </span>
            <button type="button" className="link perigo" onClick={() => remover(l.chave, l.nome)}>remover</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Revisoras({ slug, lista, definir }: { slug: string; lista: Revisora[]; definir: (r: Revisora[]) => void }) {
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState('');
  const [erro, setErro] = useState('');

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      definir(await admin.criarRevisora(slug, nome, papel));
      setNome('');
      setPapel('');
    } catch (e2) {
      setErro(mensagem(e2));
    }
  }
  async function remover(r: Revisora) {
    if (!window.confirm(`Tirar ${r.nome} da lista? Os apontamentos dela continuam registrados.`)) return;
    definir(await admin.removerRevisora(slug, r.id));
  }

  return (
    <section className="secao">
      <h2>Revisoras</h2>
      <p className="suave pequeno">Quem abre o link escolhe o próprio nome nesta lista. Não há senha.</p>
      <ul className="lista-simples">
        {lista.map((r) => (
          <li key={r.id}>
            <span>
              <strong>{r.nome}</strong>
              {r.papel && <small>{r.papel}</small>}
            </span>
            <button type="button" className="link perigo" onClick={() => remover(r)}>remover</button>
          </li>
        ))}
      </ul>
      <form className="form-linha" onSubmit={adicionar}>
        <input aria-label="Nome" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input aria-label="Papel (opcional)" placeholder="Papel (opcional)" value={papel} onChange={(e) => setPapel(e.target.value)} />
        <button className="botao" type="submit" disabled={!nome.trim()}>Adicionar</button>
      </form>
      {erro && <p className="erro">{erro}</p>}
    </section>
  );
}

function Resumo({ lotes, revisoras }: { lotes: ResumoLote[]; revisoras: Revisora[] }) {
  if (lotes.length === 0) return null;
  const todos = lotes.flatMap((l) => Object.values(l.conteudos));
  return (
    <section className="secao">
      <h2>Andamento</h2>
      <table className="tabela">
        <thead>
          <tr><th>Trilha</th><th>Total</th><th className="c-aprovado">Aprovados</th><th className="c-ajustes">Ajustes</th><th className="c-pendente">Sem revisão</th></tr>
        </thead>
        <tbody>
          {lotes.flatMap((l) =>
            l.trilhas.map((t) => {
              const cs = Object.values(l.conteudos).filter((c) => c.trilhaId === t.id);
              const n = (s: string) => cs.filter((c) => c.status === s).length;
              return (
                <tr key={`${l.chave}/${t.id}`}>
                  <td>{lotes.length > 1 && <small>{l.nome} · </small>}{t.titulo}</td>
                  <td>{cs.length}</td><td>{n('aprovado')}</td><td>{n('ajustes')}</td><td>{n('pendente')}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
      {revisoras.length > 0 && (
        <ul className="lista-simples pequeno">
          {revisoras.map((r) => {
            const decididos = todos.filter((c) => c.decisoes.some((d) => d.revisoraId === r.id && !d.desatualizada)).length;
            return (
              <li key={r.id}><span>{r.nome}</span><span>{decididos} de {todos.length} decididos</span></li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type Filtro = 'abertos' | 'resolvidos' | 'todos';

function Apontamentos({ slug, lotes, revisoras, lista, aoMudar }: { slug: string; lotes: ResumoLote[]; revisoras: Revisora[]; lista: Apontamento[]; aoMudar: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>('abertos');
  const [revisora, setRevisora] = useState('');
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState(false);

  const visiveis = lista.filter(
    (a) => (filtro === 'todos' || (filtro === 'abertos' ? !a.resolvidoEm : !!a.resolvidoEm)) && (!revisora || String(a.revisoraId) === revisora),
  );
  // Agrupa por conteúdo, na ordem de leitura dos lotes; o que não está mais no lote vai para o fim.
  const ordem = ordemDeLeitura(lotes);
  const chave = (a: Apontamento) => `${a.lote}\u0000${a.conteudoId}`;
  const grupos = new Map<string, Apontamento[]>();
  for (const a of visiveis) grupos.set(chave(a), [...(grupos.get(chave(a)) ?? []), a]);
  const posicao = (k: string) => {
    const i = ordem.findIndex((o) => `${o.lote}\u0000${o.id}` === k);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const chaves = [...grupos.keys()].sort((a, b) => posicao(a) - posicao(b));

  async function alternar(a: Apontamento) {
    setErro('');
    try {
      await admin.resolver(slug, a.id, !a.resolvidoEm);
      aoMudar();
    } catch (e) {
      setErro(mensagem(e));
    }
  }
  async function exportar(formato: 'md' | 'csv') {
    setExportando(true);
    setErro('');
    try {
      await admin.exportar(slug, formato, filtro !== 'abertos');
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setExportando(false);
    }
  }

  return (
    <section className="secao">
      <h2>Apontamentos</h2>
      <div className="filtros">
        <div className="alternar">
          {(['abertos', 'resolvidos', 'todos'] as const).map((f) => (
            <button key={f} type="button" className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f[0]?.toUpperCase() + f.slice(1)} ({lista.filter((a) => f === 'todos' || (f === 'abertos' ? !a.resolvidoEm : !!a.resolvidoEm)).length})
            </button>
          ))}
        </div>
        <select aria-label="Revisora" value={revisora} onChange={(e) => setRevisora(e.target.value)}>
          <option value="">Todas as revisoras</option>
          {revisoras.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
      </div>
      <div className="form-acoes exportar">
        <span className="pequeno suave">Exportar {filtro === 'abertos' ? 'abertos' : 'todos'}:</span>
        <button type="button" className="botao botao-secundario" disabled={exportando} onClick={() => exportar('md')}>Markdown</button>
        <button type="button" className="botao botao-secundario" disabled={exportando} onClick={() => exportar('csv')}>CSV</button>
      </div>
      {erro && <p className="erro">{erro}</p>}
      {chaves.length === 0 && <p className="caixa">Nenhum apontamento {filtro === 'todos' ? '' : filtro} por aqui.</p>}
      {chaves.map((k) => {
        const aps = grupos.get(k) ?? [];
        const primeiro = aps[0];
        if (!primeiro) return null;
        const l = lotes.find((x) => x.chave === primeiro.lote);
        const c = l?.conteudos[primeiro.conteudoId];
        const trilha = l?.trilhas.find((t) => t.id === c?.trilhaId);
        return (
          <article key={k} className="grupo-apontamentos">
            <header>
              <a href={rota.conteudo(slug, primeiro.lote, primeiro.conteudoId)} target="_blank" rel="noreferrer">
                <span className="mono">{primeiro.conteudoId}</span> {c?.titulo ?? '(conteúdo fora do lote atual)'}
              </a>
              <small>{[lotes.length > 1 ? l?.nome : '', trilha?.titulo, trilha?.temas.find((t) => t.id === c?.temaId)?.titulo].filter(Boolean).join(' › ')}</small>
            </header>
            <ul className="apontamentos">
              {aps.map((a) => (
                <li key={a.id} className={a.resolvidoEm ? 'resolvido' : ''}>
                  <div className="apontamento-meta">
                    <span className="etiqueta">{a.alvo === 'imagem' ? 'Imagem' : a.alvo === 'formato' ? 'Formato' : 'Texto'}</span>
                    <strong>{a.revisora}</strong>
                    <span>{dataCurta(a.criadoEm)}</span>
                    <VersaoDoApontamento a={a} />
                    <label className="resolver">
                      <input type="checkbox" checked={!!a.resolvidoEm} onChange={() => alternar(a)} /> resolvido
                    </label>
                  </div>
                  <div className="apontamento-corpo">
                    {a.imagem && (
                      <a href={urlArquivo(slug, a.lote, a.imagem)} target="_blank" rel="noreferrer" title={nomeArquivo(a.imagem)}>
                        <img className="miniatura" src={urlArquivo(slug, a.lote, a.imagem)} alt={nomeArquivo(a.imagem)} loading="lazy" />
                      </a>
                    )}
                    <p>{a.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
