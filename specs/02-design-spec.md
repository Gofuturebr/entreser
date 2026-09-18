# SERENA · Degrau B — Requisitos de interface (para Claude Design)

> **O que é isto:** briefing de design da interface conversacional da Serena (protótipo Degrau B). O objeto a desenhar é um chat mobile-first que acompanha a tentante nos 10 dias entre a transferência embrionária e o exame beta-hCG — o momento de maior ansiedade da jornada de FIV. A interface é parte do cuidado: cada decisão visual deve reduzir carga cognitiva e ansiedade, nunca adicionar.
>
> **Documento de precedência superior:** `serena-documento-produto-interacoes.md` (specs/03-product-interactions.md), seção E5, é a fonte do tom emocional, do momento da verdade e das ferramentas desta fase — este briefing traduz aquilo em forma visual. Em dúvida sobre intenção (não sobre aparência), consultar aquele documento.

---

## 1. Persona e contexto de uso

- **Quem:** mulher em tratamento de FIV, na "espera de duas semanas". Estado emocional documentado: hipervigilância corporal, ruminação, impulso de buscar sintomas no Google, medo do resultado. Carga cognitiva alta.
- **Onde:** celular, muitas vezes à noite, na cama, em momentos de fragilidade; também no trabalho, em consultas de segundos.
- **Referência de familiaridade:** WhatsApp. A conversa deve parecer um contato querido, não um app de saúde. Zero curva de aprendizado.
- **O que ela NÃO pode sentir ao usar:** cobrança, urgência, gamificação, julgamento, frieza clínica.

## 2. Princípios de interface (derivados do produto)

1. **Baixo compromisso como padrão.** Toda ação tem saída sem culpa: "agora não", "prefiro não responder". Nenhum fluxo prende.
2. **Sem mecânicas de ansiedade.** Proibido: streaks, badges, barras de progresso competitivas, contadores regressivos agressivos, notificações insistentes, vermelho de alerta.
3. **O tempo é acolhido, não cobrado.** A progressão "dia 6 de 10" existe (dá previsibilidade, que reduz ansiedade), mas desenhada como travessia, não como contagem regressiva. Hipótese a testar no design: marcador discreto tipo "estamos no dia 6" vs. linha de 10 pontos suave.
4. **Silêncio visual.** Uma coisa por tela. Espaço em branco (creme) generoso. A interface respira porque a usuária muitas vezes não está respirando.
5. **A espera dentro da espera.** O tempo de resposta do modelo (streaming, "pensando") é um micro-momento de espera dentro da grande espera — desenhá-lo com calma proposital (ver §5, componente "Serena está escrevendo").
6. **Mobile-first absoluto (instrução do projeto).** O Degrau B é desenhado exclusivamente para 390px; desktop está fora de escopo do design. Toda decisão considera: uma mão, polegar, teclado virtual aberto, luz baixa. Se um componente só funciona em tela grande, ele está errado.

## 3. Identidade visual (tokens Entre Ser — usar como estão)

**Cores**
- Creme `#F8F0E8` — fundo padrão (nunca branco puro)
- Berinjela `#381830` — texto principal, bolhas da Serena, sinalização do eixo **Entender**
- Coral `#C83830` — acento emocional, sinalização do eixo **Bem-Estar** (nunca como cor de alerta/erro)
- Verde-mar `#186860` — ações e ferramentas, sinalização do eixo **Preparar**
- Gradiente rosê `#E8B8C0 → #F0D8D0` — momentos especiais (mensagem do dia, abertura)

**Tipografia**
- Comfortaa (600/700) — títulos, lemas, selo do dia
- Mulish (400/600) — corpo, conversa
- IBM Plex Mono — apenas dados pontuais (ex. "D6 · 10")

