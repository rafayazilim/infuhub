import { push, ref, update } from "firebase/database";
import { auth, database } from "@/config/firebase";

/** İletişim sayfası ve admin paneli ile uyumlu etiketler */
export const SUPPORT_MESSAGE_CATEGORIES = [
  "fatura",
  "acil",
  "satis",
  "kotuye_kullanim",
  "platform",
] as const;

export type SupportMessageCategory = (typeof SUPPORT_MESSAGE_CATEGORIES)[number];

/** Admin panel ve formlar için kısa etiketler */
export const SUPPORT_CATEGORY_LABELS: Record<SupportMessageCategory, string> = {
  fatura: "Faturalandırma",
  acil: "Acil",
  satis: "Satış",
  kotuye_kullanim: "Kötüye kullanım",
  platform: "Platform",
};

export type SupportMessageRecord = {
  id: string;
  category: string;
  firstName: string;
  lastName: string;
  subject: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  senderUid: string | null;
  /** Admin panelden işaretleme */
  reviewed?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
};

function isValidCategory(c: string): c is SupportMessageCategory {
  return (SUPPORT_MESSAGE_CATEGORIES as readonly string[]).includes(c);
}

/**
 * Genel iletişim formu — giriş şartı yok; RTDB kuralları yalnızca oluşturmayı izin verir.
 */
export async function submitSupportMessage(params: {
  category: SupportMessageCategory;
  firstName: string;
  lastName: string;
  subject: string;
  email: string;
  phone: string;
  message: string;
}): Promise<void> {
  if (!isValidCategory(params.category)) {
    throw new Error("Geçersiz kategori.");
  }
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  const subject = params.subject.trim();
  const email = params.email.trim();
  const phone = params.phone.trim();
  const message = params.message.trim();
  if (!firstName || !lastName || !subject || !email || !phone || !message) {
    throw new Error("İsim, soyisim, konu, e-posta, telefon ve mesaj zorunludur.");
  }
  if (firstName.length > 80 || lastName.length > 80 || subject.length > 200) {
    throw new Error("İsim / soyisim / konu alanları izin verilen uzunluğu aşıyor.");
  }
  if (email.length > 200 || phone.length > 40 || message.length > 5000) {
    throw new Error("Alan uzunlukları izin verilen sınırı aşıyor.");
  }
  const createdAt = new Date().toISOString();
  const senderUid = auth.currentUser?.uid ?? null;
  await push(ref(database, "supportMessages"), {
    category: params.category,
    firstName,
    lastName,
    subject,
    email,
    phone,
    message,
    createdAt,
    senderUid,
  });
}

/**
 * Yalnızca admin oturumu; mesaj içeriği değişmez, yalnızca incelendi bilgisi güncellenir.
 */
export async function setSupportMessageReviewed(messageId: string, reviewed: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Oturum açmanız gerekir.");
  }
  const now = new Date().toISOString();
  if (reviewed) {
    await update(ref(database, `supportMessages/${messageId}`), {
      reviewed: true,
      reviewedAt: now,
      reviewedBy: user.uid,
    });
  } else {
    await update(ref(database, `supportMessages/${messageId}`), {
      reviewed: false,
      reviewedAt: "",
      reviewedBy: "",
    });
  }
}
