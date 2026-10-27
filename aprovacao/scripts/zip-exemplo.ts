// Gera os ZIPs de exemplo para testar o upload no admin:
//   exemplo/lote-exemplo.zip     → manifesto JSON (trilhas.json na raiz)
//   exemplo/planilha-exemplo.zip → planilha .xlsx + pastas de conteúdo
//   exemplo/planilhas-por-trilha.zip → uma planilha por trilha + as mesmas pastas
import { join, resolve } from 'node:path';
import AdmZip from 'adm-zip';

const exemplo = resolve(import.meta.dirname, '..', 'exemplo');
for (const nome of ['lote-exemplo', 'planilha-exemplo']) {
  const zip = new AdmZip();
  zip.addLocalFolder(join(exemplo, nome));
  zip.writeZip(join(exemplo, `${nome}.zip`));
  console.log(`exemplo/${nome}.zip`);
}

const porTrilha = new AdmZip();
porTrilha.addLocalFolder(join(exemplo, 'planilhas-por-trilha'));
porTrilha.addLocalFolder(join(exemplo, 'planilha-exemplo', 'pastas'), 'pastas');
porTrilha.writeZip(join(exemplo, 'planilhas-por-trilha.zip'));
console.log('exemplo/planilhas-por-trilha.zip');
