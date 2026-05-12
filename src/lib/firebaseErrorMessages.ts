/**
 * Firebase (Auth, Storage, Realtime DB) hata kodlarını kullanıcıya Türkçe göstermek için.
 * Bilinmeyen kodlarda `fallback` veya genel mesaj kullanılır.
 */

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':
    'E-posta veya şifre hatalı. Bilgilerinizi kontrol edin veya kayıt olmayı deneyin.',
  'auth/wrong-password': 'Şifre yanlış.',
  'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanılıyor. Giriş yapmayı deneyin.',
  'auth/weak-password': 'Şifre çok zayıf. Daha uzun ve güçlü bir şifre seçin.',
  'auth/user-disabled': 'Bu hesap devre dışı bırakılmış. Destek ile iletişime geçin.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
  'auth/network-request-failed': 'Ağ hatası. İnternet bağlantınızı kontrol edin.',
  'auth/requires-recent-login': 'Bu işlem için yeniden giriş yapmanız gerekiyor.',
  'auth/operation-not-allowed': 'Bu giriş yöntemi şu an kapalı. Yönetici ile iletişime geçin.',
  'auth/invalid-api-key': 'Uygulama yapılandırması hatalı. Yönetici ile iletişime geçin.',
  'auth/app-deleted': 'Uygulama yapılandırması geçersiz.',
  'auth/invalid-user-token': 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
  'auth/user-token-expired': 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
  'auth/web-storage-unsupported': 'Tarayıcınız depolamayı desteklemiyor.',
  'auth/invalid-verification-code': 'Doğrulama kodu geçersiz veya süresi dolmuş.',
  'auth/invalid-verification-id': 'Doğrulama kodu geçersiz veya süresi dolmuş.',
  'auth/invalid-action-code': 'Bağlantı geçersiz veya süresi dolmuş.',
  'auth/expired-action-code': 'Bağlantı süresi dolmuş. Yeni bir işlem deneyin.',
  'auth/invalid-phone-number': 'Geçersiz telefon numarası.',
  'auth/missing-email': 'E-posta adresi gerekli.',
  'auth/missing-password': 'Şifre gerekli.',
  'auth/missing-android-pkg-name': 'Yapılandırma hatası.',
  'auth/invalid-app-credential': 'Kimlik doğrulama hatası.',
  'auth/invalid-app-id': 'Uygulama yapılandırması hatalı.',
  'auth/invalid-cordova-configuration': 'Uygulama yapılandırması hatalı.',
  'auth/invalid-custom-token': 'Oturum açma hatası.',
  'auth/invalid-message-payload': 'Geçersiz istek.',
  'auth/invalid-oauth-provider': 'Geçersiz giriş sağlayıcısı.',
  'auth/invalid-tenant-id': 'Yapılandırma hatası.',
  'auth/invalid-session-cookie': 'Oturum geçersiz. Tekrar giriş yapın.',
  'auth/credential-already-in-use': 'Bu kimlik bilgisi başka bir hesaba bağlı.',
  'auth/account-exists-with-different-credential': 'Bu e-posta farklı bir giriş yöntemi ile kayıtlı.',
  'auth/timeout': 'İstek zaman aşımına uğradı. Tekrar deneyin.',
  'auth/claims-too-large': 'İstek yapılamadı.',
  'auth/invalid-continue-uri': 'Yapılandırma hatası.',
  'auth/unauthorized-continue-uri': 'Yapılandırma hatası.',
  'auth/unauthorized-domain': 'Bu domain üzerinden girişe izin verilmiyor.',
  'auth/invalid-dynamic-link-domain': 'Yapılandırma hatası.',
  'auth/invalid-persistence-type': 'Depolama hatası.',
  'auth/invalid-provider-id': 'Geçersiz sağlayıcı.',
  'auth/invalid-recipient-email': 'Geçersiz e-posta.',
  'auth/invalid-sender': 'Geçersiz gönderici.',
  'auth/quota-exceeded': 'Kota aşıldı. Daha sonra tekrar deneyin.',
  'auth/captcha-check-failed': 'Güvenlik doğrulaması başarısız.',
  'auth/internal-error': 'Sunucu hatası. Daha sonra tekrar deneyin.',
  'auth/popup-blocked': 'Açılır pencere engellendi. Tarayıcı ayarlarını kontrol edin.',
  'auth/popup-closed-by-user': 'İşlem iptal edildi.',
  'auth/cancelled-popup-request': 'İşlem iptal edildi.',
};

