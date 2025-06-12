export const checkIsCellphoneNumberBR = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  const numero = digits.slice(2);
  return numero[0] === '9';
};
