// Sobe tudo num processo só: API, arquivos dos lotes e o front.
// `npm start` (produção) serve o build de dist-web/; `npm run dev` usa o Vite em modo middleware.
import { existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import express from 'express';
import { criarApp, tratarErros } from './app.ts';
import { criarArmazem } from './armazem.ts';
import { abrirBanco } from './db.ts';

const raiz = resolve(import.meta.dirname, '..');
if (existsSync(join(raiz, '.env'))) process.loadEnvFile(join(raiz, '.env'));

const dev = process.argv.includes('--dev');
const porta = Number(process.env.PORT ?? 3000);
const dataDir = resolve(raiz, process.env.DATA_DIR ?? 'data');
mkdirSync(dataDir, { recursive: true });

let senhaAdmin = process.env.ADMIN_SENHA ?? '';
if (!senhaAdmin) {
  senhaAdmin = randomBytes(6).toString('hex');
  console.warn(`ADMIN_SENHA não definida. Senha temporária do admin (muda a cada reinício): ${senhaAdmin}`);
}

const banco = abrirBanco(join(dataDir, 'aprovacao.db'));
const armazem = criarArmazem(dataDir, banco);
const app = criarApp({ banco, armazem, senhaAdmin, dataDir });

if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: join(raiz, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const web = join(raiz, 'dist-web');
  if (!existsSync(join(web, 'index.html'))) {
    console.error('Front não compilado: rode `npm run build` (ou use `npm start`, que compila antes de subir).');
    process.exit(1);
  }
  app.use(express.static(web, { index: false, maxAge: '1h' }));
  app.get('/{*rota}', (_req, res) => res.sendFile(join(web, 'index.html')));
}
app.use(tratarErros);

app.listen(porta, () => {
  console.log(`Aprovação de conteúdo rodando em http://localhost:${porta}`);
  console.log(`Admin: http://localhost:${porta}/admin · dados em ${dataDir}`);
});
