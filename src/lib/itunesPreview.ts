const ITUNES_SEARCH = "https://itunes.apple.com/search";

const MAX_AUDIO_BYTES = 2_500_000;
const FETCH_TIMEOUT_MS = 18_000;

export type ItunesTrackHit = {
  artistName?: string;
  trackName?: string;
  previewUrl?: string;
};

export type ItunesSearchResponse = {
  resultCount?: number;
  results?: ItunesTrackHit[];
};

function isAllowedPreviewUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return host === "audio-ssl.itunes.apple.com" || host === "audio.itunes.apple.com";
}

function tokenOverlapScore(query: string, text: string): number {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return 0;
  const t = text.toLowerCase();
  let hit = 0;
  for (const w of words) if (t.includes(w)) hit++;
  return hit / words.length;
}

/** Pick best catalog row with a preview URL for artist + song. */
export function pickTrackWithPreview(
  results: ItunesTrackHit[],
  artist: string,
  song: string,
): ItunesTrackHit | null {
  const candidates = results.filter(
    (r) => typeof r.previewUrl === "string" && isAllowedPreviewUrl(r.previewUrl),
  );
  if (!candidates.length) return null;

  let best: ItunesTrackHit | null = null;
  let bestScore = -1;
  for (const r of candidates) {
    const an = r.artistName ?? "";
    const tn = r.trackName ?? "";
    const score =
      tokenOverlapScore(artist, an) * 2.2 +
      tokenOverlapScore(song, tn) * 2.2 +
      tokenOverlapScore(`${artist} ${song}`, `${an} ${tn}`);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best ?? candidates[0] ?? null;
}

export async function searchItunesTracks(term: string): Promise<ItunesSearchResponse> {
  const url = new URL(ITUNES_SEARCH);
  url.searchParams.set("term", term);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "25");

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: ac.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "80808/0.1 (https://github.com/)",
      },
    });
    if (!res.ok) {
      throw new Error(`iTunes search HTTP ${res.status}`);
    }
    return (await res.json()) as ItunesSearchResponse;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchPreviewAudio(previewUrl: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  if (!isAllowedPreviewUrl(previewUrl)) {
    throw new Error("Invalid preview URL");
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(previewUrl, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "80808/0.1 (https://github.com/)",
      },
    });
    if (!res.ok) {
      throw new Error(`Preview HTTP ${res.status}`);
    }
    const finalUrl = new URL(res.url);
    if (!isAllowedPreviewUrl(finalUrl.toString())) {
      throw new Error("Preview redirect to disallowed host");
    }
    const len = res.headers.get("content-length");
    if (len) {
      const n = parseInt(len, 10);
      if (Number.isFinite(n) && n > MAX_AUDIO_BYTES) {
        throw new Error("Preview too large");
      }
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error("Preview too large");
    }
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mp4";
    return { buffer, contentType };
  } finally {
    clearTimeout(t);
  }
}

export function displayNameForTrack(hit: ItunesTrackHit): string {
  const a = (hit.artistName ?? "").trim();
  const t = (hit.trackName ?? "").trim();
  const s = a && t ? `${a} — ${t}` : t || a || "From preview";
  return s.slice(0, 128);
}
