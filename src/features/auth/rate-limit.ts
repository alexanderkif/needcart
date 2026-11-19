export type AuthRateLimitReason = 'perUser' | 'projectEmail' | 'request';

export type AuthRateLimitInfo = {
  reason: AuthRateLimitReason;
  retryAfterSeconds: number | null;
};

const RETRY_AFTER_PATTERN = /(?:after|in)\s+(\d+)\s+seconds?/i;
const MAX_RETRY_SECONDS = 24 * 60 * 60;

/**
 * Supabase uses the same `over_email_send_rate_limit` code for two different
 * limits: a 60-second per-address cooldown and the project-wide email cap.
 * Only the message distinguishes them, so parse the cooldown when present and
 * fall back to an untimed "try later" state otherwise.
 */
export function getAuthRateLimitInfo(error: unknown): AuthRateLimitInfo | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    retry_after?: number;
    status?: number;
  };

  const isRateLimited =
    candidate.status === 429 ||
    candidate.code === 'over_email_send_rate_limit' ||
    candidate.code === 'over_request_rate_limit' ||
    candidate.code === 'over_sms_send_rate_limit';

  if (!isRateLimited) {
    return null;
  }

  const messageSeconds = candidate.message?.match(RETRY_AFTER_PATTERN)?.[1];
  const directSeconds =
    typeof candidate.retry_after === 'number' &&
    Number.isFinite(candidate.retry_after)
      ? Math.ceil(candidate.retry_after)
      : null;
  const parsedSeconds = directSeconds ?? (messageSeconds ? Number(messageSeconds) : null);
  const retryAfterSeconds =
    parsedSeconds && parsedSeconds > 0
      ? Math.min(parsedSeconds, MAX_RETRY_SECONDS)
      : null;

  if (
    candidate.code === 'over_email_send_rate_limit' &&
    !retryAfterSeconds &&
    /email rate limit exceeded/i.test(candidate.message ?? '')
  ) {
    return { reason: 'projectEmail', retryAfterSeconds: null };
  }

  if (candidate.code === 'over_request_rate_limit') {
    return { reason: 'request', retryAfterSeconds };
  }

  return {
    reason: retryAfterSeconds ? 'perUser' : 'request',
    retryAfterSeconds,
  };
}
