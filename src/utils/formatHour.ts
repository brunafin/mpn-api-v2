/**
 * Formata uma determinada hora como uma string no formato "HH:00".
 *
 * @param hour - A hora a ser formatada. Deve ser um número entre 0 e 23.
 * @returns A hora formatada como uma string no formato "HH:00".
 */
export const formatHour = (hour: number): string => {
  return hour.toString().padStart(2, '0') + ':00';
};
