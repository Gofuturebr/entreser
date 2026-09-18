import { useState } from 'react';
import type { MensagemResumo, Microcopy } from '../lib/types';

export function ResumoFerramenta({ mensagem, microcopy }: { mensagem: MensagemResumo; microcopy: Microcopy }) {
  const [aberto, setAberto] = useState(false);
  const { resumo, resultado, dispensada } = mensagem.payload;
  const detalhes = Object.entries(resultado).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined));

  return (
    <button
      type="button"
      className={`resumo${dispensada ? ' resumo--dispensada' : ''}`}
      onClick={() => setAberto(!aberto)}
      aria-expanded={aberto}
      aria-label={`${resumo}. ${microcopy.ver_de_novo}`}
    >
      <span>{resumo}</span>
      {aberto && detalhes.length > 0 && (
        <span className="resumo__detalhe">
          {detalhes.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}
        </span>
      )}
    </button>
  );
}
