import { getTikTokPlayerUrl } from '@bhope/shared';
export function TikTokPlayer({ url, onError }: { url: string; onError: () => void }) {
  const player = getTikTokPlayerUrl(url);
  return player ? (
    <iframe
      title="Inspirational TikTok video"
      src={player}
      allow="fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={onError}
      style={{ width: '100%', height: 450, border: 0, borderRadius: 18 }}
    />
  ) : null;
}
