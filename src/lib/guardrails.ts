// Guardrails fora do prompt (01-build-spec.md §5.2). As listas vêm do corpus,
// nunca do código: este módulo só sabe comparar texto.

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pré-filtro de crise: determinístico, curto-circuita antes de qualquer modelo.
 * Retorna o termo que casou, ou null.
 */
export function detectarCrise(texto: string, termosGatilho: string[]): string | null {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  for (const termo of termosGatilho) {
    const t = normalizar(termo);
    if (t && alvo.includes(t)) return termo;
  }
  return null;
}

/**
 * Pós-filtro de vocabulário: casa no início de palavra, sem acento e sem caixa,
 * para pegar flexões e plurais dos termos da lista.
 */
export function encontrarVocabularioProibido(texto: string, lista: string[]): string | null {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  for (const termo of lista) {
    const t = normalizar(termo);
    if (!t) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(t)}`, 'u');
    if (re.test(alvo)) return termo;
  }
  return null;
}
