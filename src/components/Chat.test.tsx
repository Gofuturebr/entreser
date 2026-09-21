import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import corpusJson from '../../specs/fixtures/corpus_e5.exemplo.json';
import percursoJson from '../../specs/fixtures/percurso.json';
import { validarPercurso } from '../lib/percurso';
import { validarCorpus } from '../lib/corpus';
import { storage } from '../lib/storage';
import { criarClienteMock } from '../mock/clienteMock';
import { contarIncidentes, lerAuditoria } from '../lib/auditoria';
import { Chat } from './Chat';

const corpus = validarCorpus(corpusJson);
const percurso = validarPercurso(percursoJson);
const rapido = { primeiro_token_ms: 0, intervalo_token_ms: 0, demora_ms: 0 };

function montar(dia = 6) {
  const cliente = criarClienteMock(corpus, undefined, rapido);
  return render(
    <Chat
      corpus={corpus}
      percurso={percurso}
      cliente={cliente}
      base="/"
      perfil={{ fase: 5, nome: 'Ana', diaInformado: dia, dataInformada: '2026-09-18' }}
      dia={dia}
      preferencias={{ travessia: 'marcador', fioRota: true }}
      aoMudarDia={() => undefined}
      aoMudarPreferencias={() => undefined}
      aoMudarEtapa={() => undefined}
      aoRecomecar={() => undefined}
    />,
  );
}

const campo = () => screen.getByLabelText('escreve o que quiser…');

