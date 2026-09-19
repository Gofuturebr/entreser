import { describe, expect, it } from 'vitest';
import corpus from '../../specs/fixtures/corpus_e5.exemplo.json';
import { detectarCrise, encontrarVocabularioProibido, normalizar } from './guardrails';

const termos = corpus.escalonamento.termos_gatilho;
const proibidos = corpus.vocabulario_proibido;

describe('pré-filtro de crise (determinístico, lista do corpus)', () => {
  it('detecta termo-gatilho sem acento e sem caixa', () => {
    expect(detectarCrise('Eu NÃO AGUENTO mais nada', termos)).not.toBeNull();
    expect(detectarCrise('nao vejo sentido em continuar', termos)).not.toBeNull();
  });
  it('não dispara em mensagens comuns da espera', () => {
    expect(detectarCrise('tô com cólica, é sintoma?', termos)).toBeNull();
    expect(detectarCrise('não aguento esperar', termos)).toBeNull();
  });
});

describe('pós-filtro de vocabulário (lista do corpus)', () => {
  it('casa flexões no início de palavra', () => {
    expect(encontrarVocabularioProibido('parece que o ciclo falhou', proibidos)).toBe('falhou');
    expect(encontrarVocabularioProibido('foi um fracasso', proibidos)).toBe('fracasso');
    expect(encontrarVocabularioProibido('a taxa de sucesso é alta', proibidos)).toBe('taxa de sucesso');
    expect(encontrarVocabularioProibido('É SÓ RELAXAR', proibidos)).toBe('é só relaxar');
  });
  it('não casa termos permitidos', () => {
    expect(encontrarVocabularioProibido('faz sentido você estar assim', proibidos)).toBeNull();
    expect(encontrarVocabularioProibido('pacientemente? não: com calma', proibidos)).toBe('paciente');
  });
  it('normaliza acentos e espaços', () => {
    expect(normalizar('  Relógio   BIOLÓGICO ')).toBe('relogio biologico');
  });
});

describe('o corpus de exemplo respeita o próprio vocabulário proibido', () => {
  it('nenhum texto exibível contém termo proibido', () => {
    const textos: string[] = [
      ...corpus.roteiros_diarios.map((r) => r.mensagem_proativa),
      ...corpus.faq.flatMap((f) => [f.resposta_base, f.titulo, f.pergunta]),
      ...corpus.acolhimento.flatMap((a) => [a.titulo ?? '', a.pergunta ?? '']),
      ...Object.values(corpus.eixos).flatMap((e) => [e.nome, e.subtitulo, e.descricao]),
      ...corpus.acolhimento.flatMap((a) => a.frases_validadas),
      ...corpus.ferramentas.flatMap((f) => f.passos.map((p) => p.texto)),
      ...corpus.cards_microlearning.flatMap((c) => [c.titulo, c.resumo_1_linha]),
      corpus.escalonamento.mensagem_ponte_humana,
      ...Object.values(corpus.microcopy),
      ...Object.values(corpus.onboarding),
    ];
    for (const t of textos) expect(encontrarVocabularioProibido(t, proibidos), t).toBeNull();
  });
});
