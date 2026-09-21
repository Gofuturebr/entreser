# SERENA · Degrau B — Especificação de build (para Claude Code)

> **O que é isto:** especificação para construir o protótipo conversacional da Serena (Degrau B do plano de MVP) — uma página de chat standalone que simula a companheira de travessia dos 10 dias da espera (fase E5 do Percurso EntreSer). Não é produto de produção: é bancada de teste de interface, prompt e guardrails, para ser usada pelas 3 fundadoras e por 5–8 tentantes convidadas em ambiente controlado.
>
> **Documento de precedência superior:** `serena-documento-produto-interacoes.md` (specs/03-product-interactions.md) é a fonte de verdade sobre O QUE a Serena faz e diz em cada fase — este documento aqui trata de COMO isso é construído tecnicamente. Em conflito de conteúdo/comportamento, o documento de produto vence (ver sua §6 — Governança).

---

## 1. Contexto do produto (leia antes de codar)

- **Entre Ser** é uma marca de saúde mental para "tentantes" (mulheres em tratamento de fertilidade/FIV). Posicionamento inegociável: **"vendemos atravessar melhor — nunca gravidez"**.
- **Serena** é a companheira conversacional 1:1. O MVP cobre apenas a fase **E5 · Habitar o Presente**: os 10 dias entre a transferência embrionária e o exame beta-hCG (a "2WW"), pico documentado de ansiedade com vácuo de suporte clínico.
- O agente opera **3 rotas** (mesma taxonomia do produto): **Entender** (dúvida clínica → responde só a partir do corpus curado), **Bem-Estar** (emoção → acolhe, valida, nunca aconselha clinicamente), **Preparar** (aciona uma das 3 ferramentas scriptadas).
- A Serena **não é dispositivo médico**: nunca interpreta exame, dose, sintoma ou resultado; nunca prevê desfecho; diante de crise, escala para humano.
- **Trava de escopo:** o Percurso tem 7 fases (E1–E7), mas só E5 está em implementação. Não construir corpus, prompt ou telas para outras fases, mesmo que apareçam referenciadas na documentação de produto.

## 2. Escopo do Degrau B

**Construir:** uma aplicação de chat de página única, mobile-first, em pt-BR, que:
1. Faz onboarding mínimo (2 perguntas)
2. Entrega a "mensagem do dia" proativa conforme o dia da espera (D1–D10)
3. Sustenta conversa livre com um LLM sob prompt controlado
4. Oferece 3 ferramentas como fluxos scriptados (sem LLM)
5. Detecta sinais de crise e aciona o protocolo Ponte Humana
6. Registra as conversas localmente para revisão da psicóloga (auditoria)

**NÃO construir (fora de escopo, não "fazer a mais"):** integração WhatsApp, backend de produção, contas/login, RAG dinâmico/vector store, analytics de terceiros, notificações push, histórico multi-dispositivo, qualquer coleta de dado além do declarado no onboarding.

## 3. Stack sugerida

- **Front:** Vite + React (ou HTML/JS vanilla, a critério — o app é pequeno). CSS próprio com os tokens da marca (ver doc de requisitos de interface, entregue junto).
- **LLM:** API Anthropic, modelo Sonnet mais recente, com streaming. `max_tokens` ≤ 600 por resposta (controle de custo e de verborragia — a Serena fala pouco).
- **Chave de API:** NUNCA no client. Subir um proxy mínimo (Node/Express ou serverless de 1 endpoint) que injeta `ANTHROPIC_API_KEY` de variável de ambiente e repassa `POST /chat` → `/v1/messages`.
- **Persistência:** `localStorage` apenas (nome, dia, histórico da sessão). Nada em servidor.

## 4. Arquitetura de conteúdo — o corpus é um arquivo, não código

Todo o conteúdo do agente vive em **`corpus/corpus_e5.json`**, carregado em runtime. O código nunca hardcoda texto clínico ou de acolhimento. Motivo: o corpus passa por chancela da psicóloga e é versionado independentemente do app (regra do projeto: "regras versionadas + trilha de auditoria").

