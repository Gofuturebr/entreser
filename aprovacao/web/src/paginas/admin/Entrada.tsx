import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { admin, aoSairAdmin, senhaAdmin } from '../../api.ts';
import { mensagem } from '../../util.ts';

/** Mostra o login enquanto não há senha válida na sessão. */
export function ComSenha({ children }: { children: ReactNode }) {
  const [tem, setTem] = useState(() => !!senhaAdmin.ler());
  useEffect(() => {
    const sair = () => setTem(false);
    aoSairAdmin.addEventListener('sair', sair);
    return () => aoSairAdmin.removeEventListener('sair', sair);
  }, []);
  return tem ? <>{children}</> : <Login aoEntrar={() => setTem(true)} />;
}

function Login({ aoEntrar }: { aoEntrar: () => void }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await admin.entrar(senha);
      senhaAdmin.salvar(senha);
      aoEntrar();
    } catch (e2) {
      setErro(mensagem(e2));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pagina estreita">
      <h1>Admin</h1>
      <form className="form-pilha" onSubmit={entrar}>
        <label htmlFor="senha">Senha do admin</label>
        <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
        {erro && <p className="erro">{erro}</p>}
        <button className="botao" type="submit" disabled={!senha || enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
