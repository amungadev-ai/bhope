import { publicationDay, type Language } from '@bhope/shared';

export function publicationLabel(value: string | null | undefined, language: Language) {
  const day = publicationDay(value);
  return day
    ? new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Nairobi',
      }).format(new Date(`${day}T12:00:00Z`))
    : language === 'sw'
      ? 'Tafakari iliyohifadhiwa'
      : 'Saved reflection';
}
