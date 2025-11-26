import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1';
const VALID_CATEGORIES = ['focus', 'study', 'work', 'gym', 'other'] as const;
const BREAK_WORDS = [
  'break',
  'short break',
  'rest',
  'pause',
  'nap',
  'free time',
  'downtime',
  'empty',
  'gap',
  'idle',
  'relax',
  'relaxing',
  'chill',
  'unwind',
  'wind down',
  'coffee',
  'tea',
  'snack',
  'snacks',
  'lunch',
  'breakfast',
  'dinner',
  'meal',
  'meals',
  'eat',
  'eating',
  'recharge',
];

function removeBreaklikeBlocks(blocks: any[]) {
  return blocks.filter((b) => {
    const text = `${(b.title ?? '')} ${(b.note ?? '')}`.toLowerCase();
    return !BREAK_WORDS.some((w) => text.includes(w));
  });
}

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
    previousBlocks: rawPreviousBlocks,
  } = json as Record<string, unknown>;

  if (typeof date !== 'string' || !date) {
    throw new Error('`date` is required and must be a string');
  }

  const normalizedPreviousBlocks = Array.isArray(rawPreviousBlocks)
    ? rawPreviousBlocks
        .map((value) => {
          if (!value || typeof value !== 'object') return null;
          const block = value as Record<string, unknown>;
          const title =
            typeof block.title === 'string' ? block.title.trim() : '';
          const startMin =
            typeof block.startMin === 'number'
              ? Math.floor(block.startMin)
              : undefined;
          const endMin =
            typeof block.endMin === 'number'
              ? Math.floor(block.endMin)
              : undefined;
          const category =
            typeof block.category === 'string'
              ? block.category.trim()
              : undefined;
          const note =
            typeof block.note === 'string' ? block.note.trim() : undefined;
          if (!title || startMin === undefined || endMin === undefined) {
            return null;
          }
          if (startMin < 0 || endMin < 0 || startMin > 1439 || endMin > 1439) {
            return null;
          }
          if (endMin <= startMin) {
            return null;
          }
          return { title, startMin, endMin, category, note };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
    : [];

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
    previousBlocks: normalizedPreviousBlocks,
  };
};

