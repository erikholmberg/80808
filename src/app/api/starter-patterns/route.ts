import { NextResponse } from "next/server";
import { ROWS, STEPS, isValidBeatPattern, type BeatPattern } from "@/state/pattern";
import { VOICES } from "@/voices";

export const runtime = "nodejs";

const DEFAULT_BASE = "https://ai-gateway.vercel.sh/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_BATCH = 5;

function stripJsonFence(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return s.trim();
}

function cellToBool(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t === "1" || t === "true" || t === "x";
  }
  return false;
}

function coerceBeatPattern(data: unknown, fallbackName: string): BeatPattern | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const nameRaw = o.name;
  const name =
    typeof nameRaw === "string" && nameRaw.trim()
      ? nameRaw.trim().slice(0, 128)
      : fallbackName.slice(0, 128);

  let bpm = typeof o.bpm === "number" ? o.bpm : Number(o.bpm);
  if (!Number.isFinite(bpm)) bpm = 120;
  bpm = Math.min(200, Math.max(40, Math.round(bpm)));

  const rawSteps = o.steps;
  if (!Array.isArray(rawSteps)) return null;

  const steps: boolean[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = rawSteps[r];
    const cells: boolean[] = [];
    if (Array.isArray(row)) {
      for (let c = 0; c < STEPS; c++) {
        cells.push(cellToBool(row[c]));
      }
    } else {
      for (let c = 0; c < STEPS; c++) cells.push(false);
    }
    steps.push(cells);
  }

  const candidate: BeatPattern = { name, bpm, steps };
  return isValidBeatPattern(candidate) ? candidate : null;
}

function parsePatternsPayload(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  const arr = o.patterns ?? o.data;
  return Array.isArray(arr) ? arr : [];
}

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_GATEWAY_API_KEY is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawCount =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { count?: unknown }).count === "number"
      ? (body as { count: number }).count
      : MAX_BATCH;
  const count = Math.min(MAX_BATCH, Math.max(1, Math.floor(rawCount)));

  const base = (process.env.AI_GATEWAY_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  const model = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
  const url = `${base}/chat/completions`;

  const voiceOrder = VOICES.join(", ");
  const system = `You output only valid JSON. No markdown, no prose outside JSON.
Return a single JSON object with exactly one key "patterns", whose value is an array of exactly ${count} objects.
Each object must have:
- "name": string, short creative title for the groove (max 80 chars), must be unique across this array.
- "bpm": integer from 40 to 200.
- "steps": array of exactly ${ROWS} rows; each row is exactly ${STEPS} booleans only (true/false).
Row order must match these 12 voices (index 0 = first row): ${voiceOrder}.
Each column is one 16th-note step in one bar; true = hit on that step.
Each pattern must be meaningfully different (genre, syncopation, density). TR-808-style electronic drums only; plausible human-programmed grooves.`;

  const user = `Generate ${count} distinct starter drum patterns as specified.`;

  const buildPayload = (jsonObjectMode: boolean) => ({
    model,
    temperature: 0.92,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ...(jsonObjectMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  let gatewayRes: Response;
  let rawText: string;
  try {
    gatewayRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(true)),
    });
    rawText = await gatewayRes.text();
    if (gatewayRes.status === 400) {
      gatewayRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(false)),
      });
      rawText = await gatewayRes.text();
    }
  } catch {
    return NextResponse.json(
      { error: "Could not reach AI Gateway. Check network and AI_GATEWAY_BASE_URL." },
      { status: 502 },
    );
  }

  let gatewayJson: unknown;
  try {
    gatewayJson = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json({ error: "AI Gateway returned non-JSON." }, { status: 502 });
  }

  if (!gatewayRes.ok) {
    const errMsg =
      typeof gatewayJson === "object" &&
      gatewayJson !== null &&
      typeof (gatewayJson as { error?: { message?: string } }).error?.message === "string"
        ? (gatewayJson as { error: { message: string } }).error.message
        : `Gateway error (${gatewayRes.status})`;
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }

  const choices = (gatewayJson as { choices?: { message?: { content?: string } }[] }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Empty model response." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(content)) as unknown;
  } catch {
    return NextResponse.json({ error: "Model did not return parseable JSON." }, { status: 422 });
  }

  const rawList = parsePatternsPayload(parsed);
  const patterns: BeatPattern[] = [];
  for (let i = 0; i < rawList.length && patterns.length < count; i++) {
    const p = coerceBeatPattern(rawList[i], `Groove ${i + 1}`);
    if (p) patterns.push({ ...p, steps: p.steps.map((row) => [...row]) });
  }

  if (patterns.length === 0) {
    return NextResponse.json(
      { error: "Could not parse any valid patterns from the model." },
      { status: 422 },
    );
  }

  return NextResponse.json({ patterns });
}
