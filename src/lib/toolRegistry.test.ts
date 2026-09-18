import { describe, expect, it } from 'vitest';
import { contaComoWidgetAtivo, ehRegistrada, TOOL_REGISTRY } from './toolRegistry';
import corpus from '../../specs/fixtures/corpus_e5.exemplo.json';

describe('ToolRegistry', () => {
  it('só aceita nomes registrados', () => {
    expect(ehRegistrada('plano_espera')).toBe(true);
    expect(ehRegistrada('meditacao_guiada')).toBe(false);
    expect(ehRegistrada('__proto__')).toBe(false);
  });
  it('ponte humana é privilegiada e o card é leve: nenhum ocupa a vaga de widget ativo', () => {
    expect(contaComoWidgetAtivo('ponte_humana')).toBe(false);
    expect(contaComoWidgetAtivo('card_micro')).toBe(false);
    expect(contaComoWidgetAtivo('sos_google')).toBe(true);
  });
  it('toda ferramenta comum do registry existe no corpus', () => {
    for (const nome of Object.keys(TOOL_REGISTRY)) {
      if (nome === 'ponte_humana' || nome === 'card_micro') continue;
      expect(corpus.ferramentas.some((f) => f.id === nome), nome).toBe(true);
    }
  });
});
