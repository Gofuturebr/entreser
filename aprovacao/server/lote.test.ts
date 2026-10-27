import { cpSync, mkdtempSync, renameSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { ARQUIVO_PLANILHA, lerLote } from './lote.ts';
import { extrairZip } from './zip.ts';

const exemplo = resolve(import.meta.dirname, '..', 'exemplo');
const tmps: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'aprov-'));
  tmps.push(d);
  return d;
};
afterEach(() => tmps.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('manifesto JSON', () => {
  it('lê trilhas, temas (pela ordem), conteúdos e arquivos', async () => {
    const l = await lerLote(join(exemplo, 'lote-exemplo'), 'f1');
    expect(l.nome).toBe('Exemplo · Jardinagem em casa');
    expect(l.trilhas.map((t) => t.titulo)).toEqual(['Entender', 'Praticar']);
    const c = l.conteudos['C1.1']!;
    expect(c.imagens).toHaveLength(4);
    expect(c.pecas).toEqual([{ skin: 'carrossel', html: 'TR-ENT/t1-luz-e-agua/C1.1-quanta-luz-cada-planta-pede/peca.html' }]);
    expect(c.texto).toContain('texto de exemplo');
    expect(c.duracao).toBe('2 min');
    expect(l.conteudos['C2.2']!.pecas).toEqual([]);
    expect(l.avisos).toEqual([]);
  });

  it('conteúdo por referência aparece no outro tema com o título da origem', async () => {
    const l = await lerLote(join(exemplo, 'lote-exemplo'), 'f1');
    const t2 = l.trilhas[1]!.temas[0]!;
    expect(t2.itens.at(-1)).toEqual({ id: 'C1.1', titulo: 'Quanta luz cada planta pede', ref: true });
  });

  it('arquivo citado e ausente vira aviso e sai da lista', async () => {
    const d = tmp();
    cpSync(join(exemplo, 'lote-exemplo'), d, { recursive: true });
    rmSync(join(d, 'TR-ENT/t1-luz-e-agua/C1.1-quanta-luz-cada-planta-pede/imagens/quanta-luz-02.jpg'));
    const l = await lerLote(d, 'f1');
    expect(l.conteudos['C1.1']!.imagens).toHaveLength(3);
    expect(l.avisos).toEqual(['C1.1: arquivo citado e ausente: imagens/quanta-luz-02.jpg']);
  });
});

describe('manifesto Planilha', () => {
  const preparar = () => {
    const d = tmp();
    cpSync(join(exemplo, 'planilha-exemplo'), d, { recursive: true });
    renameSync(join(d, 'Planilha-exemplo.xlsx'), join(d, ARQUIVO_PLANILHA));
    return d;
  };

  it('Eixo vira trilha, Trilha vira tema, e cada linha acha a pasta pelo ID', async () => {
    const l = await lerLote(preparar(), 'entender');
    expect(l.manifesto).toBe('planilha');
    expect(l.trilhas.map((t) => [t.titulo, t.subtitulo])).toEqual([['Entender', 'Base'], ['Praticar', 'Mão na massa']]);
    expect(l.trilhas[0]!.temas[0]!.titulo).toBe('Luz e água'); // aba Trilhas da planilha
    const c = l.conteudos['C1.1']!;
    expect(c.pasta).toBe('pastas/C1.1-quanta-luz-cada-planta-pede');
    expect(c.imagens).toHaveLength(4);
    expect(c.pecas[0]!.html).toBe('pastas/C1.1-quanta-luz-cada-planta-pede/peca.html');
    expect(c.introducao).toContain('olhar para a janela');
    expect(l.conteudos['C1.2']!.modificacao).toBe('Título ajustado na revisão');
  });

  it('linha sem pasta aparece só com os textos da planilha', async () => {
    const l = await lerLote(preparar(), 'entender');
    expect(l.conteudos['C2.2']).toMatchObject({ pasta: null, pecas: [], imagens: [], texto: null, titulo: 'Quando trocar de vaso' });
  });
});

describe('ZIP', () => {
  it('recusa caminho que sai da pasta', () => {
    const d = tmp();
    const zip = new AdmZip();
    zip.addFile('ok.txt', Buffer.from('ok'));
    const arquivo = join(d, 'mau.zip');
    zip.writeZip(arquivo);
    // Reescreve o nome da entrada para "../fora.txt" depois de criada.
    const z = new AdmZip(arquivo);
    z.getEntries()[0]!.entryName = '../fora.txt';
    z.writeZip(arquivo);
    expect(() => extrairZip(arquivo, join(d, 'destino'))).toThrow(/caminho inválido/);
    expect(existsSync(join(d, 'fora.txt'))).toBe(false);
  });

  it('pasta envolvente com manifesto sobe para a raiz', () => {
    const d = tmp();
    const zip = new AdmZip();
    zip.addLocalFolder(join(exemplo, 'lote-exemplo'), 'meu-lote');
    zip.writeZip(join(d, 'l.zip'));
    extrairZip(join(d, 'l.zip'), join(d, 'x'));
    expect(readdirSync(join(d, 'x')).sort()).toEqual(['TR-ENT', 'TR-PRA', 'trilhas.json']);
  });
});
