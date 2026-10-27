import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { Alvo, Apontamento } from '../../../server/tipos.ts';
import { dataCurta, mensagem } from '../util.ts';

const ROTULO: Record<Alvo, string> = { texto: 'Texto', formato: 'Formato', imagem: 'Imagem' };

export function ListaApontamentos({ itens, mostrarAlvo = false }: { itens: Apontamento[]; mostrarAlvo?: boolean }) {
  if (itens.length === 0) return null;
  return (
    <ul className="apontamentos">
      {itens.map((a) => (
        <li key={a.id} className={a.resolvidoEm ? 'resolvido' : ''}>
          <div className="apontamento-meta">
            {mostrarAlvo && <span className="etiqueta">{ROTULO[a.alvo]}</span>}
            <strong>{a.revisora}</strong>
            <span>{dataCurta(a.criadoEm)}</span>
            {a.resolvidoEm && <span className="etiqueta etiqueta-ok">resolvido</span>}
            <VersaoDoApontamento a={a} />
          </div>
          <p>{a.texto}</p>
        </li>
      ))}
    </ul>
  );
}

/** "feito na v1 · já há v2" quando o item foi corrigido depois do apontamento. */
export function VersaoDoApontamento({ a }: { a: Apontamento }) {
  if (a.versao === null || a.versaoAtual === null || a.versaoAtual <= a.versao) return null;
  return (
    <span className="etiqueta etiqueta-versao">
      feito na v{a.versao} · já há v{a.versaoAtual}
    </span>
  );
}

type Props = {
  /** Alvos que a revisora pode escolher; com um só, a escolha não aparece. */
  alvos: Alvo[];
  rotulo: string;
  dica: string;
  aoEnviar: (alvo: Alvo, texto: string) => Promise<void>;
  /** Conteúdo extra à esquerda na linha de ações (ex.: botão "Aprovado"). */
  extra?: ReactNode;
};

export function FormApontamento({ alvos, rotulo, dica, aoEnviar, extra }: Props) {
  const [alvo, setAlvo] = useState<Alvo>(alvos[0] ?? 'texto');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const id = useId();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      await aoEnviar(alvo, texto.trim());
      setTexto('');
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e2) {
      setErro(mensagem(e2));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="form-apontamento" onSubmit={enviar}>
      <label htmlFor={id}>{rotulo}</label>
      {alvos.length > 1 && (
        <div className="alternar" role="radiogroup" aria-label="Sobre o quê">
          {alvos.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={alvo === a} className={alvo === a ? 'ativo' : ''} onClick={() => setAlvo(a)}>
              {ROTULO[a]}
            </button>
          ))}
        </div>
      )}
      <textarea id={id} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={dica} rows={3} maxLength={5000} />
      <div className="form-acoes">
        {extra}
        {erro && <span className="erro">{erro}</span>}
        {ok && <span className="ok">Apontamento registrado.</span>}
        <button type="submit" className="botao" disabled={!texto.trim() || enviando}>
          {enviando ? 'Enviando…' : 'Enviar apontamento'}
        </button>
      </div>
    </form>
  );
}
