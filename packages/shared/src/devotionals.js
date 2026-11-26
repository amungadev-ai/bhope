export function devotionalText(item, language = 'en') {
  const selected = item[language];
  if (!selected?.title?.trim() || !selected?.reflection?.trim()) return item.en;
  return Object.fromEntries(
    Object.keys(item.en).map((key) => [key, selected[key]?.trim() ? selected[key] : item.en[key]]),
  );
}

// Publication days use the ministry's Nairobi timezone, including date filters.
export function publicationDay(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(Date.parse(value) + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function isPublicationDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function filterDevotionals(
  items,
  { query = '', from = '', to = '', order = 'newest' } = {},
) {
  const term = query.trim().toLowerCase();
  return items
    .filter((item) => {
      const day = publicationDay(item.publishAt);
      return (
        (!term ||
          [item.en.title, item.sw?.title ?? ''].some((title) =>
            title.toLowerCase().includes(term),
          )) &&
        (!from || (day && day >= from)) &&
        (!to || (day && day <= to))
      );
    })
    .sort((a, b) => {
      const left = Date.parse(a.publishAt) || 0;
      const right = Date.parse(b.publishAt) || 0;
      if (!left || !right) return left ? -1 : right ? 1 : a.id.localeCompare(b.id);
      return (order === 'oldest' ? left - right : right - left) || a.id.localeCompare(b.id);
    });
}
