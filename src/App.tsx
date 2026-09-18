import { useEffect, useMemo, useState } from 'react';
import { carregarCorpus } from './lib/corpus';
import { calcularDia, diaForcadoDaUrl, hojeISO } from './lib/relogio';
import { storage } from './lib/storage';
import { criarClienteMock } from './mock/clienteMock';
import type { Corpus, Perfil, Preferencias } from './lib/types';
import { Onboarding } from './components/Onboarding';
import { Chat } from './components/Chat';

const BASE = import.meta.env.BASE_URL;

type EstadoCorpus = { status: 'carregando' } | { status: 'pronto'; corpus: Corpus } | { status: 'indisponivel' };

export default function App() {
  const [estado, setEstado] = useState<EstadoCorpus>({ status: 'carregando' });
  const [perfil, setPerfil] = useState<Perfil | null>(() => storage.lerPerfil());
  const [preferencias, setPreferencias] = useState<Preferencias>(() => storage.lerPreferencias());
  const [diaForcado, setDiaForcado] = useState<number | null>(() => diaForcadoDaUrl(window.location.search));

  useEffect(() => {
    let ativo = true;
    carregarCorpus(BASE)
      .then((corpus) => ativo && setEstado({ status: 'pronto', corpus }))
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

  const { corpus } = estado;

  if (!perfil) {
    return (
      <Onboarding
        corpus={corpus}
        base={BASE}
        aoConcluir={(p) => {
          storage.salvarPerfil(p);
          setPerfil(p);
        }}
      />
    );
  }

  const dia = diaForcado ?? calcularDia(perfil.diaInformado, perfil.dataInformada);

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
      aoRecomecar={() => {
        storage.limparTudo();
        window.location.assign(window.location.pathname);
      }}
    />
  );
}
