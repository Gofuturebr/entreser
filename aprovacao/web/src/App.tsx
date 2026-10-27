import { Link, Route, Routes } from 'react-router-dom';
import { Admin } from './paginas/admin/Admin.tsx';
import { ProjetoAdmin } from './paginas/admin/ProjetoAdmin.tsx';
import { Conteudo } from './paginas/cliente/Conteudo.tsx';
import { Inicio } from './paginas/cliente/Inicio.tsx';
import { ProjetoCliente } from './paginas/cliente/ProjetoCliente.tsx';
import { Trilha } from './paginas/cliente/Trilha.tsx';

export function App() {
  return (
    <Routes>
      <Route path="/p/:slug" element={<ProjetoCliente />}>
        <Route index element={<Inicio />} />
        <Route path="l/:lote/t/:trilha" element={<Trilha />} />
        <Route path="l/:lote/c/:id" element={<Conteudo />} />
      </Route>
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/:slug" element={<ProjetoAdmin />} />
      <Route path="*" element={<Boas />} />
    </Routes>
  );
}

function Boas() {
  return (
    <main className="pagina estreita centro">
      <h1>Aprovação de conteúdo</h1>
      <p className="suave">Se você vai revisar conteúdos, abra o link que recebeu da equipe.</p>
      <p>
        <Link to="/admin">Entrar no admin</Link>
      </p>
    </main>
  );
}
