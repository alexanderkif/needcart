import { describe, expect, it } from 'vitest';

import { getAuthRateLimitInfo } from './rate-limit';

describe('getAuthRateLimitInfo', () => {
  it('reads the per-address cooldown from the message', () => {
    expect(
      getAuthRateLimitInfo({
        status: 429,
        code: 'over_email_send_rate_limit',
        message:
          'For security purposes, you can only request this after 42 seconds.',
      }),
    ).toEqual({ reason: 'perUser', retryAfterSeconds: 42 });
  });

  it('detects the project-wide email cap without a countdown', () => {
    expect(
      getAuthRateLimitInfo({
        status: 429,
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
      }),
    ).toEqual({ reason: 'projectEmail', retryAfterSeconds: null });
  });

  it('handles an IP request limit without inventing a wait time', () => {
    expect(
      getAuthRateLimitInfo({
        status: 429,
        code: 'over_request_rate_limit',
      }),
    ).toEqual({ reason: 'request', retryAfterSeconds: null });
  });

  it('ignores errors that are not rate limits', () => {
    expect(
      getAuthRateLimitInfo({
        status: 500,
        message: 'unexpected failure',
      }),
    ).toBeNull();
  });
});