```json
{
  "versao": "0.1-NAO-CHANCELADO",
  "roteiros_diarios": [
    { "dia": 1, "tema": "A chegada", "mensagem_proativa": "...", "intencao": "..." }
    // ... D1 a D10
  ],
  "faq": [
    { "id": "progesterona", "gatilhos": ["sintoma", "cólica", "seio"], "resposta_base": "...", "fonte": "ebook_fase2" }
    // ~15-20 dúvidas recorrentes da E5
  ],
  "acolhimento": [
    { "contexto": "medo_do_resultado", "frases_validadas": ["..."] }
  ],
  "ferramentas": [
    { "id": "sos_google", "nome": "SOS Não Dê um Google", "passos": ["..."] },
    { "id": "plano_espera", "nome": "Meu Plano da Espera", "passos": ["..."] },
    { "id": "acordos_casal", "nome": "Acordos para o dia do teste", "passos": ["..."] }
  ],
  "cards_microlearning": [
    { "id": "progesterona-01", "eixo": "entender", "dias_sugeridos": [2, 3], "titulo": "Por que os sintomas mentem", "resumo_1_linha": "...", "status": "mockup", "asset": "cards/progesterona-01.png" }
    // vinculados às entradas do faq e aos roteiros por dia; status: "mockup" → "chancelado"
  ],
  "escalonamento": {
    "mensagem_ponte_humana": "...",
    "contatos": { "equipe": "<definir>" }
  }
}
```

> **Status:** o corpus real ainda não existe (depende da redação dos roteiros D1–D10 a partir da curadoria de E5 e da chancela psicológica). Para o build, criar `corpus_e5.exemplo.json` com placeholders claramente marcados `[PENDENTE DE CHANCELA]` — o app deve exibir um banner "protótipo · conteúdo não validado" enquanto `versao` contiver `NAO-CHANCELADO`.

## 5. Comportamento do agente

### 5.1 Montagem do prompt (a cada chamada)
O prompt de sistema é um template com slots, montado no proxy (não no client):

1. **Identidade e tom:** "Você é Serena, companheira de travessia do Entre Ser…" + arquétipo (sábia acolhedora: verdadeira sem ser dura, nomeadora, traduzida, sem pressa) + respostas curtas (2–5 frases), uma pergunta no máximo.
2. **Regras duras (nesta ordem):**
   - Nunca interpretar exames, doses, sintomas ou resultados; sempre encerrar dúvidas clínicas com variação de "quem pode ler isso com você é a sua equipe médica".
   - Nunca prometer, prever ou estimar desfecho da tentativa.
   - Vocabulário proibido: "falhou/falha", "fracasso", "taxa de sucesso", "paciente", "relógio biológico", "é só relaxar" (e equivalentes). Substituições do Tom e Voz: ex. "faz sentido você estar assim".
   - Nunca sugerir que ansiedade ou estresse afetam a implantação (é falso — Boivin 2011 — e culpabiliza).
   - Diante de qualquer sinal de risco (desesperança profunda, ideação, pânico), NÃO seguir a conversa: responder apenas com a mensagem de Ponte Humana do corpus.
3. **Estado:** nome, dia atual (D1–D10), data.
4. **Corpus:** o JSON inteiro serializado (o escopo E5 cabe em contexto; não usar RAG).
5. **Roteamento:** instrução para classificar internamente cada mensagem em Entender / Bem-Estar / Preparar e responder conforme a rota (Preparar → invocar a ferramenta pelo mecanismo do §10, nunca descrevê-la ou executá-la em texto livre).
6. **Convite aos cards de microlearning:** quando a resposta (rotas Entender ou Bem-Estar) tocar um tema que tenha card vinculado no corpus, encerrar com um convite curto e sem pressão ("quer ver um card rapidinho sobre isso?") + invocação do componente `card_micro` (§10.8). O convite nunca é obrigação — "agora não" é resposta completa — e um card dispensado não é reoferecido na mesma sessão.