describe('Chat (Degrau B)', () => {
  beforeEach(() => {
    storage.limparTudo();
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('mensagem do dia com selo, 1x por dia', () => {
    montar(6);
    expect(screen.getByText(/mensagem do dia/)).toBeInTheDocument();
    expect(screen.getByText(corpus.roteiros_diarios[5]?.mensagem_proativa ?? '')).toBeInTheDocument();
  });

  it('pré-filtro de crise curto-circuita: Ponte Humana sem modelo, chips e input somem', async () => {
    montar();
    await userEvent.type(campo(), 'quero morrer{enter}');
    expect(await screen.findByRole('region', { name: 'Ponte Humana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /falar com a equipe Entre Ser/ })).toBeInTheDocument();
    expect(screen.queryByText(/cvv/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('escreve o que quiser…')).not.toBeInTheDocument();
    expect(lerAuditoria().incidentes[0]?.tipo).toBe('crise_prefiltro');
    await userEvent.click(screen.getByRole('button', { name: 'voltar a conversar' }));
    expect(screen.getByLabelText('escreve o que quiser…')).toBeInTheDocument();
    expect(screen.getByText(/Ponte Humana · D6/)).toBeInTheDocument();
  });

  it('chip abre widget; segunda invocação não renderiza e registra incidente (10b); concluir vira resumo (10c)', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Cuidar' }));
    await userEvent.click(screen.getByRole('button', { name: 'abrir Meu Plano da Espera' }));
    expect(screen.getByRole('region', { name: 'Meu Plano da Espera' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cuidar' }));
    expect(screen.getByRole('button', { name: 'abrir SOS Não Dê um Google' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'fechar' }));

    await userEvent.type(campo(), '#duplo{enter}');
    await waitFor(() => expect(screen.getByText(/Vamos dar forma ao dia de hoje\?/)).toBeInTheDocument());
    await waitFor(() => expect(lerAuditoria().incidentes.some((i) => i.tipo === 'widget_duplicado')).toBe(true));
    expect(screen.getAllByRole('region', { name: 'Meu Plano da Espera' })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'caminhada' }));
    await userEvent.click(screen.getByRole('button', { name: 'são essas' }));
    await userEvent.click(screen.getByRole('button', { name: 'combinado' }));
    expect(screen.getByText('✓ Plano do D6: caminhada')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Meu Plano da Espera' })).not.toBeInTheDocument();
  });

  it('"agora não" colapsa em resumo de dispensa', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Cuidar' }));
    await userEvent.click(screen.getByRole('button', { name: 'abrir SOS Não Dê um Google' }));
    await userEvent.click(screen.getByRole('button', { name: 'agora não' }));
    expect(screen.getByText(/deixado para depois/)).toBeInTheDocument();
    expect(storage.lerDispensadas()).toContain('sos_google');
  });

  it('invocação pelo modelo vira widget (10a); nome fora do registry é ignorado com incidente', async () => {
    montar();
    await userEvent.type(campo(), 'não sei o que fazer hoje{enter}');
    expect(await screen.findByRole('region', { name: 'Meu Plano da Espera' })).toBeInTheDocument();
    expect(screen.queryByText(/<<FERRAMENTA>>/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'agora não' }));

    await userEvent.type(campo(), '#inventada{enter}');
    await waitFor(() => expect(lerAuditoria().incidentes.some((i) => i.tipo === 'ferramenta_desconhecida')).toBe(true));
    await userEvent.type(campo(), '#quebrado{enter}');
    await waitFor(() => expect(lerAuditoria().incidentes.some((i) => i.tipo === 'bloco_malformado')).toBe(true));
    expect(screen.getByText('Vamos dar forma ao dia?')).toBeInTheDocument();
  });

  it('card de microlearning inline após convite; dispensado não reaparece (10f)', async () => {
    montar();
    await userEvent.type(campo(), 'tô com cólica{enter}');
    expect(await screen.findByRole('article', { name: /Por que os sintomas mentem/ })).toBeInTheDocument();
    expect(screen.getByText('em breve na íntegra')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'agora não' }));
    expect(screen.getByText('card guardado para depois')).toBeInTheDocument();
    await userEvent.type(campo(), 'tô com cólica de novo{enter}');
    await waitFor(() => expect(screen.getAllByText(/A progesterona que você usa/)).toHaveLength(2));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('pós-filtro descarta resposta com vocabulário proibido e registra incidente', async () => {
    montar();
    await userEvent.type(campo(), '#proibido{enter}');
    await waitFor(() => expect(contarIncidentes()).toBeGreaterThan(0));
    expect(screen.queryByText(/falhou/)).not.toBeInTheDocument();
    expect(lerAuditoria().incidentes[0]?.tipo).toBe('pos_filtro');
  });

  it('erro do modelo mostra microcopy no Tom e Voz com "tentar de novo"', async () => {
    montar();
    await userEvent.type(campo(), '#erro{enter}');
    expect(await screen.findByText(corpus.microcopy.erro_resposta ?? '')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tentar de novo' })).toBeInTheDocument();
  });

  it('D10: chip Cuidar em evidência e Acordos em primeiro na trilha', async () => {
    montar(10);
    expect(screen.getByRole('button', { name: 'Cuidar' })).toHaveClass('chip--evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Cuidar' }));
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titulos[0]).toBe('Acordos para o dia do teste');
  });

  it('chip Falar com uma pessoa abre a Ponte Humana direto', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Falar com uma pessoa' }));
    expect(screen.getByRole('region', { name: 'Ponte Humana' })).toBeInTheDocument();
  });
});

describe('trilhas (Entender · Bem-estar · Cuidar)', () => {
  beforeEach(() => {
    storage.limparTudo();
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('três chips numa linha; a tela da trilha mostra seções com explicação, base e temas', async () => {
    montar();
    for (const nome of ['Entender', 'Bem-estar', 'Cuidar']) expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Bem-estar' }));
    const tela = screen.getByRole('dialog', { name: /Bem-estar · clareza começa no acolhimento/ });
    expect(tela).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O fim da positividade tóxica' })).toBeInTheDocument();
    expect(screen.getAllByText('o que este conteúdo aborda').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Medo do resultado' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Estou com muito medo de dar negativo.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/medo/).length).toBeGreaterThan(1));
  });

  it('ver o card a partir da trilha insere o card inline', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Entender' }));
    await userEvent.click(screen.getByRole('button', { name: /ver o card: A implantação é silenciosa/ }));
    expect(screen.getByRole('article', { name: /A implantação é silenciosa/ })).toBeInTheDocument();
  });
});
