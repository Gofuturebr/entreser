// Invocação Nível 1 (01-build-spec.md §10.3): bloco delimitado no fim da resposta.
// Parser tolerante: bloco malformado → ignorar por completo + sinalizar incidente.

export const ABRE = '<<FERRAMENTA>>';
export const FECHA = '<<FIM>>';

export type Invocacao = { nome: string; params: Record<string, string> };

export type ResultadoParse = {
  texto: string;
  invocacao: Invocacao | null;
  malformado: boolean;
};

export function extrairInvocacao(bruto: string): ResultadoParse {
  const inicio = bruto.indexOf(ABRE);
  if (inicio === -1) return { texto: bruto.trim(), invocacao: null, malformado: false };

  const fim = bruto.indexOf(FECHA, inicio + ABRE.length);
  const antes = bruto.slice(0, inicio);
  const depois = fim === -1 ? '' : bruto.slice(fim + FECHA.length);
  const texto = `${antes} ${depois}`.replace(/\s+/g, ' ').trim();

  if (fim === -1) return { texto, invocacao: null, malformado: true };

  const miolo = bruto.slice(inicio + ABRE.length, fim).trim();
  try {
    const json: unknown = JSON.parse(miolo);
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      return { texto, invocacao: null, malformado: true };
    }
    const obj = json as Record<string, unknown>;
    if (typeof obj.nome !== 'string' || !obj.nome.trim()) {
      return { texto, invocacao: null, malformado: true };
    }
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'nome') continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') params[k] = String(v);
    }
    return { texto, invocacao: { nome: obj.nome.trim(), params }, malformado: false };
  } catch {
    return { texto, invocacao: null, malformado: true };
  }
}

/**
 * Durante o streaming, esconde o bloco (ou o começo dele) para o texto
 * técnico nunca aparecer na bolha.
 */
export function textoVisivelDuranteStream(parcial: string): string {
  const inicio = parcial.indexOf(ABRE);
  if (inicio !== -1) return parcial.slice(0, inicio).trimEnd();
  // Um "<<FERRA" incompleto no fim também fica escondido.
  for (let i = Math.max(0, parcial.length - ABRE.length); i < parcial.length; i++) {
    if (parcial[i] === '<' && ABRE.startsWith(parcial.slice(i))) return parcial.slice(0, i).trimEnd();
  }
  return parcial;
}
