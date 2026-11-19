export function formatDate(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateTime(value: string | Date, locale: string): string {
  return formatDate(value, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDayMonth(value: string | Date, locale: string): string {
  return formatDate(value, locale, { day: 'numeric', month: 'short' });
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
