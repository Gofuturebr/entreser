import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin } from '../../api.ts';
import { dataCurta, mensagem, useCarregar } from '../../util.ts';
import { ComSenha } from './Entrada.tsx';

export function Admin() {
  return (
    <ComSenha>
      <Projetos />
    </ComSenha>
  );
}

function Projetos() {
  const lista = useCarregar(() => admin.projetos(), 'projetos');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const ir = useNavigate();

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const p = await admin.criarProjeto(nome);
      ir(`/admin/${p.slug}`);
    } catch (e2) {
      setErro(mensagem(e2));
    }
  }

  return (
    <main className="pagina larga">
      <h1>Projetos</h1>
      <form className="form-linha" onSubmit={criar}>
        <input aria-label="Nome do novo projeto" placeholder="Nome do novo projeto (ex.: Entre Ser)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="botao" type="submit" disabled={!nome.trim()}>
          Criar projeto
        </button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {lista.erro && <p className="erro">{lista.erro}</p>}
      {lista.dados?.length === 0 && <p className="caixa">Nenhum projeto ainda. Crie o primeiro acima.</p>}
      <ul className="lista-projetos">
        {lista.dados?.map((p) => (
          <li key={p.slug}>
            <Link to={`/admin/${p.slug}`} className="linha-conteudo">
              <span className="linha-titulo">
                {p.nome}
                <small>
                  {p.lotes.length} {p.lotes.length === 1 ? 'lote' : 'lotes'} · criado em {dataCurta(p.criadoEm)}
                </small>
              </span>
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
