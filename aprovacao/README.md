# Aprovação de conteúdo

Painel para aprovar conteúdos com clientes. Você sobe a Planilha de Conteúdo e as pastas geradas pelo lote. As revisoras abrem um link, escolhem o próprio nome (sem login) e, em cada conteúdo, veem o título, a introdução, o texto, a peça renderizada e as imagens uma a uma. Elas podem pedir ajuste de texto ou formato, apontar ajustes em cada imagem e aprovar. Você acompanha tudo no admin e exporta os apontamentos em Markdown ou CSV.

É independente da Serena: tem seu próprio `package.json` e não usa nada do app da raiz.

## Rodar

Requer **Node 22.18 ou mais novo** (usa o SQLite embutido do Node; não há banco para instalar).

```bash
cd aprovacao
npm install
cp .env.exemplo .env      # defina ADMIN_SENHA
npm start                 # compila o front e sobe em http://localhost:3000
```

- Revisoras: `http://localhost:3000/p/<projeto>` (o link aparece no admin)
- Admin: `http://localhost:3000/admin`

Tudo o que o app guarda fica em `data/`: o banco `aprovacao.db` e os lotes enviados. Para fazer backup, copie essa pasta. Ela não vai para o git.

### Compartilhar com as clientes

- **Da sua máquina, durante a revisão:** rode `npm start` e exponha a porta com um túnel, por exemplo `cloudflared tunnel --url http://localhost:3000` ou `ngrok http 3000`. Mande o link `…/p/<projeto>` gerado.
- **Num servidor:** qualquer host que rode Node ou Docker **com disco persistente** (Railway, Render, Fly.io, uma VPS). Com Docker:

  ```bash
  docker build -t aprovacao .
  docker run -p 3000:3000 -e ADMIN_SENHA=… -v aprovacao-dados:/data aprovacao
  ```

## Como usar

1. **Admin → criar projeto** (ex.: "Entre Ser"). O link das revisoras ganha um sufixo aleatório, então não dá para adivinhá-lo pelo nome.
2. **Revisoras:** cadastre os nomes de quem vai revisar.
3. **Enviar conteúdos:** escolha o que subir:

   | Envio | O que acontece |
   |---|---|
   | Planilha (.xlsx) + ZIP com as pastas | A planilha é o manifesto: **Eixo → trilha**, **Trilha → tema**, ordem das linhas. Cada linha acha a pasta cujo nome começa com o ID (`C7.2-…` ou `C7.2`), em qualquer nível do ZIP. Linha sem pasta aparece só com os textos da planilha. |
   | ZIP do lote com `trilhas.json` | Lido pelo manifesto JSON da skill de lote (`trilhas.json` → `temas.json` → `conteudo.json`). |
   | Só a planilha, ou só o ZIP, num lote existente | Troca essa parte e mantém a outra. |
   | ZIP de um conteúdo (`conteudo.json` na raiz) | Substitui só aquele conteúdo. |

   Se a planilha tiver uma aba `Trilhas` com `ID | Título`, os temas aparecem pelo nome (senão, pelo ID, ex.: "T7").
4. **Mande o link** para as revisoras.
5. **Acompanhe** em "Andamento" e "Apontamentos". Marque como resolvido o que já foi ajustado e **exporte** em Markdown (para colar numa sessão de ajuste) ou CSV (para planilha).

### O que a revisora vê em cada conteúdo

- Título, objetivo, introdução e o texto (`texto.md` da pasta; sem ele, a coluna "Conteúdo" da planilha). Também aparece a "Modificação pós revisão", quando houver, e os outros campos da planilha em "Mais detalhes".
- Um campo para **pedir ajuste de texto ou formato**.
- A **peça** (`.html` da pasta) embutida, com opção de abrir em tela cheia.
- As **imagens, uma a uma**, cada uma com o seu campo de ajuste.
- **Aprovar** ou **Pedir ajustes** (decisão por revisora).

### Reenvios não apagam nada

Apontamentos e decisões ficam presos ao **ID do conteúdo**. Ao reenviar, o app compara o que a revisora vê (textos, peça, imagens). Se um conteúdo mudou, as decisões antigas dele aparecem como "versão anterior" e ele volta a pedir revisão. Os apontamentos continuam visíveis até você marcá-los como resolvidos.

### Arquivos servidos

Só são servidos a peça e as imagens. Pastas e arquivos que começam com `_` (rastro de produção, a própria planilha) não saem do servidor. A peça roda num iframe isolado (sandbox).

## Desenvolvimento

```bash
npm run dev         # servidor + Vite com recarga (http://localhost:3000)
npm run test        # testes do servidor (manifestos, ZIP, API)
npm run typecheck
npm run lint
npm run exemplo     # gera exemplo/lote-exemplo.zip e exemplo/planilha-exemplo.zip para testar o upload
```

- `server/`: Express + `node:sqlite`, roda TypeScript direto no Node (sem build).
  - `lote.ts` lê os dois manifestos;
  - `armazem.ts` instala os uploads;
  - `app.ts` define as rotas;
  - `exportar.ts` gera o Markdown e o CSV.
- `web/`: React + Vite, mobile-first.
- `exemplo/`: um lote fictício nos dois formatos (JSON e planilha + pastas).
