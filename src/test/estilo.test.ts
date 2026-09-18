import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import corpus from '../../specs/fixtures/corpus_e5.exemplo.json';
import { encontrarVocabularioProibido } from '../lib/guardrails';

// Guardrails de código (CLAUDE.md "Estilo"): nada de hex fora de tokens.css,
// nada de vocabulário proibido em nenhuma superfície do front.

function arquivos(dir: string, filtro: (p: string) => boolean): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? arquivos(p, filtro) : filtro(p) ? [p] : [];
  });
}

const src = join(process.cwd(), 'src');

describe('estilo do projeto', () => {
  it('cores só via tokens: nenhum hex fora de styles/tokens.css', () => {
    const suspeitos = arquivos(src, (p) => /\.(tsx?|css)$/.test(p) && !p.endsWith('tokens.css') && !p.includes('.test.'));
    for (const p of suspeitos) {
      expect(readFileSync(p, 'utf8'), p).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('vocabulário proibido não aparece no código-fonte da interface', () => {
    const fontes = arquivos(src, (p) => /\.(tsx?|css)$/.test(p) && !p.includes('.test.'));
    for (const p of fontes) {
      const strings = readFileSync(p, 'utf8').match(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
      for (const s of strings) {
        expect(encontrarVocabularioProibido(s, corpus.vocabulario_proibido), `${p}: ${s}`).toBeNull();
      }
    }
  });
});