**Marca e imagem**
- Concha como marca d'água discreta (canto superior)
- Direção de arte para qualquer imagem: fotografia editorial quente com gesto humano sem rosto (mãos, costas, silhuetas) ou still life de metáfora; **nunca** imagens de gravidez, teste, bebê ou agulha; pouco texto sobre imagem
- Cantos arredondados e formas orgânicas (a marca é curva — diferente do DS Marcas Educadoras, que é retangular; não misturar)

**Semântica dos eixos na conversa:** as respostas da Serena podem carregar um fio/detalhe sutil de cor conforme a rota (berinjela = explicação, coral = acolhimento, verde = ferramenta). É sinalização subliminar, não rótulo — testar se ajuda ou polui.

## 4. Fluxos e telas (6)

### T1 · Boas-vindas + onboarding
- Abertura calma: concha, "Oi. Eu sou a Serena." + 1 frase do propósito ("companhia para os dias de espera")
- 2 perguntas, uma por vez: nome (opcional, com "prefiro não dizer") e "em que dia da espera você está?" (seletor D1–D10 — desenhar como travessia, ex. pedras num caminho, não como régua numérica fria)
- Disclaimer curto antes de entrar: protótipo de teste; não substitui médico/psicóloga

### T2 · Chat principal (a tela)
- Cabeçalho mínimo: "Serena" + marcador do dia ("dia 6 · a caminho do resultado") — sem foto de perfil humana falsa
- Bolhas: Serena à esquerda (berinjela sobre creme), usuária à direita (tom rosê suave)
- **Mensagem do dia** com selo próprio (fundo gradiente rosê, ícone de sol/concha, "mensagem do dia · D6")
- **Convite a card de microlearning:** quando a Serena toca um tema que tem card, ela convida em texto ("quer ver um card rapidinho sobre isso?") e o card aparece como componente inline compacto na conversa — proporção vertical, capa na direção de arte da marca, tocável para expandir em tela cheia; "agora não" sempre disponível. No Degrau B o card é mockup, com selo discreto "em breve na íntegra"
- Faixa de **chips de ferramenta** acima do input (3 fixos + 1 humano): `SOS Não dê um Google` · `Meu plano de hoje` · `Acordos do casal` · `Falar com uma pessoa`
- Input: "escreve o que quiser…" (nunca "digite sua mensagem")

### T3 · Ferramenta como widget na conversa
- A ferramenta nasce **dentro da timeline**, como uma bolha-widget que a Serena "entrega" na conversa — não como tela separada nem bottom sheet
- Passo a passo dentro do widget, um passo por vez, botão grande único; verde-mar como cor de condução
- Sempre presente: "agora não" (fecha sem culpa, sem confirmação)
- Ao concluir ou dispensar, o widget **colapsa num card-resumo** curto que permanece na história ("✓ Plano do D6: caminhada, série") — a conversa nunca acumula formulários abertos
- Apenas 1 widget ativo por vez na conversa

### T4 · Card Ponte Humana (estado de crise)
- **O componente mais importante do produto.** Máxima calma: fundo creme pleno, sem vermelho, sem ícones de alerta
- Texto validado (vem do corpus), 2 ações grandes e claras: falar com a equipe Entre Ser + CVV 188 (ligação direta)
- O chat fica em pausa visível e gentil ("estou aqui quando você quiser voltar") — retorno por 1 toque
- Nada mais na tela: sem chips, sem teclado, sem distração

### T5 · Estado de erro / offline
- Microcopy no Tom e Voz: "não consegui te responder agora — tenta de novo em um instante?"
- **Proibido** o vocabulário técnico de erro ("falha", "erro 500", "timeout") — em especial a palavra *falha*, banida do produto inteiro

### T6 · D10 — o dia do exame
- Hipótese de design: a interface muda sutilmente no D10 (mensagem do dia diferente, chip "Acordos do casal" em evidência), reconhecendo o peso do dia sem dramatizá-lo. Sem fogos, sem torcida — presença.

## 5. Componentes (inventário para o design system do protótipo)

