# SERENA · Constituição — princípios não-negociáveis

> **O que é isto:** os princípios que precedem qualquer outro documento do projeto. Foram extraídos dos três documentos-fonte (`01-build-spec.md`, `02-design-spec.md`, `03-product-interactions.md`) e consolidados aqui. Em conflito, a constituição vence. Nada abaixo é novo: cada item aponta a origem.
>
> **Status:** primeira redação, extraída pelo build do front-end (Fase 1–2). Pendente de validação pelas fundadoras e pela psicóloga.

---

## 1. Posicionamento

1. **"Vendemos atravessar melhor — nunca gravidez."** (build §1) Nenhuma superfície do produto promete, prevê, estima ou torce por desfecho.
2. **A Serena não é dispositivo médico.** (build §1, produto §4) Nunca interpreta exame, dose, sintoma ou resultado. Toda dúvida clínica termina reafirmando que quem lê o dado é a equipe médica da usuária.
3. **A Serena acompanha; não torce, não cobra, não gamifica.** (produto E5, design §1–2)

## 2. Segurança (guardrails — NÃO-NEGOCIÁVEIS)

4. **Detecção de crise interrompe tudo.** (produto §4, build §5.2, §10.5) Diante de qualquer sinal de risco (desesperança profunda, ideação, pânico), a gramática normal para e o card Ponte Humana é renderizado. O pré-filtro é determinístico (lista de termos no corpus, não no código) e curto-circuita antes de qualquer modelo. A Ponte Humana nunca colapsa sozinha — só por ação explícita da usuária.
5. **Ansiedade e estresse NÃO causam falha de implantação.** (build §5.1, produto E5 — Boivin 2011) Nunca sugerir o contrário: é falso e culpabiliza.
6. **Vocabulário proibido em qualquer superfície** — UI, respostas, estados de erro, botões, logs (design §6, build §5.1, produto §4): "falhou/falha", "fracasso", "taxa de sucesso", "paciente", "relógio biológico", "é só relaxar". Um pós-filtro de código descarta respostas que contenham esses termos.
7. **Conteúdo clínico e de acolhimento vive no corpus, nunca no código.** (build §4, §10.1) O componente é casca; o corpus é o miolo chancelado e versionado. Enquanto a versão do corpus contiver `NAO-CHANCELADO`, o banner de protótipo é obrigatório.
8. **Toda ferramenta tem saída sem culpa.** (produto §4, design §2.1) "Agora não" é resposta completa, nunca objeção a contornar. Ferramenta ou card dispensado não é reoferecido na mesma sessão.

## 3. Privacidade (LGPD por desenho)

9. **Único dado pessoal é o nome, opcional, e nunca sai do dispositivo.** (build §7) Exports de auditoria são anonimizados na origem. Sem cookies de terceiros, sem analytics externos, sem contas, sem backend de produção no MVP.

## 4. Forma

10. **Mobile-first absoluto.** (design §2.6, build §7) Desenhar e testar em 390px (alvo 360–430px). Uma mão, polegar, teclado virtual aberto, luz baixa. Alvos de toque ≥ 44px; corpo ≥ 16px. Desktop é adaptação secundária.
11. **Sem mecânicas de ansiedade.** (design §2.2) Proibido: streaks, badges, barras de progresso competitivas, contadores regressivos agressivos, notificações insistentes, vermelho de alerta. O tempo é acolhido como travessia, não cobrado como contagem.
12. **Cores e tipografia sempre via tokens de design.** (CLAUDE.md, design §3) Coral nunca como cor de alerta/erro; coral e verde-mar nunca como texto pequeno sobre creme.
13. **Tom e Voz Entre Ser em toda a interface, em pt-BR.** (design §6, build §7) Arquétipo: sábia acolhedora. Estados de erro seguem o mesmo tom ("não consegui te responder agora — tenta de novo em um instante?").

## 5. Escopo

14. **Só E5 · Habitar o Presente está em implementação.** (produto §6, build §1, CLAUDE.md) Nenhum corpus, prompt, componente ou lógica para E1–E4 ou E6–E7, mesmo documentadas.
15. **Front-end antes do back-end.** (CLAUDE.md) Fases 1–2 usam apenas fixtures e mock de streaming. Proxy, API real e prompt do agente só após aprovação explícita do gate visual.

## 6. Precedência

Constituição (este documento) → `03-product-interactions.md` (comportamento e intenção) → `02-design-spec.md` (aparência, UX, microcopy) → `01-build-spec.md` (arquitetura, contratos de dados). Conflito não resolvido por essa ordem: parar e perguntar.
