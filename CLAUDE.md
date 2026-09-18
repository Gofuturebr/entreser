# Serena — MVP de chat (produto Entre Ser)

Protótipo mobile-first (390px) de interface conversacional para bem-estar
mental de mulheres em tratamento de fertilidade/FIV. Público sensível:
os guardrails de segurança são NÃO-NEGOCIÁVEIS.

## Ordem de leitura das especificações (LEIA NESTA ORDEM antes de planejar)
1. @specs/00-constitution.md         — princípios não-negociáveis (precede tudo)
2. @specs/03-product-interactions.md — produto: O QUE a Serena faz e diz, e POR QUÊ, por fase (E1–E7)
3. @specs/02-design-spec.md          — interface/design: tokens, telas, microcopy
4. @specs/01-build-spec.md           — técnico: arquitetura, stack, ToolRegistry

São a ÚNICA fonte de verdade. Não invente requisitos fora desses docs.
Mapeamento dos arquivos-fonte para esta convenção de nomes:
- 00-constitution.md         ← a redigir (extrair de todos os docs abaixo)
- 01-build-spec.md           ← serena-degrau-b-build-claude-code.md
- 02-design-spec.md          ← serena-degrau-b-requisitos-interface.md
- 03-product-interactions.md ← serena-documento-produto-interacoes.md

## Precedência em caso de conflito
- A constituição (00) prevalece sobre qualquer outro documento.
- Para COMPORTAMENTO / CONTEÚDO / INTENÇÃO (o que a Serena faz e por quê,
  em cada fase): **03-product-interactions vence.**
- Para APARÊNCIA / UX / tokens / microcopy: **02-design-spec vence.**
- Para ARQUITETURA / contratos de dados / implementação técnica:
  **01-build-spec vence.**
- Se dois documentos conflitarem e a regra acima não resolver: PARE e
  pergunte — não escolha arbitrariamente.

## Trava de escopo (produto e código)
O Percurso EntreSer tem 7 fases (E1–E7), documentadas em
03-product-interactions.md para dar coerência ao produto inteiro. Mas
cada fase tem um selo de status, e **só uma está ativa agora**:

> **E5 · Habitar o Presente — 🟢 MVP EM IMPLEMENTAÇÃO.**
> Todas as demais (E1–E4, E6–E7) estão marcadas
> **"roadmap — não implementar"**.

Não gere corpus, prompt, componente de UI ou lógica de back-end para
nenhuma fase fora de E5, mesmo que ela apareça detalhada na
documentação — a descrição existe para dar contexto, não para autorizar
construção. Se um pedido implicar trabalhar em outra fase, confirme
antes de prosseguir.

## Fase atual do fluxo de construção (front-end antes do back-end)
FASE 1–2 · FRONT-END. NÃO implemente proxy, API real, nem lógica do
agente. Use SOMENTE fixtures em `specs/fixtures/` e um mock de streaming
que imite a API Anthropic. O back-end (Fase 3 em diante) só começa após
aprovação explícita do gate visual — sinalizada por merge do branch de
fase e atualização desta seção.

## Workflow
- Use plan mode para qualquer mudança que toque mais de um arquivo.
- Ao concluir uma série de edições: rode typecheck + lint + testes.
- Commit por fase, com mensagem descritiva. Não misture fases num commit.
- Ferramentas do chat (SOS, Plano da Espera, Acordos do casal, cards de
  microlearning) seguem o ToolRegistry — ver 01-build-spec.md §10.
  Conteúdo interno de cada ferramenta vem sempre do corpus, nunca é
  gerado livremente pelo modelo.

## Comandos
- dev: `npm run dev`
- build: `npm run build`
- test: `npm run test`
- lint: `npm run lint`

## Estilo
- ES modules; TypeScript estrito; componentes funcionais.
- Cores/tipografia SEMPRE via tokens de design (02-design-spec.md);
  nunca hex hardcoded.
- pt-BR em toda a interface, logs e mensagens de erro — inclusive
  estados de erro, que seguem o Tom e Voz (nunca "falha", "erro 500").

## Pendências conhecidas (não bloqueiam o front-end, bloqueiam produção)
- `specs/00-constitution.md` ainda não foi redigido como arquivo próprio
  — seus princípios estão hoje distribuídos entre os três documentos.
- O Corpus E5 real (10 roteiros diários, FAQ, biblioteca de acolhimento,
  fluxos de ferramenta, protocolo de escalonamento) depende de redação
  e chancela da psicóloga. Até lá, usar `corpus_e5.exemplo.json` com
  conteúdo marcado `[PENDENTE DE CHANCELA]` (ver 01-build-spec.md §4).