const STORAGE_MESSAGES: Record<string, string> = {
  'storage/unauthorized': 'Dosyaya erişim yetkiniz yok.',
  'storage/canceled': 'Yükleme iptal edildi.',
  'storage/unknown': 'Dosya işlemi sırasında bilinmeyen bir hata oluştu.',
  'storage/object-not-found': 'Dosya bulunamadı.',
  'storage/quota-exceeded': 'Depolama kotası aşıldı.',
  'storage/retry-limit-exceeded': 'Zaman aşımı. Tekrar deneyin.',
  'storage/invalid-checksum': 'Dosya bozuk veya değişmiş.',
  'storage/server-file-wrong-size': 'Dosya boyutu uyuşmuyor.',
  'storage/invalid-format': 'Dosya türü desteklenmiyor.',
  'storage/invalid-event-name': 'Yapılandırma hatası.',
  'storage/invalid-url': 'Geçersiz dosya adresi.',
  'storage/invalid-argument': 'Geçersiz dosya veya parametre.',
  'storage/no-default-bucket': 'Depolama yapılandırması eksik.',
  'storage/bucket-not-found': 'Depolama klasörü bulunamadı.',
  'storage/project-not-found': 'Proje bulunamadı.',
  'storage/non-default-bucket-error': 'Depolama yapılandırması hatalı.',
  'storage/cannot-slice-blob': 'Dosya okunamadı.',
  'storage/invalid-root-operation': 'Geçersiz işlem.',
};

const DATABASE_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: 'Bu işlem için yetkiniz yok veya oturum süresi doldu.',
  UNAVAILABLE: 'Veritabanına şu an erişilemiyor. Tekrar deneyin.',
  DISCONNECTED: 'Bağlantı koptu. İnternetinizi kontrol edin.',
  NETWORK_ERROR: 'Ağ hatası. Bağlantınızı kontrol edin.',
  'datastale/invalid-ack': 'Veri senkronizasyon hatası.',
  'write/canceled': 'Kayıt iptal edildi.',
};

function extractAuthCodeFromMessage(message: string | undefined): string | null {
  if (!message) return null;
  const paren = message.match(/\((auth\/[^)]+)\)/);
  if (paren) return paren[1];
  const slash = message.match(/\b(auth\/[a-z0-9-]+)\b/i);
  if (slash) return slash[1];
  return null;
}

function getCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as { code?: string; message?: string };
  if (typeof e.code === 'string' && e.code.length > 0) {
    return e.code;
  }
  if (typeof e.message === 'string') {
    const fromMsg = extractAuthCodeFromMessage(e.message);
    if (fromMsg) return fromMsg;
    if (e.message.includes('PERMISSION_DENIED')) return 'PERMISSION_DENIED';
  }
  return null;
}

/**
 * Firebase veya benzeri hataları Türkçe kullanıcı mesajına çevirir.
 * `EMAIL_NOT_VERIFIED` gibi uygulama içi kodları olduğu gibi döndürür.
 */
export function getFirebaseErrorMessage(error: unknown, fallback = 'Bir hata oluştu.'): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  if (typeof error === 'string') {
    if (error === 'EMAIL_NOT_VERIFIED') return error;
    return error;
  }

  const err = error as { message?: string; code?: string };
  if (typeof err.message === 'string' && err.message === 'EMAIL_NOT_VERIFIED') {
    return err.message;
  }

  const code = getCode(error);
  if (code) {
    if (code.startsWith('auth/') && AUTH_MESSAGES[code]) {
      return AUTH_MESSAGES[code];
    }
    if (code.startsWith('storage/') && STORAGE_MESSAGES[code]) {
      return STORAGE_MESSAGES[code];
    }
    if (DATABASE_MESSAGES[code]) {
      return DATABASE_MESSAGES[code];
    }
  }

  if (typeof err.message === 'string' && err.message.length > 0) {
    const msg = err.message;
    if (msg.startsWith('Firebase:') || msg.includes('Firebase')) {
      const extracted = extractAuthCodeFromMessage(msg);
      if (extracted && AUTH_MESSAGES[extracted]) {
        return AUTH_MESSAGES[extracted];
      }
      return fallback;
    }
    return msg;
  }

  return fallback;
}
