import type { MensagemErro } from '../lib/types';

export function EstadoErro({ mensagem, aoTentarDeNovo }: { mensagem: MensagemErro; aoTentarDeNovo: (texto: string) => void }) {
  const { texto, reenviar } = mensagem.payload;
  return (
    <div className="bolha bolha--serena bolha--erro" role="status">
      <p>{texto}</p>
      {reenviar !== undefined && (
        <button type="button" className="bolha__acao" onClick={() => aoTentarDeNovo(reenviar)}>
          tentar de novo
        </button>
      )}
    </div>
  );
}
