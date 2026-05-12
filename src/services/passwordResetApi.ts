import { buildApiUrl, getApiBaseUrl } from '@/lib/apiConfig';

type ResetPayload = { success?: boolean; message?: string; resetToken?: string };

type ResetRequestResult = {
  response: Response | null;
  payload: ResetPayload;
  url: string;
  parseAsJson: boolean;
  networkError?: string;
};

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function buildForgotPasswordCandidates(action: 'request' | 'verify-code' | 'set-password'): string[] {
  const candidates: string[] = [];
  const pushed = new Set<string>();
  const push = (url: string) => {
    if (!url || pushed.has(url)) return;
    pushed.add(url);
    candidates.push(url);
  };

  const base = normalizeBase(getApiBaseUrl());
  const sameOrigin =
    typeof window !== 'undefined' ? normalizeBase(window.location.origin) : '';

  push(buildApiUrl(`/auth/forgot-password/${action}`));

  if (sameOrigin && sameOrigin !== base) {
    push(`${sameOrigin}/api/auth/forgot-password/${action}`);
    push(`${sameOrigin}/auth/forgot-password/${action}`);
  } else {
    push(`${base}/auth/forgot-password/${action}`);
  }
  return candidates;
}

async function postForgotPassword(
  action: 'request' | 'verify-code' | 'set-password',
  body: Record<string, string>
): Promise<ResetRequestResult> {
  const urls = buildForgotPasswordCandidates(action);
  let lastNetworkError = '';

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as ResetPayload;
      return { response, payload, url, parseAsJson: true };
    } catch (err: any) {
      lastNetworkError = err?.message || 'Ağ hatası';
    }
  }

  return {
    response: null,
    payload: {},
    url: urls[0] || '',
    parseAsJson: false,
    networkError: lastNetworkError || undefined,
  };
}

const DEFAULT_CODE_SENT_HINT =
  'Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama kodu gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.';

export async function requestPasswordResetCode(email: string): Promise<{ ok: boolean; message: string }> {
  const result = await postForgotPassword('request', { email: email.trim() });
  if (!result.parseAsJson || !result.response) {
    return {
      ok: false,
      message:
        result.networkError
          ? `Sunucuya ulaşılamadı: ${result.networkError}`
          : 'Şifre sıfırlama API’si JSON döndürmedi. /api (ve gerekirse /auth) yollarının Node uygulamasına yönlendirildiğini kontrol edin.',
    };
  }

  const { response, payload } = result;
  const ok = response.ok && payload.success === true;
  const message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : ok
        ? DEFAULT_CODE_SENT_HINT
        : response.status >= 500
          ? 'Sunucu hatası. SMTP veya backend günlüklerini kontrol edin.'
          : 'İşlem başarısız.';

  return { ok, message };
}

export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ ok: boolean; message: string; resetToken?: string }> {
  const result = await postForgotPassword('verify-code', {
    email: email.trim(),
    code: code.trim(),
  });
  if (!result.parseAsJson || !result.response) {
    return {
      ok: false,
      message: 'Doğrulama API’sine erişilemedi. /api yönlendirmesini kontrol edin.',
    };
  }

  const { response, payload } = result;
  const message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : response.ok && payload.success === true
        ? 'Doğrulandı.'
        : 'Doğrulama başarısız.';
  if (
    response.ok &&
    payload.success === true &&
    typeof payload.resetToken === 'string' &&
    payload.resetToken.length > 0
  ) {
    return { ok: true, message, resetToken: payload.resetToken };
  }
  return { ok: false, message };
}

export async function completePasswordReset(
  resetToken: string,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  const result = await postForgotPassword('set-password', {
    resetToken,
    newPassword,
  });
  if (!result.parseAsJson || !result.response) {
    return {
      ok: false,
      message: 'Şifre güncelleme API’sine erişilemedi. /api yönlendirmesini kontrol edin.',
    };
  }

  const { response, payload } = result;
  const message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : response.ok && payload.success === true
        ? 'Şifre güncellendi.'
        : 'Şifre güncellenemedi.';
  return { ok: response.ok && payload.success === true, message };
}
