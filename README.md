# Serena · Degrau B — protótipo de chat (Entre Ser)

Protótipo mobile-first (390px) da companheira conversacional da fase **E5 · Habitar o Presente**: os 10 dias entre a transferência embrionária e o exame beta-hCG.

**Fase atual: 1–2 · front-end.** Não há proxy, API real nem prompt do agente. O chat conversa com um **mock de streaming** que imita a Messages API da Anthropic e escolhe respostas a partir do corpus de exemplo. O back-end (Fase 3) só começa após aprovação do gate visual (ver `CLAUDE.md`).

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173 — abrir no celular ou no DevTools a 390px
```

Outros comandos: `npm run build`, `npm run preview`, `npm run test`, `npm run lint`, `npm run typecheck`.

## Como testar (fundadoras e psicóloga)

- **Percorrer os 10 dias:** `?dia=N` na URL (ex. `http://localhost:5173/?dia=6`) força o dia. Ou toque longo (0,6 s) na concha do cabeçalho → bancada de teste → escolher D1–D10.
- **Onboarding:** aparece só na primeira visita (nome opcional + dia da espera). "Recomeçar do zero" na bancada apaga tudo do aparelho.
- **Hipóteses de design** (bancada): marcador da travessia **A · texto** vs. **B · pedras**; fio de cor por rota **com/sem**.
- **Ferramentas:** chips acima do input (SOS Não dê um Google · Meu plano de hoje · Acordos do casal · Falar com uma pessoa) abrem o widget direto, sem passar pelo mock. A Serena também as oferece na conversa (ex.: "não sei o que fazer hoje", "meu marido", "pesquisei no google").
- **Cards de microlearning:** perguntas de Entender (ex.: "tô com cólica", "posso fazer o teste de farmácia?", "ansiedade atrapalha?") terminam com convite + card inline.
- **Ponte Humana:** qualquer termo-gatilho do corpus (ex.: "não aguento mais nada", "quero morrer") curto-circuita sem chamar o mock; o chip "Falar com uma pessoa" e o comando `#ponte` (decisão do agente) também acionam.
- **Comandos de bancada** (escrever no chat, exatamente):

| comando | o que simula |
|---|---|
| `#erro` | indisponibilidade do modelo → estado de erro no Tom e Voz |
| `#demora` | primeiro token após 7 s → "tô pensando com calma…" |
| `#proibido` | resposta com vocabulário proibido → pós-filtro descarta e registra incidente |
| `#inventada` | ferramenta fora do registry → ignorada + incidente |
| `#quebrado` | bloco `<<FERRAMENTA>>` malformado → ignorado + incidente; texto segue |
| `#duplo` | segunda ferramenta com widget aberto → não renderiza + incidente |
| `#ponte` | agente aciona a Ponte Humana |
| `#cardx` | `card_id` inexistente → ignorado + incidente |

- **Auditoria:** bancada → "exportar conversa anonimizada (JSON)". O export não contém o nome (substituído por `[nome]`), traz incidentes dos guardrails e tokens estimados por resposta.

## Estrutura

```
specs/                      # ÚNICA fonte de verdade (ver CLAUDE.md para a precedência)
  00-constitution.md        # princípios não-negociáveis (extraídos dos três docs)
  01-build-spec.md          # técnico: arquitetura, ToolRegistry
  02-design-spec.md         # interface: tokens, telas, microcopy
  03-product-interactions.md# produto: o que a Serena faz e por quê
  fixtures/
    corpus_e5.exemplo.json  # corpus E5 [PENDENTE DE CHANCELA] — servido em runtime
    respostas_mock.json     # costuras do mock + comandos de bancada
    cards/*.svg             # capas mockup dos cards (still life abstrato)
    concha.svg
src/
  App.tsx                   # carrega corpus em runtime, onboarding → chat
  components/               # Bolha, Cabecalho, ChipsFerramenta, Entrada, Escrevendo, EstadoErro,
                            # WidgetFerramenta, ResumoFerramenta, CardMicrolearning, CardPonteHumana,
                            # Travessia (2 variações + folha), Onboarding, MenuTeste, Folha, Chat
  lib/
    types.ts                # corpus + timeline tipada (texto | ferramenta | resumo_ferramenta | erro)
    corpus.ts               # carga/validação em runtime; templates
    relogio.ts              # dia por data, ?dia=N
    guardrails.ts           # pré-filtro de crise + pós-filtro de vocabulário (listas vêm do corpus)
    ferramentaParser.ts     # invocação Nível 1: <<FERRAMENTA>>{...}<<FIM>>
    toolRegistry.ts         # registry: sos_google, plano_espera, acordos_casal, ponte_humana, card_micro
    historico.ts            # janela de ~20 turnos + [FERRAMENTA_CONCLUIDA] (loop de retorno)
    auditoria.ts            # incidentes, tokens, export anonimizado
    cliente.ts              # contrato do cliente (eventos no formato da Messages API)
    useSerena.ts            # estado e fluxo do chat
    storage.ts              # localStorage (só nome, dia, conversa, preferências)
  mock/clienteMock.ts       # mock de streaming (Fase 1–2)
  styles/tokens.css         # tokens Entre Ser — único lugar com hex
  styles/global.css
```

## Como trocar o corpus

O app faz `fetch` de `corpus_e5.exemplo.json` ao abrir (servido de `specs/fixtures/`). Para usar o corpus chancelado, substitua o arquivo mantendo o contrato (`01-build-spec.md` §4) e mude `versao` para algo sem `NAO-CHANCELADO` — o banner "protótipo · conteúdo em validação" some sozinho. Nenhum código muda.

## Fronteira para a Fase 3

O front consome `ClienteSerena.enviar()` (em `src/lib/cliente.ts`) e só entende eventos no formato do streaming da Messages API. Para ligar o proxy: implementar esse contrato em `src/lib/clienteProxy.ts` (`POST /chat` → eventos SSE) e trocar `criarClienteMock` por ele em `App.tsx`. O registry, os componentes, o parser e o loop de retorno não mudam (critério 10e). A montagem do prompt de sistema (`prompt.js`) é do proxy e não existe neste repositório ainda.

O campo `metadata.rota` no evento `message_start` é uma extensão só do mock, usada para o fio de cor por rota (hipótese de design). A Fase 3 decide se o proxy a expõe.

## Dívidas registradas

- Modo escuro: fora de escopo do Degrau B (02-design-spec.md §7).
- Contato da equipe Entre Ser na Ponte Humana: pendente no corpus (`escalonamento.contatos.equipe.url`).
- Corpus real (roteiros, FAQ, acolhimento, fluxos, escalonamento): pendente de redação e chancela da psicóloga.
- `specs/00-constitution.md` foi redigido por extração dos três documentos; pendente de validação pelas fundadoras.
