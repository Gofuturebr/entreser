import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import AdmZip from 'adm-zip';

const LIMITE_DESCOMPACTADO = 3 * 1024 ** 3;
const MANIFESTOS = /^(trilhas\.json|conteudo\.json|.*\.xlsx)$/i;

/** Extrai o ZIP em `destino`, recusando caminhos que escapem da pasta. */
export function extrairZip(arquivo: string, destino: string): void {
  let zip: AdmZip;
  try {
    zip = new AdmZip(arquivo);
  } catch {
    throw new Error('Não consegui abrir o ZIP: confira se o arquivo está completo.');
  }
  const base = resolve(destino);
  mkdirSync(base, { recursive: true });
  const entradas = zip.getEntries();
  const total = entradas.reduce((s, e) => s + e.header.size, 0);
  if (total > LIMITE_DESCOMPACTADO) throw new Error('O ZIP descompactado passa de 3 GB.');

  for (const e of entradas) {
    const nome = e.entryName.replace(/\\/g, '/');
    const partes = nome.split('/');
    if (partes[0] === '__MACOSX' || partes.at(-1) === '.DS_Store') continue;
    const alvo = resolve(base, nome);
    if (!alvo.startsWith(base + sep)) throw new Error(`O ZIP tem um caminho inválido: ${nome}`);
    if (e.isDirectory) {
      mkdirSync(alvo, { recursive: true });
      continue;
    }
    mkdirSync(dirname(alvo), { recursive: true });
    writeFileSync(alvo, e.getData());
  }
  subirPastaUnica(base);
}

/** ZIP feito com "compactar pasta" traz uma pasta envolvente: os arquivos sobem para a raiz. */
function subirPastaUnica(base: string): void {
  for (;;) {
    const itens = readdirSync(base).filter((n) => !n.startsWith('.'));
    if (itens.some((n) => MANIFESTOS.test(n))) return;
    const unico = itens[0];
    if (itens.length !== 1 || !unico || !statSync(join(base, unico)).isDirectory()) return;
    const interna = join(base, unico);
    // Só sobe quando a pasta envolvente traz um manifesto; pastas de conteúdo
    // sem manifesto ficam onde estão (a planilha as encontra em qualquer nível).
    if (!readdirSync(interna).some((n) => MANIFESTOS.test(n))) return;
    const temporaria = join(base, `.subir-${Date.now()}`);
    renameSync(interna, temporaria);
    for (const n of readdirSync(temporaria)) {
      if (existsSync(join(base, n))) throw new Error(`O ZIP tem nomes repetidos: ${n}`);
      renameSync(join(temporaria, n), join(base, n));
    }
    rmdirSync(temporaria);
  }
}