| Componente | Notas de comportamento |
|---|---|
| Bolha Serena / Bolha usuária | Cantos orgânicos; máx. ~75% da largura; tipografia Mulish 16px+ |
| Selo "mensagem do dia" | Gradiente rosê; aparece 1x/dia; âncora emocional da experiência |
| Marcador de travessia (D1–D10) | Discreto no cabeçalho; tocável → visão da travessia completa (pedras/pontos) |
| Chip de ferramenta | Pílula verde-mar (outline); ícone + rótulo curto; rolagem horizontal se faltar espaço |
| "Serena está escrevendo…" | Animação lenta e orgânica (respiração, ondas), nunca três pontinhos frenéticos; se demorar >5s, microcopy "tô pensando com calma…" |
| Bolha-widget de ferramenta | Nasce inline na timeline; 1 passo por vez; "agora não" persistente; borda/condução em verde-mar |
| Card-resumo de ferramenta | Estado colapsado do widget após conclusão/dispensa; curto, persistente, tocável para rever |
| Card de microlearning | Inline na conversa, precedido do convite em texto; proporção vertical (9:16 ou 4:5) legível na bolha em 390px; capa na direção de arte da marca (sem gravidez/teste/bebê/agulha); cor do eixo como sinalização (berinjela = entender, coral = bem-estar); toque expande em tela cheia; selo discreto de status na fase mockup; máx. 1 por resposta |
| Card Ponte Humana | Ver T4; prioridade máxima de refinamento |
| Banner de protótipo | Fixo e discreto no topo ou rodapé: "protótipo · conteúdo em validação" |
| Estado de erro | Ver T5 |

## 6. Microcopy — regras duras (Tom e Voz Entre Ser)

- Arquétipo: **sábia acolhedora** — verdadeira sem ser dura, nomeadora, traduzida, sem pressa
- Vocabulário-âncora: jornada, tentante, travessia, acolhimento, clareza, juntas
- **Proibido em qualquer superfície da UI** (incluindo estados de erro, botões, tooltips): "falhou/falha", "fracasso", "taxa de sucesso", "paciente", "relógio biológico", "é só relaxar"
- CTAs de baixo compromisso: "tenho interesse", "agora não", "quando você quiser" — nunca "confirme", "não perca", "última chance"
- Perguntas sempre com saída: toda pergunta da Serena aceita "prefiro não responder"

## 7. Acessibilidade e ergonomia

- Contraste: berinjela sobre creme ✅ para texto; **coral e verde-mar nunca como texto pequeno sobre creme** (verificar AA; usar em pesos grandes ou como fundo com texto claro)
- Corpo mínimo 16px; alvos de toque ≥ 44px; uso confortável com uma mão (ações na metade inferior)
- Modo escuro: fora de escopo do Degrau B (registrar como dívida)
- Animações caras de bateria/atenção: evitar; movimento sempre lento e opcional (`prefers-reduced-motion`)

## 8. Entregáveis esperados

1. Mockups mobile (390px) das 6 telas: T1–T6
2. Os 9 componentes do inventário em estados (normal, ativo, desabilitado onde couber)
3. `tokens.css` (cores, tipografia, raios, espaçamentos) pronto para o build do Degrau B
4. Protótipo navegável do fluxo principal: onboarding → mensagem do dia → conversa → ferramenta → Ponte Humana → retorno
5. 2 variações da hipótese do marcador de travessia (§2.3) para teste com as fundadoras
6. **Mockups dos cards de microlearning:** 1 exemplo por eixo (Entender e Bem-Estar), em proporção vertical mobile, nos 3 estados — compacto na conversa, expandido em tela cheia, e o convite em texto que o precede

## 9. O que NÃO desenhar

- Dashboards, gráficos ou qualquer métrica visível à usuária
- Perfil, configurações além do essencial, histórico navegável
- Elementos de comunidade (é outra superfície do produto)
- Ilustrações de bebê/gravidez/cegonha ou iconografia médica (agulhas, jalecos)
- Qualquer componente que exija explicação: se precisa de tutorial, está errado
