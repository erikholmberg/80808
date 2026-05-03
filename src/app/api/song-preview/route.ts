import { NextResponse } from "next/server";

export const runtime = "nodejs";
import {
  displayNameForTrack,
  fetchPreviewAudio,
  pickTrackWithPreview,
  searchItunesTracks,
} from "@/lib/itunesPreview";

const MAX_ARTIST = 96;
const MAX_SONG = 96;

function patternNameHeaderB64(name: string): string {
  return Buffer.from(name.slice(0, 200), "utf8").toString("base64");
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const artistRaw =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { artist?: unknown }).artist === "string"
      ? (body as { artist: string }).artist
      : "";
  const songRaw =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { song?: unknown }).song === "string"
      ? (body as { song: string }).song
      : "";

  const artist = artistRaw.trim().slice(0, MAX_ARTIST);
  const song = songRaw.trim().slice(0, MAX_SONG);

  if (!artist || !song) {
    return NextResponse.json(
      { error: 'Send JSON with non-empty "artist" and "song" (track title).' },
      { status: 400 },
    );
  }

  const term = `${artist} ${song}`.replace(/\s+/g, " ").trim();

  let searchJson;
  try {
    searchJson = await searchItunesTracks(term);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the music catalog. Try again." },
      { status: 502 },
    );
  }

  const results = Array.isArray(searchJson.results) ? searchJson.results : [];
  const hit = pickTrackWithPreview(results, artist, song);
  if (!hit?.previewUrl) {
    return NextResponse.json(
      {
        error:
          "No downloadable preview for that search. Try different spelling or another track (previews come from Apple’s catalog).",
      },
      { status: 404 },
    );
  }

  let audio: { buffer: ArrayBuffer; contentType: string };
  try {
    audio = await fetchPreviewAudio(hit.previewUrl);
  } catch {
    return NextResponse.json(
      { error: "Could not download the audio preview." },
      { status: 502 },
    );
  }

  const patternName = displayNameForTrack(hit);

  return new NextResponse(audio.buffer, {
    status: 200,
    headers: {
      "Content-Type": audio.contentType,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-80808-Pattern-Name-B64": patternNameHeaderB64(patternName),
    },
  });
}
