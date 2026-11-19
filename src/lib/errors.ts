export type AppErrorCode =
  | 'invalidCode'
  | 'notFound'
  | 'forbidden'
  | 'unauthenticated'
  | 'network'
  | 'duplicate'
  | 'validation'
  | 'server'
  | 'generic';

type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  error_description?: string;
  details?: string;
  hint?: string;
};

const NETWORK_PATTERN =
  /failed to fetch|network request failed|networkerror|load failed|fetch failed|timeout|offline/i;

export function classifyError(error: unknown): AppErrorCode {
  if (typeof error !== 'object' || error === null) {
    return 'generic';
  }

  const candidate = error as ErrorLike;
  const message = [
    candidate.message,
    candidate.error_description,
    candidate.details,
    candidate.hint,
  ]
    .filter(Boolean)
    .join(' ');

  if (candidate.code === 'P0002' || candidate.code === 'PGRST116') {
    return 'notFound';
  }
  if (candidate.code === '42501' || candidate.code === '28000') {
    return 'forbidden';
  }
  if (candidate.code === '23505') {
    return 'duplicate';
  }
  if (
    candidate.code === '22023' ||
    candidate.code === '23514' ||
    candidate.code === '22P02'
  ) {
    return 'validation';
  }
  if (candidate.status === 401) {
    return 'unauthenticated';
  }
  if (candidate.status === 403) {
    return 'forbidden';
  }
  if (candidate.status === 404) {
    return 'notFound';
  }
  if (NETWORK_PATTERN.test(message) || candidate.code === 'NETWORK') {
    return 'network';
  }
  if (/invalid invite code/i.test(message)) {
    return 'invalidCode';
  }
  if (/jwt expired|invalid jwt|not authenticated/i.test(message)) {
    return 'unauthenticated';
  }
  if (/duplicate key|already exists|unique constraint/i.test(message)) {
    return 'duplicate';
  }
  if (/violates|invalid input|must be|too long|out of range/i.test(message)) {
    return 'validation';
  }
  if (candidate.status && candidate.status >= 500) {
    return 'server';
  }
  return 'generic';
}

const errorKeyByCode: Record<AppErrorCode, string> = {
  invalidCode: 'errors.invalidCode',
  notFound: 'errors.notFound',
  forbidden: 'errors.forbidden',
  unauthenticated: 'errors.unauthenticated',
  network: 'errors.network',
  duplicate: 'errors.duplicate',
  validation: 'errors.validation',
  server: 'errors.server',
  generic: 'errors.generic',
};

export function errorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey = 'errors.generic',
): string {
  const code = classifyError(error);
  const key = code === 'generic' ? fallbackKey : errorKeyByCode[code];
  return t(key);
}

export function isNetworkError(error: unknown): boolean {
  return classifyError(error) === 'network';
}

export type OwnedGroup = { id: string; name: string };

export class OwnedGroupsError extends Error {
  readonly groups: OwnedGroup[];

  constructor(groups: OwnedGroup[]) {
    super('Account owns groups');
    this.name = 'OwnedGroupsError';
    this.groups = groups;
  }
}