### 5.2 Guardrails fora do prompt (código)
- **Pré-filtro de crise (client + proxy):** lista de termos-gatilho (definida no corpus, não no código) → curto-circuito: não chama o LLM, renderiza o card Ponte Humana. Determinístico > probabilístico para segurança.
- **Pós-filtro de vocabulário:** checagem simples da resposta contra a lista proibida; em caso de match, descartar e substituir por resposta neutra de acolhimento + log do incidente.
- **Timeout/erro da API:** mensagem de erro no Tom e Voz (nunca "falha ao carregar"; usar ex. "não consegui te responder agora — tenta de novo em um instante?").

### 5.3 Mensagem proativa
Ao abrir o app no dia N (ou ao avançar o dia manualmente — ver §6), a Serena envia a `mensagem_proativa` do roteiro do dia como primeira mensagem, com selo visual "mensagem do dia · D6 de 10".

## 6. Funcionalidades e critérios de aceite

| # | Funcionalidade | Critério de aceite |
|---|---|---|
| 1 | Onboarding | 2 perguntas: nome (opcional) e "em que dia da espera você está?" (D1–D10). Nada mais. Persistem em localStorage |
| 2 | Relógio da espera | O dia avança automaticamente por data; um controle discreto (menu) permite mudar o dia manualmente para testes |
| 3 | Mensagem do dia | Renderizada ao abrir, 1x por dia, com selo; nunca reenviada na mesma sessão |
| 4 | Chat livre | Streaming visível; indicador "Serena está escrevendo…"; histórico da sessão mantido no contexto (janela: últimas ~20 mensagens) |
| 5 | Ferramentas | Renderizadas como widget inline na timeline (ver §10), passo a passo, sem LLM no interior; 3 chips fixos acima do input como porta de acesso direto da usuária; "agora não" sempre disponível |
| 6 | Ponte Humana | Acionável por: gatilho de crise, chip "Falar com uma pessoa", ou decisão do LLM. Card de máxima calma: contato da equipe Entre Ser. Depois do card, o chat livre fica pausado até a usuária tocar "voltar a conversar" |
| 7 | Auditoria | Menu oculto (long-press no logo): exportar conversas da sessão como JSON **anonimizado** (sem nome) para revisão da psicóloga; contador de incidentes do pós-filtro |
| 8 | Disclaimer | Rodapé permanente: "Protótipo de teste. A Serena não substitui acompanhamento médico ou psicológico." |
| 9 | Modo teste de mesa | Query param `?dia=N` força o dia (para as fundadoras testarem os 10 roteiros rapidamente) |

## 7. Requisitos não-funcionais

- **pt-BR** em toda a interface e em todos os logs.
- **MOBILE-FIRST como diretriz dura (instrução do projeto):** desenvolver e testar primeiro em 390px (alvo 360–430px). Teclado virtual aberto não pode encobrir o input nem o widget ativo; alvos de toque ≥ 44px; cards e widgets em proporção vertical; streaming estável em rede móvel. Desktop é adaptação secundária — nunca o ponto de partida do layout.
- **LGPD por desenho:** único dado pessoal é o nome (opcional), que nunca sai do dispositivo; exports de auditoria são anonimizados na origem; sem cookies de terceiros, sem analytics externos.
- **Custo:** registrar tokens por resposta no log de auditoria (valida a economia unitária da planilha da Serena).
- **Latência percebida:** streaming obrigatório; primeiro token < 5s no caminho feliz.

## 8. Estrutura de arquivos sugerida

```
serena-degrau-b/
├── proxy/            # 1 endpoint POST /chat (injeta API key, monta prompt, streaming)
│   └── server.js
├── src/
│   ├── App.(jsx|js)
│   ├── components/   # Bolha, ChipFerramenta, CardPonteHumana, SeloDia, Onboarding, BottomSheet
│   ├── lib/          # prompt.js (template), guardrails.js (pré/pós-filtro), relogio.js, toolRegistry.js (§10)
│   └── styles/       # tokens.css (ver doc de requisitos de interface)
├── corpus/
│   └── corpus_e5.exemplo.json
└── README.md         # como rodar; como substituir o corpus pelo chancelado
```

