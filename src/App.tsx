import { useEffect, useMemo, useState } from 'react';
import { carregarCorpus } from './lib/corpus';
import { carregarPercurso, faseDoPercurso } from './lib/percurso';
import { calcularDia, diaForcadoDaUrl, hojeISO } from './lib/relogio';
import { storage } from './lib/storage';
import { criarClienteMock } from './mock/clienteMock';
import type { Corpus, Percurso, Perfil, Preferencias } from './lib/types';
import { Onboarding } from './components/Onboarding';
import { Chat } from './components/Chat';
import { EtapaEmPreparo } from './components/EntradaJornada';

const BASE = import.meta.env.BASE_URL;

type EstadoCorpus = { status: 'carregando' } | { status: 'pronto'; corpus: Corpus; percurso: Percurso } | { status: 'indisponivel' };

export default function App() {
  const [estado, setEstado] = useState<EstadoCorpus>({ status: 'carregando' });
  const [perfil, setPerfil] = useState<Perfil | null>(() => storage.lerPerfil());
  const [preferencias, setPreferencias] = useState<Preferencias>(() => storage.lerPreferencias());
  const [diaForcado, setDiaForcado] = useState<number | null>(() => diaForcadoDaUrl(window.location.search));
  const [reescolhendo, setReescolhendo] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([carregarCorpus(BASE), carregarPercurso(BASE)])
      .then(([corpus, percurso]) => ativo && setEstado({ status: 'pronto', corpus, percurso }))
      .catch(() => ativo && setEstado({ status: 'indisponivel' }));
    return () => {
      ativo = false;
    };
  }, []);

  const cliente = useMemo(() => (estado.status === 'pronto' ? criarClienteMock(estado.corpus) : null), [estado]);

  if (estado.status === 'carregando') return <div className="tela-calma">um instante…</div>;
  if (estado.status === 'indisponivel' || !cliente) {
    return <div className="tela-calma">não consegui abrir a conversa agora — tenta de novo em um instante?</div>;
  }

  const { corpus, percurso } = estado;
  const faseAtual = perfil ? faseDoPercurso(percurso, perfil.fase) : undefined;

  if (!perfil || reescolhendo || !faseAtual || (faseAtual.ativa && perfil.diaInformado === undefined)) {
    return (
      <Onboarding
        corpus={corpus}
        percurso={percurso}
        base={BASE}
        faseInicial={perfil?.fase ?? null}
        comecarNaJornada={reescolhendo}
        aoConcluir={(p) => {
          storage.salvarPerfil(p);
          setPerfil(p);
          setReescolhendo(false);
        }}
      />
    );
  }

  if (!faseAtual.ativa) {
    return (
      <EtapaEmPreparo
        percurso={percurso}
        fase={faseAtual}
        avisada={perfil.avisarQuandoChegar === true}
        aoAvisar={() => {
          const novo: Perfil = { ...perfil, avisarQuandoChegar: true };
          storage.salvarPerfil(novo);
          setPerfil(novo);
        }}
        aoMudar={() => setReescolhendo(true)}
      />
    );
  }

  const dia = diaForcado ?? calcularDia(perfil.diaInformado ?? 1, perfil.dataInformada ?? hojeISO());

  const mudarDia = (d: number) => {
    const novo: Perfil = { ...perfil, diaInformado: d, dataInformada: hojeISO() };
    storage.salvarPerfil(novo);
    setPerfil(novo);
    setDiaForcado(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('dia');
    window.history.replaceState(null, '', url);
  };

  return (
    <Chat
      corpus={corpus}
      percurso={percurso}
      cliente={cliente}
      base={BASE}
      perfil={perfil}
      dia={dia}
      preferencias={preferencias}
      aoMudarDia={mudarDia}
      aoMudarPreferencias={(p) => {
        storage.salvarPreferencias(p);
        setPreferencias(p);
      }}
      aoMudarEtapa={() => setReescolhendo(true)}
      aoRecomecar={() => {
        storage.limparTudo();
        window.location.assign(window.location.pathname);
      }}
    />
  );
}
