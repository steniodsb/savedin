/**
 * Formats a raw numeric string (in cents) to BRL currency display format.
 * Example: "15000" → "150,00" | "1500000" → "15.000,00"
 */
export function formatCurrencyInput(rawCents: string): string {
  const digits = rawCents.replace(/\D/g, '');
  if (!digits) return '';

  const cents = parseInt(digits, 10);
  const value = (cents / 100).toFixed(2);
  const [intPart, decPart] = value.split('.');

  // Add thousand separators
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted},${decPart}`;
}

/**
 * Converts a BRL formatted string back to a numeric value.
 * Example: "15.000,00" → 15000 | "150,00" → 150
 */
export function parseCurrencyInput(formatted: string): number {
  if (!formatted) return 0;
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Converts a numeric value to raw cents string for state storage.
 * Example: 150.5 → "15050" | 15000 → "1500000"
 */
export function valueToCents(value: number): string {
  if (!value && value !== 0) return '';
  return String(Math.round(value * 100));
}

/**
 * onChange handler for currency inputs.
 * Takes only digit characters, stores as cents string.
 */
export function handleCurrencyChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void
) {
  const digits = e.target.value.replace(/\D/g, '');
  setter(digits);
}
