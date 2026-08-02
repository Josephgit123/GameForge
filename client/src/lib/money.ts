// Matches how Surfboard's own hosted Payment Page formats each currency
// (e.g. Swedish "49,00 kr", not the US-style "SEK 49.00" a hardcoded
// en-US locale would produce) — same amount, just the natural convention
// for that currency instead of always US formatting.
const CURRENCY_LOCALES: Record<string, string> = {
  SEK: 'sv-SE',
  USD: 'en-US',
  EUR: 'de-DE',
};

export function formatMoney(minorUnits: number, currency: string): string {
  const locale = CURRENCY_LOCALES[currency] ?? 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minorUnits / 100);
}
