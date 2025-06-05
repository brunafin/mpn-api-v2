/**
 * Remove non-digit characters from a phone number string.
 * If the number matches the pattern of a Brazilian mobile (11 digits, with a 9 after the area code),
 * it removes the extra '9' after the area code.
 * Otherwise, returns only the digits.
 *
 * @param phone - The input phone number string.
 * @returns The sanitized phone number string.
 */
export function sanitizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (/^(\d{2})9(\d{8})$/.test(digits)) {
    return digits.replace(/^(\d{2})9(\d{8})$/, '$1$2');
  }
  return digits;
}