/** En az bir Unicode büyük harf + en az bir rakam (Türkçe dahil) */
const HAS_UPPER = /\p{Lu}/u;
const HAS_DIGIT = /\d/;

const MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_HINT_TR =
  `En az ${MIN_LENGTH} karakter; en az bir büyük harf ve en az bir rakam içermelidir.`;

/** Henüz sağlanmayan kurallar (sırayla: uzunluk, büyük harf, rakam) */
export function getPasswordMissingParts(password: string): string[] {
  const missing: string[] = [];
  if (password.length < MIN_LENGTH) {
    missing.push(`en az ${MIN_LENGTH} karakter`);
  }
  if (!HAS_UPPER.test(password)) {
    missing.push("en az bir büyük harf");
  }
  if (!HAS_DIGIT.test(password)) {
    missing.push("en az bir rakam");
  }
  return missing;
}

export function isPasswordPolicySatisfied(password: string): boolean {
  return password.length > 0 && getPasswordMissingParts(password).length === 0;
}

/** Yazarken gösterilecek kısa mesaj; şifre boşken null */
export function getPasswordLiveFeedback(password: string): {
  variant: "neutral" | "warning" | "success";
  text: string;
} {
  if (!password) {
    return { variant: "neutral", text: PASSWORD_REQUIREMENTS_HINT_TR };
  }
  const missing = getPasswordMissingParts(password);
  if (missing.length === 0) {
    return { variant: "success", text: "Şifre kurallarına uygun." };
  }
  return {
    variant: "warning",
    text: `Eksik: ${missing.join(", ")}.`,
  };
}

export function validatePasswordPolicy(password: string): { ok: true } | { ok: false; message: string } {
  if (!password || password.length < MIN_LENGTH) {
    return { ok: false, message: `Şifre en az ${MIN_LENGTH} karakter olmalıdır.` };
  }
  if (!HAS_UPPER.test(password)) {
    return { ok: false, message: "Şifre en az bir büyük harf içermelidir." };
  }
  if (!HAS_DIGIT.test(password)) {
    return { ok: false, message: "Şifre en az bir rakam içermelidir." };
  }
  return { ok: true };
}
