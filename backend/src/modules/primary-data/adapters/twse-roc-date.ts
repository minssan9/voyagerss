/** Convert ROC calendar YYYYMM (e.g. 11506) to ISO YYYY-MM (2026-06). */
export function rocYmToIsoYm(rocYm: string | undefined): string {
  if (!rocYm || rocYm.length < 5) return rocYm ?? '';
  const yearRoc = Number(rocYm.slice(0, rocYm.length - 2));
  const month = rocYm.slice(-2);
  const year = yearRoc + 1911;
  return `${year}-${month}`;
}
