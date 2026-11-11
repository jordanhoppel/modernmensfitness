// Consent rules for the tracking scripts (Google Analytics 4 and the Meta Pixel).
//
// Visitors in the EEA, the UK and Switzerland are asked first, and nothing loads until they say yes.
// Everyone else gets the scripts straight away, except that the Global Privacy Control signal keeps the
// Meta Pixel (advertising) off. Anyone can change their choice from "Cookie settings" in the footer.

export const GA4_ID = 'G-4HJJ0X54P3';
export const PIXEL_ID = '672876182195259';
export const GA_LINKER_DOMAINS = ['modernmensfitness.com', 'primalpressprotocol.com'];

export const STORAGE_KEY = 'mmf-consent';
/** Test hook. Setting this to "restricted" forces the EEA/UK behaviour. It can only make the site stricter. */
export const REGION_OVERRIDE_KEY = 'mmf-region-override';
export const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// EU member states, Iceland, Liechtenstein, Norway, the UK and Switzerland, plus the EU outermost regions and
// the Crown Dependencies, which Cloudflare reports under their own country codes.
const RESTRICTED = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
  'AX', 'GP', 'MQ', 'GF', 'RE', 'YT', 'MF', 'GG', 'JE', 'IM',
]);

export type Consent = { analytics: boolean; marketing: boolean };
export type Stored = Consent & { v: 1; ts: number };

export const isRestrictedCountry = (cc?: string | null): boolean => !!cc && RESTRICTED.has(cc.trim().toUpperCase());

/** Reads the two-letter country out of Cloudflare's /cdn-cgi/trace text, or null. */
export const parseTraceCountry = (text: string): string | null => {
  const m = /^loc=([A-Za-z]{2})\s*$/m.exec(text);
  return m ? m[1].toUpperCase() : null;
};

/** Fallback when the country lookup fails: err on the side of asking. */
export const timezoneLooksRestricted = (tz?: string | null): boolean => !!tz && (tz.startsWith('Europe/') || tz === 'Atlantic/Reykjavik');

/** What happens before the visitor has made a choice. */
export const defaultConsent = (restricted: boolean, gpc: boolean): Consent =>
  restricted ? { analytics: false, marketing: false } : { analytics: true, marketing: !gpc };

export const serialise = (c: Consent, now: number): string => JSON.stringify({ v: 1, analytics: c.analytics, marketing: c.marketing, ts: now } satisfies Stored);

/** Returns the saved choice, or null if there is none, it is malformed, or it is older than a year. */
export const parseStored = (raw: string | null, now: number): Stored | null => {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (d && d.v === 1 && typeof d.analytics === 'boolean' && typeof d.marketing === 'boolean' && typeof d.ts === 'number' && now - d.ts < MAX_AGE_MS && now >= d.ts - 60_000) return d as Stored;
  } catch { /* treat as no choice */ }
  return null;
};

/** The choice in force, and whether the visitor needs to be asked. */
export const resolve = (restricted: boolean, gpc: boolean, stored: Stored | null) => {
  if (stored) return { consent: { analytics: stored.analytics, marketing: stored.marketing }, ask: false };
  return { consent: defaultConsent(restricted, gpc), ask: restricted };
};

/** Cookie names the two services set, so a withdrawal can clear them. */
export const isTrackingCookie = (name: string): boolean => /^_ga(_|$)/.test(name) || name === '_fbp' || name === '_fbc';
