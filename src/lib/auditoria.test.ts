import { beforeEach, describe, expect, it } from 'vitest';
import { anonimizarTexto, contarIncidentes, exportarAnonimizado, lerAuditoria, registrarIncidente } from './auditoria';
import { storage } from './storage';
import type { Mensagem } from './types';

describe('auditoria anonimizada', () => {
  beforeEach(() => storage.limparTudo());

  it('remove o nome de todo texto exportado', () => {
    const timeline: Mensagem[] = [
      { id: '1', autor: 'usuaria', tipo: 'texto', payload: { texto: 'oi, sou a Ana e a ana tá cansada' } },
      { id: '2', autor: 'serena', tipo: 'texto', payload: { texto: 'Oi, Ana.' } },
    ];
    const json = JSON.stringify(exportarAnonimizado(timeline, 'Ana'));
    expect(json).not.toMatch(/\bAna\b/i);
    expect(json).toContain('[nome]');
    expect(json).toContain('"anonimizado":true');
  });

  it('não corrompe palavras que contêm o nome', () => {
    expect(anonimizarTexto('a Ana anda ansiosa', 'Ana')).toBe('a [nome] anda ansiosa');
  });

  it('conta incidentes', () => {
    registrarIncidente('pos_filtro', 'termo x');
    registrarIncidente('widget_duplicado', 'plano_espera');
    expect(contarIncidentes()).toBe(2);
    expect(lerAuditoria().incidentes[0]?.tipo).toBe('pos_filtro');
  });
});
