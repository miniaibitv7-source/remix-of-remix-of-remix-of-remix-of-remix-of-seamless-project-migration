// Gem packs sold for real money. Index order must match PIX_PACKS in public/reinos.html.
export const GEM_PACKS = [
  { gems: 50, cents: 490 },
  { gems: 110, cents: 990 },
  { gems: 300, cents: 2490 },
  { gems: 650, cents: 4990 },
] as const;

const PREVIEW_HOST = /^id-preview--([0-9a-f-]{36})\.lovable\.app$/;

/** Public HTTPS URL InfinitePay can call back; preview hosts map to the stable dev URL. */
export function webhookBase(origin: string): string | null {
  let url: URL;
  try { url = new URL(origin); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const preview = PREVIEW_HOST.exec(url.hostname);
  return preview ? `https://project--${preview[1]}-dev.lovable.app` : url.origin;
}

/** Only a confirmed payment of at least the order price may credit gems. */
export function isPaidEnough(check: { success?: unknown; paid?: unknown; amount?: unknown }, orderCents: number) {
  return check.success === true && check.paid === true && typeof check.amount === "number" && check.amount >= orderCents;
}
