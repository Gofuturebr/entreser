import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import corpusJson from '../../specs/fixtures/corpus_e5.exemplo.json';
import percursoJson from '../../specs/fixtures/percurso.json';
import { validarCorpus } from '../lib/corpus';
import { validarPercurso } from '../lib/percurso';
import type { Perfil } from '../lib/types';
import { Onboarding } from './Onboarding';
import { EtapaEmPreparo } from './EntradaJornada';

const corpus = validarCorpus(corpusJson);
const percurso = validarPercurso(percursoJson);

describe('entrada do app: onde você está na jornada', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('só a etapa 5 está ativa no mapa', () => {
    expect(percurso.fases.filter((f) => f.ativa).map((f) => f.numero)).toEqual([5]);
  });

  it('escolher a espera (E5) segue para nome, dia e disclaimer; o perfil guarda a fase', async () => {
    const aoConcluir = vi.fn<(p: Perfil) => void>();
    render(<Onboarding corpus={corpus} percurso={percurso} base="/" aoConcluir={aoConcluir} />);
    await userEvent.click(screen.getByRole('button', { name: 'oi, Serena' }));
    expect(screen.getByRole('heading', { name: 'Onde você está agora?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'é aqui que eu estou' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /etapa 5:/ }));
    expect(screen.getByText('a Serena acompanha esta etapa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'seguir para a espera' }));
    await userEvent.click(screen.getByRole('button', { name: 'prefiro não dizer' }));
    await userEvent.click(screen.getByRole('button', { name: /estou no dia/ }));
    await userEvent.click(screen.getByRole('button', { name: 'vamos juntas' }));
    expect(aoConcluir).toHaveBeenCalledWith(expect.objectContaining({ fase: 5, diaInformado: 1 }));
  });

  it('escolher outra etapa conclui só com a fase (sem dia) e mostra o momento', async () => {
    const aoConcluir = vi.fn<(p: Perfil) => void>();
    render(<Onboarding corpus={corpus} percurso={percurso} base="/" comecarNaJornada aoConcluir={aoConcluir} />);
    await userEvent.click(screen.getByRole('radio', { name: /etapa 3:/ }));
    expect(screen.getByRole('heading', { name: 'O Olhar Voltado para Si' })).toBeInTheDocument();
    expect(screen.getByText('esta etapa ainda está em preparo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'é aqui que eu estou' }));
    expect(aoConcluir).toHaveBeenCalledWith({ fase: 3 });
  });

  it('tela "em preparo" aceita aviso e permite mudar onde está', async () => {
    const aoAvisar = vi.fn();
    const aoMudar = vi.fn();
    const fase = percurso.fases[2];
    if (!fase) throw new Error('fase ausente');
    render(<EtapaEmPreparo percurso={percurso} fase={fase} avisada={false} aoAvisar={aoAvisar} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole('button', { name: 'quero ser avisada quando chegar' }));
    expect(aoAvisar).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'mudar onde estou' }));
    expect(aoMudar).toHaveBeenCalled();
  });
});
