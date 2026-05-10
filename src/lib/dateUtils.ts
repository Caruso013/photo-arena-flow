/**
 * Parse a date string from the database safely without timezone shifts.
 * Handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss..." formats by treating
 * date-only strings as a LOCAL date (not UTC), avoiding off-by-one day bugs.
 */
export function parseLocalDate(input?: string | null): Date | null {
  if (!input) return null;
  const dateOnly = String(input).split('T')[0];
  const m = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  const dt = new Date(input);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Format an event date string for display in pt-BR without timezone shifts.
 */
export function formatEventDate(
  input?: string | null,
  options?: Intl.DateTimeFormatOptions,
  fallback = ''
): string {
  const dt = parseLocalDate(input);
  if (!dt) return fallback;
  return dt.toLocaleDateString('pt-BR', options);
}
