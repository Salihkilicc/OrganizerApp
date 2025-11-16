import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1';
const VALID_CATEGORIES = ['focus', 'study', 'work', 'gym', 'other'] as const;
const BREAK_WORDS =
  /break|rest|relax|wind ?down|chill|free time|downtime|lunch|dinner|breakfast|supper|snack|coffee|tea|nap/i;

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
    feedback,
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
    feedback:
      typeof feedback === 'string' && feedback.trim()
        ? feedback.trim()
        : undefined,
  };
};

const buildPrompt = (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const promptParts = [
    'You create a daily schedule for the Organizer app.',
    'You MUST respect: date, wakeTime / sleepTime, workStart / workEnd, focusHours, habits, priorities, and feedback.',
    'Treat `habits`, `priorities`, and `feedback` as HARD CONSTRAINTS, not just suggestions.',
    'If the user says they run at night, schedule running only in the evening/night.',
    'If the user says school or work is between certain hours, keep those hours reserved for school/work-focused blocks only.',
    '',
    'Day overview:',
    `- Date: ${payload.date}`,
    `- Wake time: ${payload.wakeTime ?? 'not provided'}`,
    `- Sleep time: ${payload.sleepTime ?? 'not provided'}`,
    `- Work window: ${payload.workStart ?? 'not provided'} - ${payload.workEnd ?? 'not provided'}`,
    `- Focus hours requested: ${payload.focusHours ?? 'not provided'}`,
  ];

  if (payload.priorities) {
    promptParts.push(`User priorities for this day: ${payload.priorities}`);
  }
  if (payload.habits) {
    promptParts.push(`User habits & preferences: ${payload.habits}`);
  }
  if (payload.feedback) {
    promptParts.push(
      `User feedback about the previous plan (YOU MUST FOLLOW THIS): ${payload.feedback}`,
    );
  }

  promptParts.push(
    '',
    'Rules:',
    '1. Respect wake/sleep boundaries; do not schedule anything before wakeTime or after sleepTime.',
    '2. Treat workStart/workEnd as the dedicated work window and keep those hours reserved for school/work-focused blocks.',
    '3. Fill focusHours with multiple focus blocks between 25 and 90 minutes each.',
    '4. DO NOT create any blocks that are only breaks, rest, relax, wind down, chill, free time, downtime, lunch, dinner, breakfast, supper, snack, coffee, tea, nap, or similar pauses—leave those windows empty instead.',
    '5. If the user feels like a break is needed, simply leave that time empty; do not output a block just for downtime.',
    '6. Output ONLY JSON with a top-level "blocks" array.',
    `7. Each block must include title (English string), category (one of ${VALID_CATEGORIES
      .map((c) => `"${c}"`)
      .join(', ')}), startMin, endMin, and an optional note.`,
    '8. Do not add any text outside the JSON response.',
    '',
    'Respond with:',
    '{"blocks":[{...}]}',
  );

  return promptParts.join('\n');
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
  console.log('[ai-generate-plan] Incoming request', {
    method: req.method,
    url: req.url,
    pathname: (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return undefined;
      }
    })(),
    headers: {
      accept: req.headers.get('accept'),
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
    },
  });

  let payload: Awaited<ReturnType<typeof parseRequest>>;
  try {
    payload = await parseRequest(req);
    console.log('[ai-generate-plan] Parsed payload', {
      date: payload.date,
      wakeTime: payload.wakeTime ?? null,
      sleepTime: payload.sleepTime ?? null,
      workStart: payload.workStart ?? null,
      workEnd: payload.workEnd ?? null,
      focusHours: payload.focusHours ?? null,
      priorities: payload.priorities ?? null,
      habits: payload.habits ?? null,
    });
  } catch (error) {
    console.error('[ai-generate-plan] Request parse error', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid request payload' },
      { status: 400 },
    );
  }

  const envKey = Deno.env.get('OPENAI_API_KEY');
  console.log('[ai-generate-plan] has OPENAI_API_KEY', Boolean(envKey));
  if (!envKey) {
    console.error('[ai-generate-plan] Missing OPENAI_API_KEY');
    return Response.json(
      { error: 'Missing OPENAI_API_KEY in environment.' },
      { status: 500 },
    );
  }

  try {
    const blocksJson = await callOpenAI(payload);
    const noBreakBlocks = (blocksJson ?? []).filter((block: any) => {
      const title = (block?.title ?? '').toString();
      const note = (block?.note ?? '').toString();
      const text = `${title} ${note}`;
      return !BREAK_WORDS.test(text);
    });
    const validatedBlocksWithoutBreaks = validateBlocks(noBreakBlocks);
    console.log(
      '[ai-generate-plan] Generated blocks',
      validatedBlocksWithoutBreaks.length,
      'after filtering break-like blocks',
      blocksJson.length - noBreakBlocks.length,
    );
    return Response.json({ blocks: validatedBlocksWithoutBreaks });
  } catch (error) {
    console.error('[ai-generate-plan] Error', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
});
