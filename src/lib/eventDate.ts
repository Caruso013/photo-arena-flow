import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function parseCampaignDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  try {
    const parsed = parseISO(trimmed);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatCampaignDate(dateStr?: string | null, pattern = 'dd/MM/yyyy'): string | null {
  const date = parseCampaignDate(dateStr);
  if (!date) return null;

  return format(date, pattern, { locale: ptBR });
}
