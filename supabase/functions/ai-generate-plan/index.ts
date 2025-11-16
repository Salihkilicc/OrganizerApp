import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1';
const VALID_CATEGORIES = ['focus', 'study', 'work', 'gym', 'other'] as const;

const parseRequest = async (req: Request) => {
  const json = await req.json().catch(() => null);
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid request JSON');
  }
  const {
    date,
    wakeTime,
    sleepTime,
    workStart,
    workEnd,
    focusHours,
    priorities,
    habits,
  } = json as Record<string, unknown>;

  if (typeof date !== 'string' || !date) {
    throw new Error('`date` is required and must be a string');
  }

  return {
    date,
    wakeTime: typeof wakeTime === 'string' ? wakeTime : undefined,
    sleepTime: typeof sleepTime === 'string' ? sleepTime : undefined,
    workStart: typeof workStart === 'string' ? workStart : undefined,
    workEnd: typeof workEnd === 'string' ? workEnd : undefined,
    focusHours: typeof focusHours === 'number' ? focusHours : undefined,
    priorities: typeof priorities === 'string' ? priorities : undefined,
    habits: typeof habits === 'string' ? habits : undefined,
  };
};

const buildPrompt = (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const base = `
You are an assistant for Organizer, a daily planning app that lets users schedule blocks in minutes 0-1439.
The user provided the following day overview:
- Date: ${payload.date}
- Wake time: ${payload.wakeTime ?? 'not provided'}
- Sleep time: ${payload.sleepTime ?? 'not provided'}
- Work window: ${payload.workStart ?? 'not provided'} - ${payload.workEnd ?? 'not provided'}
- Focus hours requested: ${payload.focusHours ?? 'not provided'}
- Priorities: ${payload.priorities ?? 'none'}
- Habits: ${payload.habits ?? 'none'}

Rules:
1. Respect wake/sleep boundaries; do not schedule before wakeTime or after sleepTime.
2. Use workStart/workEnd as the main work period; place work-related blocks there when possible.
3. Spread requested focusHours into 25-90 minute focus blocks; include short breaks in between.
4. Output only JSON with a top-level "blocks" array.
5. Each block must include:
   - title (English string)
   - category (one of ${VALID_CATEGORIES.map((c) => `"${c}"`).join(', ')})
   - startMin and endMin as integers between 0 and 1439
   - optional note
6. Do not include any additional text outside the JSON response.
  `;
  return `${base}\nRespond with:\n{"blocks":[{...}]}`;
};

const buildMessages = (prompt: string) => [
  {
    role: 'system',
    content:
      'You are a helpful assistant that designs realistic daily plans for productivity-focused users.',
  },
  {
    role: 'user',
    content: prompt,
  },
];

const validateBlocks = (
  blocks: Array<Record<string, unknown>>,
): Array<{
  title: string;
  category: (typeof VALID_CATEGORIES)[number];
  startMin: number;
  endMin: number;
  note?: string;
}> => {
  return blocks
    .map((block) => {
      const title = typeof block.title === 'string' ? block.title.trim() : '';
      const category =
        typeof block.category === 'string' && VALID_CATEGORIES.includes(block.category as any)
          ? (block.category as typeof VALID_CATEGORIES[number])
          : undefined;
      const startMin =
        typeof block.startMin === 'number' ? Math.floor(block.startMin) : undefined;
      const endMin = typeof block.endMin === 'number' ? Math.floor(block.endMin) : undefined;
      const note = typeof block.note === 'string' ? block.note.trim() : undefined;

      if (!title || !category || startMin === undefined || endMin === undefined) {
        return null;
      }
      if (startMin < 0 || startMin > 1439 || endMin < 0 || endMin > 1439) {
        return null;
      }
      if (endMin <= startMin) {
        return null;
      }
      return { title, category, startMin, endMin, note };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
};

const callOpenAI = async (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const prompt = buildPrompt(payload);
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY') ?? ''}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages: buildMessages(prompt),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI returned an unexpected response');
  }

  const parsed = JSON.parse(content);
  if (!parsed || !Array.isArray(parsed.blocks)) {
    throw new Error('Missing blocks array in OpenAI response');
  }
  return parsed.blocks;
};

serve(async (req) => {
  try {
    const payload = await parseRequest(req);

    const envKey = Deno.env.get('OPENAI_API_KEY');
    if (!envKey) {
      return Response.json(
        { error: 'Missing OPENAI_API_KEY in environment.' },
        { status: 500 },
      );
    }

    const rawBlocks = await callOpenAI(payload);
    const validBlocks = validateBlocks(rawBlocks);
    return Response.json({ blocks: validBlocks });
  } catch (error) {
    console.error('[ai-generate-plan]', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
});
