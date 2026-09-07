import type { ErrorCategory } from '@pingo/shared';
import { ERROR_CATEGORY_LABELS } from '@pingo/shared';

export function classifyNetworkError(error: unknown): { category: ErrorCategory; message: string } {
  if (typeof error === 'object' && error !== null && 'category' in error) {
    const category = (error as { category?: ErrorCategory }).category;
    if (category && category in ERROR_CATEGORY_LABELS) {
      return { category, message: ERROR_CATEGORY_LABELS[category] };
    }
  }

  const code = getCode(error);
  const raw = error instanceof Error ? error.message : String(error);

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ENODATA' || /dns/i.test(raw)) {
    return { category: 'DNS_ERROR', message: ERROR_CATEGORY_LABELS.DNS_ERROR };
  }
  if (code === 'ECONNREFUSED') {
    return { category: 'CONNECTION_REFUSED', message: ERROR_CATEGORY_LABELS.CONNECTION_REFUSED };
  }
  if (
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_BODY_TIMEOUT' ||
    code === 'ABORT_ERR' ||
    /timeout/i.test(raw)
  ) {
    return { category: 'CONNECTION_TIMEOUT', message: ERROR_CATEGORY_LABELS.CONNECTION_TIMEOUT };
  }
  if (
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
    /ssl|tls|certificate/i.test(raw)
  ) {
    return { category: 'TLS_ERROR', message: ERROR_CATEGORY_LABELS.TLS_ERROR };
  }
  if (code === 'ERR_INVALID_URL' || /private or reserved|not allowed/i.test(raw)) {
    return { category: 'SSRF_BLOCKED', message: ERROR_CATEGORY_LABELS.SSRF_BLOCKED };
  }

  return {
    category: 'UNKNOWN',
    message: raw.replace(/\s+/g, ' ').slice(0, 240) || ERROR_CATEGORY_LABELS.UNKNOWN,
  };
}

function getCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('cause' in error) return getCode(error.cause);
  return undefined;
}
