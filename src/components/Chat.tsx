import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClienteSerena } from '../lib/cliente';
import { corpusNaoChancelado, roteiroDoDia } from '../lib/corpus';
import { entradaRegistry } from '../lib/toolRegistry';
import { useSerena } from '../lib/useSerena';
import { baixarJson, contarIncidentes, exportarAnonimizado } from '../lib/auditoria';
import type { Corpus, Eixo, Perfil, Preferencias } from '../lib/types';
import { Bolha } from './Bolha';
import { Cabecalho } from './Cabecalho';
import { ChipsTrilhas, TelaTrilha } from './Trilhas';
import { Entrada } from './Entrada';
import { Escrevendo } from './Escrevendo';
import { EstadoErro } from './EstadoErro';
import { Folha } from './Folha';
import { MenuTeste } from './MenuTeste';
import { ResumoFerramenta } from './ResumoFerramenta';
import { FolhaTravessia } from './Travessia';

type Props = {
  corpus: Corpus;
  cliente: ClienteSerena;
  base: string;
  perfil: Perfil;
  dia: number;
  preferencias: Preferencias;
  aoMudarDia: (dia: number) => void;
  aoMudarPreferencias: (p: Preferencias) => void;
  aoRecomecar: () => void;
};

type FolhaAberta = 'travessia' | 'menu' | null;

export function Chat({ corpus, cliente, base, perfil, dia, preferencias, aoMudarDia, aoMudarPreferencias, aoRecomecar }: Props) {
  const nome = perfil.nome;
  const serena = useSerena({ corpus, cliente, dia, nome });
  const [folha, setFolha] = useState<FolhaAberta>(null);
  const [trilha, setTrilha] = useState<Eixo | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const roteiro = roteiroDoDia(corpus, dia);
  const mc = corpus.microcopy;

  const ultimoTexto = useMemo(() => {
    const u = serena.timeline[serena.timeline.length - 1];
    return u?.tipo === 'texto' ? u.payload.texto : u?.id;
  }, [serena.timeline]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [serena.timeline.length, ultimoTexto, serena.escrevendoDesde]);

  const exportar = () => {
    baixarJson(`serena-e5-d${dia}-${Date.now()}.json`, exportarAnonimizado(serena.timeline, nome));
  };

  return (
    <div className="app">
      {corpusNaoChancelado(corpus) && <div className="banner-prototipo">{mc.banner_prototipo}</div>}

      <Cabecalho
        base={base}
        dia={dia}
        rotulo={roteiro?.rotulo_travessia ?? ''}
        cabecalhoDia={(mc.cabecalho_dia ?? 'dia {dia}').replace('{dia}', String(dia))}
        variacao={preferencias.travessia}
        aoAbrirTravessia={() => setFolha('travessia')}
        aoAbrirMenuOculto={() => setFolha('menu')}
      />

      <main className="timeline" aria-label="conversa com a Serena">
        {serena.timeline.map((m) => {
          if (m.tipo === 'texto') {
            if (m.payload.streaming && !m.payload.texto) return null;
            return <Bolha key={m.id} mensagem={m} microcopy={mc} fioRota={preferencias.fioRota} />;
          }
          if (m.tipo === 'erro') return <EstadoErro key={m.id} mensagem={m} aoTentarDeNovo={serena.enviar} />;
          if (m.tipo === 'resumo_ferramenta') return <ResumoFerramenta key={m.id} mensagem={m} microcopy={mc} />;
          const entrada = entradaRegistry(m.payload.nome);
          if (!entrada) return null;
          const Componente = entrada.componente;
          return (
            <Componente
              key={m.id}
              corpus={corpus}
              mensagem={m}
              base={base}
              aoConcluir={({ resultado, dispensada }) => serena.concluirFerramenta(m.id, resultado, dispensada)}
            />
          );
        })}
        {serena.escrevendoDesde !== null && <Escrevendo microcopy={mc} desde={serena.escrevendoDesde} />}
        <div ref={fim} />
      </main>

      {serena.ponteAtiva ? (
        <div className="pausa">
          <p className="pausa__texto">{corpus.escalonamento.mensagem_pausa}</p>
          <button type="button" className="pausa__voltar" onClick={serena.voltarConversar}>
            {mc.voltar_conversar}
          </button>
        </div>
      ) : (
        <div className="rodape-chat">
          <ChipsTrilhas corpus={corpus} dia={dia} aoAbrirTrilha={setTrilha} aoAbrirPessoa={() => serena.abrirFerramenta('ponte_humana')} />
          <Entrada placeholder={mc.placeholder_input ?? ''} desabilitado={serena.escrevendoDesde !== null} aoEnviar={serena.enviar} />
          <p className="disclaimer">{mc.disclaimer}</p>
        </div>
      )}

      {folha === 'travessia' && (
        <Folha titulo="a travessia" aoFechar={() => setFolha(null)} rotuloFechar={mc.fechar ?? 'fechar'}>
          <FolhaTravessia corpus={corpus} dia={dia} />
        </Folha>
      )}

      {trilha !== null && (
        <TelaTrilha
          corpus={corpus}
          eixo={trilha}
          dia={dia}
          widgetAtivo={serena.widgetAtivo}
          aoFechar={() => setTrilha(null)}
          aoPerguntar={(pergunta) => {
            setTrilha(null);
            serena.enviar(pergunta);
          }}
          aoAbrirFerramenta={(nome) => {
            setTrilha(null);
            serena.abrirFerramenta(nome);
          }}
          aoVerCard={(cardId) => {
            setTrilha(null);
            serena.abrirCard(cardId);
          }}
          aoVerTravessia={() => {
            setTrilha(null);
            setFolha('travessia');
          }}
        />
      )}

      {folha === 'menu' && (
        <Folha titulo="bancada de teste" aoFechar={() => setFolha(null)} rotuloFechar={mc.fechar ?? 'fechar'}>
          <MenuTeste
            dia={dia}
            preferencias={preferencias}
            incidentes={contarIncidentes()}
            versaoCorpus={corpus.versao}
            aoMudarDia={(d) => {
              aoMudarDia(d);
              setFolha(null);
            }}
            aoMudarPreferencias={aoMudarPreferencias}
            aoExportar={exportar}
            aoRecomecar={aoRecomecar}
          />
        </Folha>
      )}
    </div>
  );
}
