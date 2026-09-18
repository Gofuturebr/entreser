import type { Preferencias } from '../lib/types';
import { DIA_MAX } from '../lib/types';
import fixture from '../../specs/fixtures/respostas_mock.json';

type Props = {
  dia: number;
  preferencias: Preferencias;
  incidentes: number;
  versaoCorpus: string;
  aoMudarDia: (dia: number) => void;
  aoMudarPreferencias: (p: Preferencias) => void;
  aoExportar: () => void;
  aoRecomecar: () => void;
};

export function MenuTeste({ dia, preferencias, incidentes, versaoCorpus, aoMudarDia, aoMudarPreferencias, aoExportar, aoRecomecar }: Props) {
  return (
    <div className="menu-teste">
      <div className="menu-teste__grupo">
        <span className="menu-teste__rotulo">dia da espera (teste de mesa)</span>
        <div className="menu-teste__dias">
          {Array.from({ length: DIA_MAX }, (_, i) => i + 1).map((d) => (
            <button key={d} type="button" className="menu-teste__dia" aria-pressed={d === dia} onClick={() => aoMudarDia(d)}>
              D{d}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-teste__grupo">
        <span className="menu-teste__rotulo">hipóteses de design</span>
        <div className="menu-teste__linha">
          <span>marcador da travessia</span>
          <span className="alternar">
            <button type="button" aria-pressed={preferencias.travessia === 'marcador'} onClick={() => aoMudarPreferencias({ ...preferencias, travessia: 'marcador' })}>
              A · texto
            </button>
            <button type="button" aria-pressed={preferencias.travessia === 'pedras'} onClick={() => aoMudarPreferencias({ ...preferencias, travessia: 'pedras' })}>
              B · pedras
            </button>
          </span>
        </div>
        <div className="menu-teste__linha">
          <span>fio de cor por rota</span>
          <span className="alternar">
            <button type="button" aria-pressed={preferencias.fioRota} onClick={() => aoMudarPreferencias({ ...preferencias, fioRota: true })}>
              com
            </button>
            <button type="button" aria-pressed={!preferencias.fioRota} onClick={() => aoMudarPreferencias({ ...preferencias, fioRota: false })}>
              sem
            </button>
          </span>
        </div>
      </div>

      <div className="menu-teste__grupo">
        <span className="menu-teste__rotulo">comandos de bancada (escrever no chat)</span>
        <dl className="menu-teste__comandos">
          {Object.entries(fixture.bancada.comandos).map(([cmd, desc]) => (
            <div key={cmd} style={{ display: 'contents' }}>
              <dt>{cmd}</dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="menu-teste__grupo">
        <span className="menu-teste__rotulo">
          auditoria · corpus {versaoCorpus} · incidentes do pós-filtro e do registry: {incidentes}
        </span>
        <button type="button" className="botao-secundario" onClick={aoExportar}>
          exportar conversa anonimizada (JSON)
        </button>
        <button type="button" className="botao-secundario botao-secundario--cuidado" onClick={aoRecomecar}>
          recomeçar do zero (apaga nome, dia e conversa deste aparelho)
        </button>
      </div>
    </div>
  );
}
