import type { Corpus, MensagemFerramenta } from '../lib/types';
import { cardDoCorpus, ferramentaDoCorpus } from '../lib/corpus';
import { WidgetFerramenta, type ResultadoWidget } from './WidgetFerramenta';
import { CardMicrolearning } from './CardMicrolearning';
import { CardPonteHumana } from './CardPonteHumana';

// Adaptadores: cada componente do registry recebe as mesmas props e busca o
// seu miolo no corpus. O componente é casca; o corpus é o conteúdo chancelado.

export type PropsComponenteRegistry = {
  corpus: Corpus;
  mensagem: MensagemFerramenta;
  base: string;
  aoConcluir: (r: ResultadoWidget) => void;
};

function widgetDoCorpus(id: string) {
  return function Widget({ corpus, aoConcluir }: PropsComponenteRegistry) {
    const ferramenta = ferramentaDoCorpus(corpus, id);
    if (!ferramenta) return null;
    return <WidgetFerramenta ferramenta={ferramenta} microcopy={corpus.microcopy} aoConcluir={aoConcluir} />;
  };
}

export const SosGoogleWidget = widgetDoCorpus('sos_google');
export const PlanoEsperaWidget = widgetDoCorpus('plano_espera');
export const AcordosWidget = widgetDoCorpus('acordos_casal');

export function PonteHumanaCard({ corpus }: PropsComponenteRegistry) {
  return <CardPonteHumana escalonamento={corpus.escalonamento} />;
}

export function CardMicrolearningWidget({ corpus, mensagem, base, aoConcluir }: PropsComponenteRegistry) {
  const id = mensagem.payload.params.card_id;
  const card = id ? cardDoCorpus(corpus, id) : undefined;
  if (!card) return null;
  return <CardMicrolearning card={card} microcopy={corpus.microcopy} base={base} aoDispensar={() => aoConcluir({ resultado: {}, dispensada: true })} />;
}
