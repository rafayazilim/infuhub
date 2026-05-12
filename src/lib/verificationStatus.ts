/** Veritabanında tutulan onaylı durum (Türkçe ı = U+0131). */
export const STATUS_ONAYLANDI = 'onayland\u0131';

/**
 * Onaylı sayılır: doğru yazım, İngilizce eşdeğerler ve UTF-8 bozulmasıyla yazılmış eski kayıtlar.
 */
export function isVerificationApproved(status?: string | null): boolean {
  const raw = String(status ?? '').trim();
  if (!raw) return false;
  const tr = raw.toLocaleLowerCase('tr-TR');
  if (tr === STATUS_ONAYLANDI || tr === 'approved' || tr === 'active') return true;
  const asciiLower = raw.toLowerCase();
  if (asciiLower === 'onaylandi') return true;
  if (tr.startsWith('onayland')) {
    const tail = tr.slice('onayland'.length);
    if (tail === '\ufffd' || tail === '\u0131' || tail === 'i' || tail === 'ı') return true;
  }
  return false;
}