## 9. Definição de pronto do Degrau B

1. As 3 fundadoras conseguem percorrer os 10 dias via `?dia=N` e conversar livremente em cada um.
2. Nenhuma resposta do agente contém o vocabulário proibido (validado pelo pós-filtro + leitura da psicóloga).
3. O fluxo de crise curto-circuita corretamente em teste com os termos-gatilho.
4. O export de auditoria sai anonimizado e legível.
5. O corpus pode ser trocado por um novo JSON sem tocar em código.
6. Os critérios 10a–10f da componentização (§10.6) passam.

---

## 10. Componentização das ferramentas no chat (ToolRegistry)

Padrão importado do projeto PULSE: o chat não é uma lista de textos, é uma **linha do tempo de blocos tipados**, e as ferramentas são **componentes interativos que o agente invoca** — nunca descreve. Princípio que governa tudo aqui: *o LLM decide QUANDO oferecer a ferramenta; o que existe DENTRO dela é scriptado, chancelado e versionado.* A conversa é probabilística; a ferramenta é determinística.

### 10.1 O registry

```js
// src/lib/toolRegistry.js
export const TOOL_REGISTRY = {
  sos_google:    { versao: "corpus", schemaEntrada: {...}, componente: SosGoogleWidget,   conteudo: "corpus.ferramentas[id=sos_google]" },
  plano_espera:  { versao: "corpus", schemaEntrada: {...}, componente: PlanoEsperaWidget, conteudo: "corpus.ferramentas[id=plano_espera]" },
  acordos_casal: { versao: "corpus", schemaEntrada: {...}, componente: AcordosWidget,     conteudo: "corpus.ferramentas[id=acordos_casal]" },
  ponte_humana:  { privilegiada: true, componente: PonteHumanaCard, conteudo: "corpus.escalonamento" }
};
```

Regras do registry:
- O LLM só pode invocar **nomes registrados**. Invocação de nome desconhecido → ignorar + log de incidente. Nunca renderizar nada que o modelo "inventou".
- O conteúdo interno de cada widget (passos, textos, opções) vem **do corpus**, nunca do modelo. O componente é casca de interação; o corpus é o miolo chancelado.
- A `versao` de cada ferramenta acompanha a versão do corpus — trilha de auditoria por ferramenta.

### 10.2 Timeline mista

Cada mensagem da timeline é tipada:

```js
{ id, autor: "serena" | "usuaria", tipo: "texto" | "ferramenta" | "resumo_ferramenta", payload }
```

- `texto` → bolha comum.
- `ferramenta` → bolha-widget interativa, inline na conversa (a Serena "entrega um objeto").
- `resumo_ferramenta` → o que o widget vira ao ser concluído ou dispensado: um card curto e persistente na história (ex.: "✓ Plano do D6: caminhada, série, café com a irmã"). A conversa nunca acumula formulários abertos.
- **No máximo 1 widget ativo por vez.** Nova invocação com widget aberto → não renderizar, registrar em log (carga cognitiva é o inimigo).

### 10.3 Invocação — Nível 1 (este build, sem tool use nativo)

Convenção de saída no prompt: quando a rota for *Preparar* e o agente decidir oferecer uma ferramenta, a resposta termina com um bloco delimitado:

```
<<FERRAMENTA>>{"nome":"plano_espera","motivo":"usuaria pediu ajuda para estruturar o dia"}<<FIM>>
```

O front então: (1) remove o bloco do texto exibido; (2) valida `nome` contra o registry; (3) insere na timeline uma mensagem `tipo: "ferramenta"` com o componente correspondente. Parser tolerante: bloco malformado → ignorar por completo + log de incidente (a resposta de texto segue valendo).

> **Evolução planejada (Nível 2):** trocar a convenção por tool use nativo da API Anthropic no proxy (`tools` com JSON Schema → blocos `tool_use`/`tool_result`). O registry e os componentes NÃO mudam — só o transporte da invocação. Codar o Nível 1 já com essa fronteira limpa.

