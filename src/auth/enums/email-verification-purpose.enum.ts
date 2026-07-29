/** Finalidade do código enviado por e-mail. */
export const EmailVerificationPurpose = {
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
} as const;

export type EmailVerificationPurpose =
  (typeof EmailVerificationPurpose)[keyof typeof EmailVerificationPurpose];