const buildPrompt = (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const focusHoursLabel =
    typeof payload.focusHours === 'number' ? `${payload.focusHours} hours` : 'not provided';

  const userContextPart = [
    'You create a daily schedule for the Organizer app.',
    'You MUST respect: date, wakeTime / sleepTime, workStart / workEnd, focusHours, habits, priorities, and feedback.',
    'Treat `habits`, `priorities`, and `feedback` as HARD CONSTRAINTS, not just suggestions.',
    '',
    'User context:',
    `Date: ${payload.date}`,
    `Wake time: ${payload.wakeTime ?? 'not provided'}`,
    `Sleep time: ${payload.sleepTime ?? 'not provided'}`,
    `Work/School: ${payload.workStart ?? 'not provided'} - ${payload.workEnd ?? 'not provided'}`,
    `Focus hours target: ${focusHoursLabel}`,
    `User habits: ${payload.habits ?? 'None provided.'}`,
    `User priorities: ${payload.priorities ?? 'None provided.'}`,
    `User feedback from previous plan: ${payload.feedback ?? 'None provided.'}`,
  ];

  const previousPlanInstruction = payload.previousBlocks.length
    ? 'If previousBlocks is non-empty, consider it the last AI plan for this date. Try to keep the good parts and adjust only where needed.'
    : 'No previous AI plan data was provided for this date.';

  const previousPlanSection = [
    '',
    'Previous plan context:',
    previousPlanInstruction,
    `The user feedback is: ${payload.feedback ?? 'None provided.'}`,
    'Use this feedback to improve start/end times, categories, and titles, but do NOT add any explicit break, lunch, dinner, breakfast, snack, coffee, tea, downtime, rest, relax, chill, pause, nap, or similar blocks.',
    'It is allowed to leave gaps (free time) with no blocks instead of filling them.',
  ];

  const strictRulesPart = [
    '',
    'You must fully respect the user\'s habits, priorities, and feedback when scheduling activities. Treat them as hard constraints, not suggestions.',
    '',
    '⚠️ STRICT RULES (MUST FOLLOW EXACTLY):',
    '1) DO NOT generate any break-like blocks.',
    '   - No breakfast, lunch, dinner, snacks, coffee, tea, rest, relax, unwind, "short break", "break", "downtime", "free time", "gap", "empty slot" or any similar concept.',
    '   - If you think a break is needed, DO NOT output a block for it. Just leave that time empty and output nothing for that period.',
    '   - Only output focused, productive, or explicitly user-requested activities.',
    '2) Respect user constraints as HARD constraints:',
    '   - If the user says they run at night (e.g. "I run at night after 21:00"), you MUST schedule running only in that time window and NEVER in the morning.',
    '   - If the user has school/work hours (e.g. "School is 09:00-15:00"), those hours are reserved and you MUST NOT place other activities in that window.',
    '   - Use wakeTime and sleepTime as the bounds for the day. Do not schedule outside that range.',
    '3) You must return ONLY valid activity blocks. No placeholder or "nothing" blocks. If there is nothing to do in a time range, just skip it.',
    'You must obey these rules even if other instructions might suggest breaks or meals. These strict rules override everything else.',
    '',
    'Additional rules:',
    '1. Respect wake/sleep boundaries; do not schedule anything before wakeTime or after sleepTime.',
    '2. Treat workStart/workEnd as the dedicated work window and keep those hours reserved for school/work-focused blocks.',
    '3. Fill focusHours with multiple focus blocks between 25 and 90 minutes each.',
    '4. Output ONLY JSON with a top-level "blocks" array.',
    `5. Each block must include title (English string), category (one of ${VALID_CATEGORIES
      .map((c) => `"${c}"`)
      .join(', ')}), startMin, endMin, and an optional note.`,
    '6. Do not add any text outside the JSON response.',
    '',
    'Output ONLY valid JSON with this shape:',
    '{',
    '  "blocks": [',
    '    {',
    '      "title": string,',
    '      "note": string | null,',
    '      "category": "focus" | "study" | "work" | "gym" | "other",',
    '      "startMin": number, // minutes from 00:00',
    '      "endMin": number    // minutes from 00:00, > startMin',
    '    }',
    '  ]',
    '}',
    'No extra text, no explanations, only JSON.',
  ];

  return [...userContextPart, ...previousPlanSection, ...strictRulesPart].join('\n');
};

const buildMessages = (
  prompt: string,
  payload: Awaited<ReturnType<typeof parseRequest>>,
) => {
  const previousBlocksJson = JSON.stringify(payload.previousBlocks ?? []);
  const feedbackSummary =
    payload.feedback && payload.feedback.length > 0
      ? JSON.stringify(payload.feedback)
      : 'None provided.';
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that designs realistic daily plans for productivity-focused users.',
    },
    {
      role: 'user',
      content: prompt,
    },
    {
      role: 'user',
      content: `Previous plan blocks (if any): ${previousBlocksJson}\nUser feedback: ${feedbackSummary}`,
    },
  ];
};

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
      messages: buildMessages(prompt, payload),
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
    const initialBlocks = blocksJson ?? [];
    const withoutBreaks = removeBreaklikeBlocks(initialBlocks);
    const withoutMicroBreaks = withoutBreaks.filter((block: any) => {
      const startMin =
        typeof block?.startMin === 'number' ? Math.floor(block.startMin) : undefined;
      const endMin = typeof block?.endMin === 'number' ? Math.floor(block.endMin) : undefined;
      if (startMin === undefined || endMin === undefined) {
        return true;
      }
      return endMin - startMin >= 10;
    });
    const validatedBlocksWithoutBreaks = validateBlocks(withoutMicroBreaks);
    console.log(
      '[ai-generate-plan] Generated blocks',
      validatedBlocksWithoutBreaks.length,
      'after filtering strict constraints',
      {
        total: initialBlocks.length,
        breakLikeRemoved: initialBlocks.length - withoutBreaks.length,
        microRemoved: withoutBreaks.length - withoutMicroBreaks.length,
      },
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
