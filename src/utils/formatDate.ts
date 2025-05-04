/**
 * Função para formatar uma data no formato dd/mm/aaaa.
 * @param timestamp - Data no formato timestamp (ex.: "2025-04-28 23:03:47.835058").
 * @returns A data formatada como uma string no formato dd/mm/aaaa.
 */
export function formatDateTimestampToDDMMYYYY(timestamp: Date): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Função para formatar uma data no formato dd/mm/aaaa a partir de uma string no formato yyyy-mm-dd.
 * @param dateString - Data no formato yyyy-mm-dd (ex.: "2025-10-01").
 * @returns A data formatada como uma string no formato dd/mm/aaaa.
 */
export function formatDateDateToDDMMYYYY(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}