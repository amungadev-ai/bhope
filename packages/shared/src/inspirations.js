export function getTikTokVideoId(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['www.tiktok.com', 'tiktok.com'].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    return url.pathname.match(/^\/@[\w.-]+\/video\/(\d{15,25})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}
export function getTikTokPlayerUrl(value) {
  const id = getTikTokVideoId(value);
  return id
    ? `https://www.tiktok.com/player/v1/${id}?controls=1&autoplay=0&rel=0&description=1&music_info=0`
    : null;
}
export function createNote(input = {}) {
  const now = new Date().toISOString();
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
    title: '',
    body: '',
    kind: 'reflection',
    preacher: '',
    church: '',
    sermonDate: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}
