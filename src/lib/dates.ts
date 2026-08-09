import { SITE } from '@/config';

const dateFormatter = new Intl.DateTimeFormat(SITE.locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function toIsoDate(date: Date) {
  return date.toISOString();
}