### 10.4 Loop de retorno (a parte que faz a diferença)

O resultado da interação com o widget volta ao histórico enviado ao modelo, como mensagem estruturada:

```
[FERRAMENTA_CONCLUIDA] plano_espera: {"ancoras":["caminhada","serie","cafe com a irma"],"dispensada":false}
```

Assim a Serena *sabe* o que foi combinado e pode retomar depois ("como foi a caminhada que você tinha combinado com você mesma?"). A dispensa também retorna (`"dispensada": true`) — e o prompt instrui: **ferramenta dispensada não é reoferecida na mesma sessão**; "agora não" é resposta completa, não objeção a contornar.

### 10.5 Ponte Humana: componente do registry com invocação privilegiada

Três portas de invocação, em ordem de precedência:
1. **Pré-filtro determinístico de crise** (guardrail do §5.2) — curto-circuito, sem LLM;
2. **Chip "Falar com uma pessoa"** — decisão da usuária;
3. **O próprio agente** — via mecanismo do §10.3.

Ao renderizar: suspende a timeline e os chips (comportamento do §6, item 6) e **nunca colapsa em resumo automaticamente** — só por ação explícita da usuária ("voltar a conversar").

### 10.6 Critérios de aceite da componentização

| # | Critério | Aceite |
|---|---|---|
| 10a | Invocação Nível 1 | Bloco `<<FERRAMENTA>>` é parseado, removido do texto exibido e vira widget; malformado é ignorado com log |
| 10b | Widget único | Segunda invocação com widget aberto não renderiza e registra em log |
| 10c | Colapso | Concluir ou dispensar gera `resumo_ferramenta` persistente na história |
| 10d | Loop de retorno | O histórico enviado ao modelo contém `[FERRAMENTA_CONCLUIDA]` e o agente consegue referenciar o conteúdo em turno posterior; dispensada não é reoferecida |
| 10e | Fronteira limpa | Migrar do Nível 1 para tool use nativo não altera registry nem componentes (só `prompt.js` e o proxy) |
| 10f | Cards de microlearning | Convite aparece quando o tema tem card vinculado; card mockup renderiza inline em proporção vertical mobile; dispensado não é reoferecido na sessão; trocar `status: "mockup"` pelo card real não altera o mecanismo de invocação |

### 10.7 Nota sobre os chips

Chips e registry não competem: os **chips são a porta da usuária** (renderizam o mesmo widget diretamente, sem passar pelo LLM) e o **registry é a porta da Serena**. Mesmo componente, duas entradas — e ambas geram o mesmo `resumo_ferramenta` e o mesmo loop de retorno.

### 10.8 Cards de microlearning no registry

Novo tipo de componente invocável, distinto das ferramentas: o card é **conteúdo** (rotas Entender e Bem-Estar), não fluxo de ação.

```js
card_micro: { versao: "corpus", schemaEntrada: { card_id: "string" }, componente: CardMicrolearningWidget, conteudo: "corpus.cards_microlearning[id=card_id]" }
```

Regras específicas:
- **Fase mockup (este build):** o componente renderiza o mockup estático do card (asset de imagem ou placeholder com título + resumo do corpus) com selo discreto "em breve na íntegra". Quando os cards reais existirem, troca-se `status` e o asset no corpus — **o mecanismo de invocação, o convite e o componente não mudam** (critério 10f).
- **Invocação:** mesmo transporte do §10.3 — `<<FERRAMENTA>>{"nome":"card_micro","card_id":"progesterona-01"}<<FIM>>`. `card_id` inexistente no corpus → ignorar + log.
- **Não conta como widget ativo:** o card é componente leve, tocável para expandir/colapsar, e não bloqueia a regra de 1 ferramenta ativa (§10.2). Máximo de 1 card por resposta.
- **Formato mobile-first:** proporção vertical (9:16 ou 4:5), legível na largura da bolha em 390px, expandível em tela cheia por toque.
- **Convite antes do card:** o card nunca aparece "do nada" — sempre precedido do convite em texto na própria resposta (§5.1, item 6), preservando o baixo compromisso.
