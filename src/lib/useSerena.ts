import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClienteSerena } from './cliente';
import { cardDoCorpus, ferramentaDoCorpus, preencherTemplate, roteiroDoDia } from './corpus';
import { extrairInvocacao, textoVisivelDuranteStream, type Invocacao } from './ferramentaParser';
import { detectarCrise, encontrarVocabularioProibido } from './guardrails';
import { montarHistorico } from './historico';
import { novoId } from './id';
import { registrarIncidente, registrarResposta } from './auditoria';
import { hojeISO } from './relogio';
import { storage } from './storage';
import { contaComoWidgetAtivo, ehRegistrada } from './toolRegistry';
import type { Corpus, Mensagem, MensagemFerramenta, MensagemResumo, MensagemTexto, OrigemInvocacao, Rota } from './types';

// Estado e fluxo do chat (01-build-spec.md §5.2, §5.3, §6, §10).

type Params = { corpus: Corpus; cliente: ClienteSerena; dia: number; nome: string | undefined };

export function useSerena({ corpus, cliente, dia, nome }: Params) {
  const [timeline, setTimeline] = useState<Mensagem[]>(() => storage.lerTimeline());
  const [escrevendoDesde, setEscrevendoDesde] = useState<number | null>(null);
  const timelineRef = useRef<Mensagem[]>(timeline);
  const abortRef = useRef<AbortController | null>(null);
  const montado = useRef(true);

  // Ao desmontar, encerra qualquer resposta em andamento (nada fica pendurado).
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const atualizar = useCallback((fn: (t: Mensagem[]) => Mensagem[]) => {
    timelineRef.current = fn(timelineRef.current);
    setTimeline(timelineRef.current);
  }, []);

  useEffect(() => {
    storage.salvarTimeline(timeline.filter((m) => !(m.tipo === 'texto' && m.payload.streaming)));
  }, [timeline]);

  const widgetAtivo = useMemo(
    () => timeline.some((m) => m.tipo === 'ferramenta' && contaComoWidgetAtivo(m.payload.nome)),
    [timeline],
  );
  const ponteAtiva = useMemo(() => timeline.some((m) => m.tipo === 'ferramenta' && m.payload.nome === 'ponte_humana'), [timeline]);

  // Mensagem do dia: 1x por dia, nunca reenviada na mesma sessão (§5.3, §6.3).
  useEffect(() => {
    if (storage.lerUltimoDiaMensagem() === dia) return;
    const roteiro = roteiroDoDia(corpus, dia);
    if (!roteiro) return;
    storage.salvarUltimoDiaMensagem(dia);
    const msg: MensagemTexto = { id: novoId(), autor: 'serena', tipo: 'texto', payload: { texto: roteiro.mensagem_proativa, selo: 'mensagem_do_dia', dia } };
    atualizar((t) => [...t, msg]);
  }, [corpus, dia, atualizar]);

  const adicionarFerramenta = useCallback(
    (nomeFerramenta: string, origem: OrigemInvocacao, params: Record<string, string> = {}) => {
      const msg: MensagemFerramenta = { id: novoId(), autor: 'serena', tipo: 'ferramenta', payload: { nome: nomeFerramenta, origem, params, dia } };
      atualizar((t) => [...t, msg]);
    },
    [atualizar, dia],
  );

  const tratarInvocacao = useCallback(
    (inv: Invocacao, origem: OrigemInvocacao) => {
      if (!ehRegistrada(inv.nome)) {
        registrarIncidente('ferramenta_desconhecida', inv.nome);
        return;
      }
      if (inv.nome === 'ponte_humana') {
        if (!timelineRef.current.some((m) => m.tipo === 'ferramenta' && m.payload.nome === 'ponte_humana')) adicionarFerramenta('ponte_humana', origem);
        return;
      }
      if (inv.nome === 'card_micro') {
        const cardId = inv.params.card_id;
        if (!cardId || !cardDoCorpus(corpus, cardId)) {
          registrarIncidente('card_desconhecido', cardId ?? '(sem card_id)');
          return;
        }
        if (storage.lerDispensadas().includes(`card:${cardId}`)) return;
        adicionarFerramenta('card_micro', origem, { card_id: cardId });
        return;
      }
      if (timelineRef.current.some((m) => m.tipo === 'ferramenta' && contaComoWidgetAtivo(m.payload.nome))) {
        registrarIncidente('widget_duplicado', inv.nome);
        return;
      }
      adicionarFerramenta(inv.nome, origem, inv.params);
    },
    [adicionarFerramenta, corpus],
  );

  const responder = useCallback(
    async (textoUsuaria: string) => {
      const idS = novoId();
      const placeholder: MensagemTexto = { id: idS, autor: 'serena', tipo: 'texto', payload: { texto: '', streaming: true } };
      atualizar((t) => [...t, placeholder]);
      setEscrevendoDesde(Date.now());

      const controlador = new AbortController();
      abortRef.current = controlador;
      const historico = montarHistorico(timelineRef.current);

      let bruto = '';
      let rota: Rota | undefined;
      let tokensEntrada = 0;
      let tokensSaida = 0;
      let houveErro = false;
      let substituido = false;
      let primeiroToken = true;

      const escrever = (texto: string, extras: Partial<MensagemTexto['payload']> = {}) =>
        atualizar((t) =>
          t.map((m) => (m.id === idS && m.tipo === 'texto' ? { ...m, payload: { ...m.payload, ...extras, texto } } : m)),
        );

      try {
        const req = { mensagens: historico, estado: nome ? { nome, dia, data: hojeISO() } : { dia, data: hojeISO() } };
        for await (const ev of cliente.enviar(req, controlador.signal)) {
          if (ev.type === 'message_start') {
            tokensEntrada = ev.message.usage.input_tokens;
            const r = ev.metadata?.rota;
            if (r === 'entender' || r === 'bem_estar' || r === 'preparar') rota = r;
          } else if (ev.type === 'content_block_delta') {
            bruto += ev.delta.text;
            if (primeiroToken) {
              primeiroToken = false;
              if (montado.current) setEscrevendoDesde(null);
            }
            const visivel = textoVisivelDuranteStream(bruto);
            const proibido = encontrarVocabularioProibido(visivel, corpus.vocabulario_proibido);
            if (proibido) {
              controlador.abort();
              registrarIncidente('pos_filtro', `termo "${proibido}" em: ${visivel.slice(0, 160)}`);
              substituido = true;
              break;
            }
            escrever(visivel);
          } else if (ev.type === 'message_delta') {
            tokensSaida = ev.usage.output_tokens;
          } else if (ev.type === 'error') {
            houveErro = true;
            registrarIncidente('erro_modelo', ev.error.message);
            break;
          }
        }
      } catch (e) {
        houveErro = true;
        registrarIncidente('erro_modelo', e instanceof Error ? e.message : String(e));
      }

      abortRef.current = null;
      if (!montado.current) return;
      setEscrevendoDesde(null);

      if (houveErro) {
        atualizar((t) =>
          t.map((m) => (m.id === idS ? { id: idS, autor: 'serena', tipo: 'erro', payload: { texto: corpus.microcopy.erro_resposta ?? '', reenviar: textoUsuaria } } : m)),
        );
        return;
      }

      if (substituido) {
        const neutra = corpus.acolhimento.find((a) => a.contexto === 'geral')?.frases_validadas[0] ?? '';
        escrever(neutra, { streaming: false, rota: 'bem_estar' });
        registrarResposta({ dia, tokens_entrada: tokensEntrada, tokens_saida: tokensSaida, rota: 'pos_filtro' });
        return;
      }

      const { texto, invocacao, malformado } = extrairInvocacao(bruto);
      if (malformado) registrarIncidente('bloco_malformado', bruto.slice(-160));
      const extras: Partial<MensagemTexto['payload']> = { streaming: false };
      if (rota) extras.rota = rota;
      if (texto) escrever(texto, extras);
      else atualizar((t) => t.filter((m) => m.id !== idS));
      registrarResposta({ dia, tokens_entrada: tokensEntrada, tokens_saida: tokensSaida, ...(rota ? { rota } : {}), ...(invocacao ? { ferramenta: invocacao.nome } : {}) });
      if (invocacao) tratarInvocacao(invocacao, 'serena');
    },
    [atualizar, cliente, corpus, dia, nome, tratarInvocacao],
  );

  const enviar = useCallback(
    (texto: string) => {
      const limpo = texto.trim();
      if (!limpo || escrevendoDesde !== null || ponteAtiva) return;
      const msg: MensagemTexto = { id: novoId(), autor: 'usuaria', tipo: 'texto', payload: { texto: limpo } };
      atualizar((t) => [...t, msg]);

      const crise = detectarCrise(limpo, corpus.escalonamento.termos_gatilho);
      if (crise) {
        registrarIncidente('crise_prefiltro', `termo: ${crise}`);
        tratarInvocacao({ nome: 'ponte_humana', params: {} }, 'prefiltro');
        return;
      }
      void responder(limpo);
    },
    [atualizar, corpus, escrevendoDesde, ponteAtiva, responder, tratarInvocacao],
  );

  const abrirFerramenta = useCallback(
    (nomeFerramenta: string) => tratarInvocacao({ nome: nomeFerramenta, params: {} }, 'chip'),
    [tratarInvocacao],
  );

  const abrirCard = useCallback(
    (cardId: string) => tratarInvocacao({ nome: 'card_micro', params: { card_id: cardId } }, 'chip'),
    [tratarInvocacao],
  );

  const concluirFerramenta = useCallback(
    (idMsg: string, resultado: Record<string, unknown>, dispensada: boolean) => {
      atualizar((t) =>
        t.map((m) => {
          if (m.id !== idMsg || m.tipo !== 'ferramenta') return m;
          const nomeF = m.payload.nome;
          let resumo: string;
          if (nomeF === 'card_micro') resumo = corpus.microcopy.card_dispensado ?? '';
          else if (nomeF === 'ponte_humana') resumo = `Ponte Humana · D${m.payload.dia}`;
          else {
            const f = ferramentaDoCorpus(corpus, nomeF);
            resumo = dispensada ? (f?.resumo_dispensada ?? nomeF) : preencherTemplate(f?.resumo_template ?? '', { ...resultado, dia: m.payload.dia });
          }
          const r: MensagemResumo = { id: m.id, autor: 'serena', tipo: 'resumo_ferramenta', payload: { nome: nomeF, resumo, resultado, dispensada, dia: m.payload.dia, params: m.payload.params } };
          if (dispensada) {
            const chave = nomeF === 'card_micro' ? `card:${m.payload.params.card_id ?? ''}` : nomeF;
            const lista = storage.lerDispensadas();
            if (!lista.includes(chave)) storage.salvarDispensadas([...lista, chave]);
          }
          return r;
        }),
      );
    },
    [atualizar, corpus],
  );

  const voltarConversar = useCallback(() => {
    const ponte = timelineRef.current.find((m) => m.tipo === 'ferramenta' && m.payload.nome === 'ponte_humana');
    if (ponte) concluirFerramenta(ponte.id, {}, false);
  }, [concluirFerramenta]);

  return { timeline, escrevendoDesde, widgetAtivo, ponteAtiva, enviar, abrirFerramenta, abrirCard, concluirFerramenta, voltarConversar };
}
