import { useRef, useState } from 'react';

type Props = { placeholder: string; desabilitado: boolean; aoEnviar: (texto: string) => void };

export function Entrada({ placeholder, desabilitado, aoEnviar }: Props) {
  const [texto, setTexto] = useState('');
  const campo = useRef<HTMLTextAreaElement>(null);

  const enviar = () => {
    const t = texto.trim();
    if (!t || desabilitado) return;
    aoEnviar(t);
    setTexto('');
    if (campo.current) campo.current.style.height = 'auto';
  };

  return (
    <form
      className="entrada"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <textarea
        ref={campo}
        className="entrada__campo"
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        value={texto}
        enterKeyHint="send"
        onChange={(e) => {
          setTexto(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviar();
          }
        }}
      />
      <button type="submit" className="entrada__enviar" aria-label="enviar" disabled={desabilitado || !texto.trim()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
