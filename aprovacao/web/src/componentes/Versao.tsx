import { useState } from 'react';
import type { ItemRevisao } from '../../../server/tipos.ts';
import { mensagem } from '../util.ts';

const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** "v2 · corrigida em 27/10": só aparece quando o arquivo já teve correção. */
export function SeloVersao({ versao, atualizadoEm, rotulo = 'corrigida' }: { versao: number; atualizadoEm: string | null; rotulo?: string }) {
  if (versao <= 1) return null;
  return (
    <span className="selo-versao" title={`Versão ${versao}${atualizadoEm ? `, enviada em ${dia(atualizadoEm)}` : ''}`}>
      v{versao}
      {atualizadoEm && ` · ${rotulo} em ${dia(atualizadoEm)}`}
    </span>
  );
}

type Props = {
  info: ItemRevisao | undefined;
  revisoraId: number;
  aoMudar: (aprovado: boolean) => Promise<void>;
};

/** Botão "Aprovado" de um item (texto, peça ou imagem) e quem mais já aprovou. */
export function AprovarItem({ info, revisoraId, aoMudar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  if (!info) return null;
  const minha = info.aprovacoes.find((a) => a.revisoraId === revisoraId && !a.desatualizada);
  const outras = info.aprovacoes.filter((a) => a !== minha);

  async function mudar(aprovado: boolean) {
    setEnviando(true);
    setErro('');
    try {
      await aoMudar(aprovado);
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="aprovar-item">
      {minha ? (
        <span className="aprovado-por-mim">
          <button type="button" className="botao botao-aprovado ativo" aria-pressed disabled={enviando}>
            ✓ Aprovado
          </button>
          <button type="button" className="link pequeno" disabled={enviando} onClick={() => mudar(false)}>
            desfazer
          </button>
        </span>
      ) : (
        <button type="button" className="botao botao-aprovado" aria-pressed={false} disabled={enviando} onClick={() => mudar(true)}>
          Aprovado
        </button>
      )}
      {outras.length > 0 && (
        <span className="quem">
          {outras.map((a, i) => (
            <span key={a.revisoraId} className={a.desatualizada ? 'desatualizada' : ''}>
              {i > 0 && ' · '}
              {a.revisora} aprovou{a.desatualizada && ` a v${a.versao}`}
            </span>
          ))}
        </span>
      )}
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}
