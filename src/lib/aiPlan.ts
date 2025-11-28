export type AiPlanBlock = {
  title: string;
  note?: string | null;
  startMin: number;
  endMin: number;
  category: 'focus' | 'study' | 'work' | 'gym' | 'other';
};

export type AiPlanRequestBlock = {
  title: string;
  start?: string | null;
  end?: string | null;
  startMin?: number | null;
  endMin?: number | null;
  note?: string | null;
  category?: AiPlanBlock['category'] | null;
};

export type AiPlanRequest = {
  date: string;
  wakeTime: string;
  sleepTime: string;
  workStart?: string | null;
  workEnd?: string | null;
  habits?: string | null;
  priorities?: string | null;
  feedback?: string | null;
  previousBlocks?: AiPlanRequestBlock[] | null;
  previousPlanString?: string | null;
};

export type AiPlanResponse = {
  blocks: AiPlanBlock[];
};

const pad = (value: number) => value.toString().padStart(2, '0');

const formatMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const parseTimeString = (value?: string | null) => {
  if (!value) return undefined;
  const normalized = value.trim();
  const parts = normalized.split(':');
  if (parts.length !== 2) return undefined;
  const [hoursPart, minutesPart] = parts;
  if (hoursPart.trim() === '' || minutesPart.trim() === '') return undefined;
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return hours * 60 + minutes;
};

const normalizeRequestBlocks = (blocks?: AiPlanRequestBlock[] | null) => {
  if (!Array.isArray(blocks)) return undefined;
  const normalized = blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return null;
      const startMin =
        typeof block.startMin === 'number'
          ? Math.floor(block.startMin)
          : parseTimeString(block.start ?? undefined);
      const endMin =
        typeof block.endMin === 'number'
          ? Math.floor(block.endMin)
          : parseTimeString(block.end ?? undefined);
      const title = typeof block.title === 'string' ? block.title.trim() : '';
      const category =
        typeof block.category === 'string' && block.category
          ? (block.category as AiPlanBlock['category'])
          : undefined;
      const note = block.note ?? undefined;
      if (!title || startMin === undefined || endMin === undefined || endMin <= startMin) {
        return null;
      }
      return {
        title,
        start: formatMinutes(startMin),
        end: formatMinutes(endMin),
        category,
        note,
      };
    })
    .filter((value): value is { title: string; start: string; end: string; category?: string; note?: string | null } =>
      Boolean(value),
    );
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeResponseBlocks = (blocks: unknown): AiPlanBlock[] => {
  const rawBlocks = Array.isArray(blocks)
    ? blocks
    : blocks && typeof blocks === 'object' && Array.isArray((blocks as any).blocks)
      ? (blocks as any).blocks
      : [];

  const normalized = (rawBlocks as Array<Record<string, unknown>>).map((block) => {
    const title = typeof block.title === 'string' ? block.title.trim() : '';
    const note = typeof block.note === 'string' ? block.note.trim() : undefined;
    const rawCategory = typeof block.category === 'string' ? block.category.trim() : '';
    const category: AiPlanBlock['category'] =
      rawCategory === 'focus' ||
      rawCategory === 'study' ||
      rawCategory === 'work' ||
      rawCategory === 'gym' ||
      rawCategory === 'other'
        ? (rawCategory as AiPlanBlock['category'])
        : 'other';
    const startMin =
      typeof block.startMin === 'number'
        ? Math.floor(block.startMin)
        : parseTimeString(typeof block.start === 'string' ? block.start : undefined);
    const endMin =
      typeof block.endMin === 'number'
        ? Math.floor(block.endMin)
        : parseTimeString(typeof block.end === 'string' ? block.end : undefined);

    if (!title || startMin === undefined || endMin === undefined) return null;
    if (startMin < 0 || endMin < 0 || startMin > 1439 || endMin > 1439) return null;
    if (endMin <= startMin) return null;

    return {
      title,
      note,
      startMin,
      endMin,
      category,
    };
  });

  return normalized.filter((value): value is AiPlanBlock => Boolean(value)).sort((a, b) => a.startMin - b.startMin);
};

export async function generatePlanFromAI(
  payload: AiPlanRequest,
): Promise<AiPlanResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[AIPlan] URL', baseUrl);
  console.log('[AIPlan] Env present', {
    hasAnonKey: !!anonKey,
    hasUrl: !!baseUrl,
  });
  console.log('[AIPlan] Request payload', payload);

  if (!baseUrl) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
  }

  if (!anonKey) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  const response = await fetch(`${baseUrl}/functions/v1/ai-generate-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      ...payload,
      previousBlocks: normalizeRequestBlocks(payload.previousBlocks),
      previous_plan: payload.previousPlanString ?? undefined,
    }),
  });

  console.log('[AIPlan] Response status', response.status, response.statusText);

  if (!response.ok) {
    let text = '';
    try {
      text = await response.text();
    } catch {
      text = '';
    }
    console.error('[AIPlan] Failed response', {
      status: response.status,
      statusText: response.statusText,
      text,
    });
    throw new Error(text || `AI plan request failed with status ${response.status}`);
  }

  const json = await response.json();
  console.log('[AIPlan] Parsed JSON', json);
  return {
    blocks: normalizeResponseBlocks(json),
  };
}
